/**
 * Best Practices Applier - Applies best practices to code
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';
import fg from 'fast-glob';

export interface BestPracticesResult {
  success: boolean;
  practicesApplied: number;
  filesUpdated: number;
  practices: Array<{
    name: string;
    description: string;
    files: string[];
  }>;
  errors: string[];
  warnings: string[];
}

export class BestPracticesApplier {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Apply best practices
   */
  async applyBestPractices(): Promise<BestPracticesResult> {
    const result: BestPracticesResult = {
      success: true,
      practicesApplied: 0,
      filesUpdated: 0,
      practices: [],
      errors: [],
      warnings: []
    };

    try {
      // 1. Apply TypeScript best practices
      await this.applyTypeScriptBestPractices(result);

      // 2. Apply React best practices
      await this.applyReactBestPractices(result);

      // 3. Apply code organization best practices
      await this.applyCodeOrganizationBestPractices(result);

      // 4. Apply performance best practices
      await this.applyPerformanceBestPractices(result);

      // 5. Apply security best practices
      await this.applySecurityBestPractices(result);

      // 6. Apply accessibility best practices
      await this.applyAccessibilityBestPractices(result);

      vscode.window.showInformationMessage(`✅ Best practices applied successfully! ${result.practicesApplied} practices applied.`);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      vscode.window.showErrorMessage(`❌ Failed to apply best practices: ${error}`);
    }

    return result;
  }

  /**
   * Apply TypeScript best practices
   */
  private async applyTypeScriptBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Add explicit return types',
        description: 'Add explicit return types to all functions',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          // Add return types to functions without them
          const updated = content.replace(/function\s+(\w+)\s*\([^)]*\)\s*\{/g, (match, name) => {
            if (!match.includes(':')) {
              return match.replace('{', ': void {');
            }
            return match;
          });
          if (content !== updated) {
            fs.writeFileSync(file, updated, 'utf-8');
            return true;
          }
          return false;
        }
      },
      {
        name: 'Use const assertions',
        description: 'Use const assertions for immutable data',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          // This would require more sophisticated analysis
          return false;
        }
      },
      {
        name: 'Avoid any type',
        description: 'Replace any with proper types',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          if (content.includes(': any')) {
            result.warnings.push(`File ${path.relative(this.workspaceRoot, file)} contains 'any' type`);
          }
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply React best practices
   */
  private async applyReactBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Use functional components',
        description: 'Convert class components to functional components',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          // This would require more sophisticated analysis
          return false;
        }
      },
      {
        name: 'Add PropTypes or TypeScript',
        description: 'Add type checking to components',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          // Check if component has types
          if (content.includes('React.FC') || content.includes('interface Props')) {
            return false;
          }
          result.warnings.push(`Component ${path.relative(this.workspaceRoot, file)} needs type definitions`);
          return false;
        }
      },
      {
        name: 'Use React.memo for expensive components',
        description: 'Wrap expensive components with React.memo',
        apply: async (file: string) => {
          // This would require performance analysis
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply code organization best practices
   */
  private async applyCodeOrganizationBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Organize imports',
        description: 'Sort and organize imports',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          // Import organization is handled by ProjectOrganizer
          return false;
        }
      },
      {
        name: 'Use barrel exports',
        description: 'Create index files for barrel exports',
        apply: async (file: string) => {
          // This is handled by ProjectOrganizer
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply performance best practices
   */
  private async applyPerformanceBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Use useMemo for expensive calculations',
        description: 'Wrap expensive calculations with useMemo',
        apply: async (file: string) => {
          // This would require performance analysis
          return false;
        }
      },
      {
        name: 'Use useCallback for event handlers',
        description: 'Wrap event handlers with useCallback',
        apply: async (file: string) => {
          // This would require performance analysis
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply security best practices
   */
  private async applySecurityBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Remove hardcoded secrets',
        description: 'Replace hardcoded secrets with environment variables',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          const secretPatterns = [
            /password\s*[:=]\s*['"][^'"]+['"]/gi,
            /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
            /secret\s*[:=]\s*['"][^'"]+['"]/gi
          ];

          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              result.warnings.push(`Potential hardcoded secret found in ${path.relative(this.workspaceRoot, file)}`);
            }
          }
          return false;
        }
      },
      {
        name: 'Sanitize user input',
        description: 'Ensure user input is sanitized',
        apply: async (file: string) => {
          // This would require security analysis
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply accessibility best practices
   */
  private async applyAccessibilityBestPractices(result: BestPracticesResult): Promise<void> {
    const practices = [
      {
        name: 'Add alt text to images',
        description: 'Ensure all images have alt attributes',
        apply: async (file: string) => {
          const content = fs.readFileSync(file, 'utf-8');
          const imgMatches = content.match(/<img[^>]*>/g);
          if (imgMatches) {
            for (const img of imgMatches) {
              if (!img.includes('alt=')) {
                result.warnings.push(`Image without alt text in ${path.relative(this.workspaceRoot, file)}`);
              }
            }
          }
          return false;
        }
      },
      {
        name: 'Add ARIA labels',
        description: 'Add ARIA labels to interactive elements',
        apply: async (file: string) => {
          // This would require accessibility analysis
          return false;
        }
      }
    ];

    await this.applyPractices(practices, result);
  }

  /**
   * Apply practices to files
   */
  private async applyPractices(
    practices: Array<{ name: string; description: string; apply: (file: string) => Promise<boolean> }>,
    result: BestPracticesResult
  ): Promise<void> {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const files = await fg(patterns, {
      cwd: this.workspaceRoot,
      ignore,
      absolute: true
    });

    for (const practice of practices) {
      const affectedFiles: string[] = [];
      
      for (const file of files) {
        try {
          const applied = await practice.apply(file);
          if (applied) {
            affectedFiles.push(path.relative(this.workspaceRoot, file));
            result.filesUpdated++;
          }
        } catch (error) {
          result.warnings.push(`Failed to apply ${practice.name} to ${path.relative(this.workspaceRoot, file)}: ${error}`);
        }
      }

      if (affectedFiles.length > 0) {
        result.practices.push({
          name: practice.name,
          description: practice.description,
          files: affectedFiles
        });
        result.practicesApplied++;
      }
    }
  }
}
