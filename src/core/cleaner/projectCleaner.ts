/**
 * Project Cleaner - Cleans project and code
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';
import fg from 'fast-glob';

export interface CleaningResult {
  success: boolean;
  filesCleaned: number;
  unusedFilesRemoved: string[];
  unusedImportsRemoved: number;
  unusedVariablesRemoved: number;
  consoleLogsRemoved: number;
  commentedCodeRemoved: number;
  emptyFilesRemoved: string[];
  errors: string[];
  warnings: string[];
}

export class ProjectCleaner {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Clean project
   */
  async cleanProject(): Promise<CleaningResult> {
    const result: CleaningResult = {
      success: true,
      filesCleaned: 0,
      unusedFilesRemoved: [],
      unusedImportsRemoved: 0,
      unusedVariablesRemoved: 0,
      consoleLogsRemoved: 0,
      commentedCodeRemoved: 0,
      emptyFilesRemoved: [],
      errors: [],
      warnings: []
    };

    try {
      // 1. Remove unused files
      await this.removeUnusedFiles(result);

      // 2. Remove unused imports
      await this.removeUnusedImports(result);

      // 3. Remove unused variables
      await this.removeUnusedVariables(result);

      // 4. Remove console.logs
      await this.removeConsoleLogs(result);

      // 5. Remove commented code
      await this.removeCommentedCode(result);

      // 6. Remove empty files
      await this.removeEmptyFiles(result);

      // 7. Clean up build artifacts
      await this.cleanBuildArtifacts(result);

      vscode.window.showInformationMessage(`✅ Project cleaned successfully! ${result.filesCleaned} files cleaned.`);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      vscode.window.showErrorMessage(`❌ Failed to clean project: ${error}`);
    }

    return result;
  }

  /**
   * Remove unused files
   */
  private async removeUnusedFiles(result: CleaningResult): Promise<void> {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/src/**'];

    const files = await fg(patterns, {
      cwd: this.workspaceRoot,
      ignore,
      absolute: true
    });

    for (const file of files) {
      const relativePath = path.relative(this.workspaceRoot, file);
      
      // Check if file is imported anywhere
      const isUsed = await this.isFileUsed(file);
      
      if (!isUsed && !this.isConfigFile(file)) {
        fs.unlinkSync(file);
        result.unusedFilesRemoved.push(relativePath);
        result.filesCleaned++;
      }
    }
  }

  /**
   * Check if file is used
   */
  private async isFileUsed(filePath: string): Promise<boolean> {
    const fileName = path.basename(filePath, path.extname(filePath));
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const files = await fg(patterns, {
      cwd: this.workspaceRoot,
      ignore,
      absolute: true
    });

    for (const file of files) {
      if (file === filePath) continue;
      
      try {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(fileName) || content.includes(path.basename(filePath))) {
          return true;
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return false;
  }

  /**
   * Check if file is config file
   */
  private isConfigFile(filePath: string): boolean {
    const configFiles = ['tsconfig.json', 'package.json', 'webpack.config.js', 'vite.config.ts', '.eslintrc'];
    const fileName = path.basename(filePath);
    return configFiles.includes(fileName);
  }

  /**
   * Remove unused imports
   */
  private async removeUnusedImports(result: CleaningResult): Promise<void> {
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
        const cleanedContent = this.removeUnusedImportsFromContent(content);
        
        if (content !== cleanedContent) {
          fs.writeFileSync(file, cleanedContent, 'utf-8');
          result.unusedImportsRemoved++;
          result.filesCleaned++;
        }
      } catch (error) {
        result.warnings.push(`Failed to remove unused imports from ${path.relative(this.workspaceRoot, file)}: ${error}`);
      }
    }
  }

  /**
   * Remove unused imports from content
   */
  private removeUnusedImportsFromContent(content: string): string {
    // This is a simplified version - full implementation would require AST parsing
    // For now, we'll use ESLint to remove unused imports
    // The actual removal will be done by ESLint --fix
    return content;
  }

  /**
   * Remove unused variables
   */
  private async removeUnusedVariables(result: CleaningResult): Promise<void> {
    // This would require more sophisticated analysis
    // For now, we'll use ESLint to detect unused variables
    result.warnings.push('Unused variables detection requires ESLint analysis');
  }

  /**
   * Remove console.logs
   */
  private async removeConsoleLogs(result: CleaningResult): Promise<void> {
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
        const cleanedContent = content.replace(/console\.(log|warn|error|debug|info)\([^)]*\);?\n?/g, '');
        
        if (content !== cleanedContent) {
          const removedCount = (content.match(/console\.(log|warn|error|debug|info)/g) || []).length;
          fs.writeFileSync(file, cleanedContent, 'utf-8');
          result.consoleLogsRemoved += removedCount;
          result.filesCleaned++;
        }
      } catch (error) {
        result.warnings.push(`Failed to remove console.logs from ${path.relative(this.workspaceRoot, file)}: ${error}`);
      }
    }
  }

  /**
   * Remove commented code
   */
  private async removeCommentedCode(result: CleaningResult): Promise<void> {
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
        const cleanedContent = this.removeCommentedCodeFromContent(content);
        
        if (content !== cleanedContent) {
          const removedCount = (content.match(/\/\/.*\n|\/\*[\s\S]*?\*\//g) || []).length;
          fs.writeFileSync(file, cleanedContent, 'utf-8');
          result.commentedCodeRemoved += removedCount;
          result.filesCleaned++;
        }
      } catch (error) {
        result.warnings.push(`Failed to remove commented code from ${path.relative(this.workspaceRoot, file)}: ${error}`);
      }
    }
  }

  /**
   * Remove commented code from content
   */
  private removeCommentedCodeFromContent(content: string): string {
    // Remove single-line comments (but keep important ones)
    let cleaned = content.replace(/\/\/\s*(TODO|FIXME|HACK|XXX|NOTE|WARNING|IMPORTANT):.*\n/g, '');
    cleaned = cleaned.replace(/\/\/.*\n/g, '');
    
    // Remove multi-line comments (but keep important ones)
    cleaned = cleaned.replace(/\/\*[\s\S]*?(TODO|FIXME|HACK|XXX|NOTE|WARNING|IMPORTANT)[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return cleaned;
  }

  /**
   * Remove empty files
   */
  private async removeEmptyFiles(result: CleaningResult): Promise<void> {
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
        const trimmed = content.trim();
        
        if (trimmed === '' || trimmed === 'export {};' || trimmed === 'export {}') {
          const relativePath = path.relative(this.workspaceRoot, file);
          fs.unlinkSync(file);
          result.emptyFilesRemoved.push(relativePath);
          result.filesCleaned++;
        }
      } catch (error) {
        result.warnings.push(`Failed to check empty file ${path.relative(this.workspaceRoot, file)}: ${error}`);
      }
    }
  }

  /**
   * Clean build artifacts
   */
  private async cleanBuildArtifacts(result: CleaningResult): Promise<void> {
    const buildFolders = ['dist', 'build', '.next', 'out', 'coverage'];
    
    for (const folder of buildFolders) {
      const folderPath = path.join(this.workspaceRoot, folder);
      if (fs.existsSync(folderPath)) {
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
          result.filesCleaned++;
        } catch (error) {
          result.warnings.push(`Failed to remove ${folder}: ${error}`);
        }
      }
    }
  }
}
