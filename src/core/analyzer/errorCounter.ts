/**
 * Error counter for TypeScript and ESLint errors
 */

import * as vscode from 'vscode';
import { execa } from 'execa';
import { getWorkspaceRoot } from '../../utils/helpers';
import { ErrorBreakdown } from '../../types';

export interface ErrorCountResult {
  typescript: number;
  eslint: number;
  warnings: number;
  total: number;
  breakdown: ErrorBreakdown[];
}

export class ErrorCounter {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Count all errors in the project
   */
  async countErrors(): Promise<ErrorCountResult> {
    const [typescriptErrors, eslintErrors] = await Promise.all([
      this.countTypeScriptErrors(),
      this.countESLintErrors()
    ]);

    const total = typescriptErrors + eslintErrors.errors;
    const warnings = eslintErrors.warnings;

    const breakdown: ErrorBreakdown[] = [
      {
        type: 'TypeScript',
        count: typescriptErrors,
        severity: 'error',
        files: []
      },
      {
        type: 'ESLint',
        count: eslintErrors.errors,
        severity: 'error',
        files: []
      },
      {
        type: 'Warnings',
        count: warnings,
        severity: 'warning',
        files: []
      }
    ];

    return {
      typescript: typescriptErrors,
      eslint: eslintErrors.errors,
      warnings,
      total,
      breakdown
    };
  }

  /**
   * Count TypeScript errors
   */
  private async countTypeScriptErrors(): Promise<number> {
    try {
      // Try to run tsc --noEmit to get errors
      const result = await execa('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 30000
      });

      if (result.exitCode === 0) {
        return 0; // No errors
      }

      // Parse output to count errors
      const errorLines = result.stdout
        .split('\n')
        .filter(line => line.includes('error TS'));

      return errorLines.length;
    } catch (error) {
      // If tsc is not available, try to use VS Code diagnostics
      return this.countTypeScriptErrorsFromDiagnostics();
    }
  }

  /**
   * Count TypeScript errors from VS Code diagnostics
   */
  private async countTypeScriptErrorsFromDiagnostics(): Promise<number> {
    try {
      const diagnostics = vscode.languages.getDiagnostics();
      let count = 0;

      for (const [uri, diags] of diagnostics) {
        if (uri.scheme === 'file' && (uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.tsx'))) {
          count += diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Count ESLint errors
   */
  private async countESLintErrors(): Promise<{ errors: number; warnings: number }> {
    try {
      // Try to run eslint
      const result = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 30000
      });

      if (result.exitCode === 0 && result.stdout.trim() === '') {
        return { errors: 0, warnings: 0 };
      }

      try {
        const output = JSON.parse(result.stdout || result.stderr || '[]');
        let errors = 0;
        let warnings = 0;

        if (Array.isArray(output)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output.forEach((file: any) => {
            if (file.messages) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              file.messages.forEach((msg: any) => {
                if (msg.severity === 2) {
                  errors++;
                } else if (msg.severity === 1) {
                  warnings++;
                }
              });
            }
          });
        }

        return { errors, warnings };
      } catch {
        // If JSON parsing fails, count lines
        const errorLines = (result.stdout + result.stderr)
          .split('\n')
          .filter(line => line.includes('error') || line.includes('Error'));

        return { errors: errorLines.length, warnings: 0 };
      }
    } catch (error) {
      // If eslint is not available, try to use VS Code diagnostics
      return this.countESLintErrorsFromDiagnostics();
    }
  }

  /**
   * Count ESLint errors from VS Code diagnostics
   */
  private async countESLintErrorsFromDiagnostics(): Promise<{ errors: number; warnings: number }> {
    try {
      const diagnostics = vscode.languages.getDiagnostics();
      let errors = 0;
      let warnings = 0;

      for (const [uri, diags] of diagnostics) {
        if (uri.scheme === 'file' && (uri.fsPath.endsWith('.js') || uri.fsPath.endsWith('.jsx') || uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.tsx'))) {
          diags.forEach(d => {
            if (d.source === 'eslint') {
              if (d.severity === vscode.DiagnosticSeverity.Error) {
                errors++;
              } else if (d.severity === vscode.DiagnosticSeverity.Warning) {
                warnings++;
              }
            }
          });
        }
      }

      return { errors, warnings };
    } catch {
      return { errors: 0, warnings: 0 };
    }
  }
}

