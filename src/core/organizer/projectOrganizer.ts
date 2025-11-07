/**
 * Project Organizer - Organizes project structure and code
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';
import fg from 'fast-glob';

export interface OrganizationResult {
  success: boolean;
  filesOrganized: number;
  foldersCreated: string[];
  filesMoved: string[];
  importsFixed: number;
  errors: string[];
  warnings: string[];
}

export class ProjectOrganizer {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Organize project structure
   */
  async organizeProject(): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      success: true,
      filesOrganized: 0,
      foldersCreated: [],
      filesMoved: [],
      importsFixed: 0,
      errors: [],
      warnings: []
    };

    try {
      // 1. Create standard folder structure
      await this.createStandardFolders(result);

      // 2. Organize files by type
      await this.organizeFilesByType(result);

      // 3. Fix imports
      await this.fixImports(result);

      // 4. Organize exports
      await this.organizeExports(result);

      // 5. Create index files
      await this.createIndexFiles(result);

      vscode.window.showInformationMessage(`✅ Project organized successfully! ${result.filesOrganized} files organized.`);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      vscode.window.showErrorMessage(`❌ Failed to organize project: ${error}`);
    }

    return result;
  }

  /**
   * Create standard folder structure
   */
  private async createStandardFolders(result: OrganizationResult): Promise<void> {
    const standardFolders = [
      'src/components',
      'src/utils',
      'src/types',
      'src/hooks',
      'src/services',
      'src/api',
      'src/constants',
      'src/config',
      'src/assets',
      'src/styles',
      'tests',
      'tests/unit',
      'tests/integration',
      'docs',
      'scripts'
    ];

    for (const folder of standardFolders) {
      const folderPath = path.join(this.workspaceRoot, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        result.foldersCreated.push(folder);
      }
    }
  }

  /**
   * Organize files by type
   */
  private async organizeFilesByType(result: OrganizationResult): Promise<void> {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const files = await fg(patterns, {
      cwd: this.workspaceRoot,
      ignore,
      absolute: true
    });

    for (const file of files) {
      const relativePath = path.relative(this.workspaceRoot, file);
      
      // Skip if already in organized structure
      if (relativePath.startsWith('src/')) {
        continue;
      }

      // Determine target folder based on file content
      const content = fs.readFileSync(file, 'utf-8');
      const targetFolder = this.determineTargetFolder(file, content);

      if (targetFolder) {
        const targetPath = path.join(this.workspaceRoot, targetFolder, path.basename(file));
        const targetDir = path.dirname(targetPath);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        if (file !== targetPath) {
          fs.renameSync(file, targetPath);
          result.filesMoved.push(`${relativePath} → ${targetFolder}/${path.basename(file)}`);
          result.filesOrganized++;
        }
      }
    }
  }

  /**
   * Determine target folder based on file content
   */
  private determineTargetFolder(file: string, content: string): string | null {
    const fileName = path.basename(file).toLowerCase();

    // Check for component patterns
    if (content.includes('export default') || content.includes('export const') && content.includes('function') || content.includes('const') && content.includes('=') && content.includes('()')) {
      if (fileName.includes('component') || fileName.includes('page') || fileName.includes('view')) {
        return 'src/components';
      }
    }

    // Check for utility functions
    if (content.includes('export function') || content.includes('export const') && !content.includes('React')) {
      if (fileName.includes('util') || fileName.includes('helper') || fileName.includes('helper')) {
        return 'src/utils';
      }
    }

    // Check for types
    if (content.includes('export interface') || content.includes('export type') || content.includes('export enum')) {
      return 'src/types';
    }

    // Check for hooks
    if (content.includes('use') && content.includes('export')) {
      return 'src/hooks';
    }

    // Check for services
    if (content.includes('class') && (content.includes('Service') || content.includes('Manager'))) {
      return 'src/services';
    }

    // Check for API
    if (content.includes('fetch') || content.includes('axios') || content.includes('api')) {
      return 'src/api';
    }

    // Check for constants
    if (content.includes('export const') && content.match(/^[A-Z_]+$/)) {
      return 'src/constants';
    }

    // Check for config
    if (fileName.includes('config') || fileName.includes('setting')) {
      return 'src/config';
    }

    return 'src';
  }

  /**
   * Fix imports
   */
  private async fixImports(result: OrganizationResult): Promise<void> {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const files = await fg(patterns, {
      cwd: this.workspaceRoot,
      ignore,
      absolute: true
    });

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const fixedContent = this.fixFileImports(content, file);
        
        if (content !== fixedContent) {
          fs.writeFileSync(file, fixedContent, 'utf-8');
          result.importsFixed++;
        }
      } catch (error) {
        result.warnings.push(`Failed to fix imports in ${path.relative(this.workspaceRoot, file)}: ${error}`);
      }
    }
  }

  /**
   * Fix imports in file content
   */
  private fixFileImports(content: string, filePath: string): string {
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    const imports: string[] = [];
    const otherLines: string[] = [];

    let inImports = false;
    let importEnded = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
        inImports = true;
        imports.push(line);
      } else if (inImports && (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*'))) {
        imports.push(line);
      } else {
        if (inImports && !importEnded) {
          importEnded = true;
        }
        otherLines.push(line);
      }
    }

    // Sort imports
    const sortedImports = this.sortImports(imports);

    // Combine
    fixedLines.push(...sortedImports);
    if (sortedImports.length > 0 && otherLines.length > 0 && otherLines[0].trim() !== '') {
      fixedLines.push('');
    }
    fixedLines.push(...otherLines);

    return fixedLines.join('\n');
  }

  /**
   * Sort imports
   */
  private sortImports(imports: string[]): string[] {
    const externalImports: string[] = [];
    const internalImports: string[] = [];
    const relativeImports: string[] = [];

    for (const imp of imports) {
      if (imp.includes('from \'') || imp.includes('from "')) {
        const match = imp.match(/from\s+['"](.+?)['"]/);
        if (match) {
          const module = match[1];
          if (module.startsWith('.') || module.startsWith('/')) {
            relativeImports.push(imp);
          } else if (module.startsWith('@/') || module.startsWith('src/')) {
            internalImports.push(imp);
          } else {
            externalImports.push(imp);
          }
        } else {
          externalImports.push(imp);
        }
      } else {
        externalImports.push(imp);
      }
    }

    // Sort each group
    externalImports.sort();
    internalImports.sort();
    relativeImports.sort();

    // Combine with separators
    const result: string[] = [];
    if (externalImports.length > 0) {
      result.push(...externalImports);
    }
    if (internalImports.length > 0 && externalImports.length > 0) {
      result.push('');
    }
    if (internalImports.length > 0) {
      result.push(...internalImports);
    }
    if (relativeImports.length > 0 && (externalImports.length > 0 || internalImports.length > 0)) {
      result.push('');
    }
    if (relativeImports.length > 0) {
      result.push(...relativeImports);
    }

    return result;
  }

  /**
   * Organize exports
   */
  private async organizeExports(result: OrganizationResult): Promise<void> {
    // Implementation for organizing exports
    // This can include creating barrel exports, organizing named exports, etc.
  }

  /**
   * Create index files
   */
  private async createIndexFiles(result: OrganizationResult): Promise<void> {
    const folders = [
      'src/components',
      'src/utils',
      'src/types',
      'src/hooks',
      'src/services',
      'src/api',
      'src/constants'
    ];

    for (const folder of folders) {
      const folderPath = path.join(this.workspaceRoot, folder);
      if (fs.existsSync(folderPath)) {
        const indexPath = path.join(folderPath, 'index.ts');
        if (!fs.existsSync(indexPath)) {
          const exports = this.generateBarrelExports(folderPath);
          if (exports.length > 0) {
            fs.writeFileSync(indexPath, exports.join('\n') + '\n', 'utf-8');
            result.filesOrganized++;
          }
        }
      }
    }
  }

  /**
   * Generate barrel exports
   */
  private generateBarrelExports(folderPath: string): string[] {
    const exports: string[] = [];
    
    try {
      const files = fs.readdirSync(folderPath);
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx')) && file !== 'index.ts') {
          const name = path.basename(file, path.extname(file));
          exports.push(`export * from './${name}';`);
        }
      }
    } catch (error) {
      // Skip if folder doesn't exist or can't be read
    }

    return exports;
  }
}
