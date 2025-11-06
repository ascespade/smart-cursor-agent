/**
 * Error details collector - collects detailed error information
 */

import * as vscode from 'vscode';
import { execa } from 'execa';
import { getWorkspaceRoot } from '../../utils/helpers';

export interface ErrorDetail {
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning';
  source: 'typescript' | 'eslint';
}

export interface FileErrorStats {
  file: string;
  errorCount: number;
  warningCount: number;
  errors: ErrorDetail[];
}

export interface ErrorDetailsResult {
  totalErrors: number;
  totalWarnings: number;
  byFile: FileErrorStats[];
  byType: Record<string, number>;
  topErrors: ErrorDetail[];
}

export class ErrorDetailsCollector {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Collect detailed error information
   */
  async collectDetails(): Promise<ErrorDetailsResult> {
    const [tsErrors, eslintErrors] = await Promise.all([
      this.collectTypeScriptErrors(),
      this.collectESLintErrors()
    ]);

    const allErrors = [...tsErrors, ...eslintErrors];
    const errors = allErrors.filter(e => e.severity === 'error');
    const warnings = allErrors.filter(e => e.severity === 'warning');

    // Group by file
    const byFile = this.groupByFile(allErrors);

    // Group by error type/code
    const byType = this.groupByType(allErrors);

    // Get top errors (most common)
    const topErrors = this.getTopErrors(allErrors);

    return {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      byFile: byFile.sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount)),
      byType,
      topErrors: topErrors.slice(0, 10)
    };
  }

  /**
   * Collect TypeScript errors with details
   */
  private async collectTypeScriptErrors(): Promise<ErrorDetail[]> {
    const errors: ErrorDetail[] = [];

    try {
      // Try tsc first
      const result = await execa('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 30000
      });

      if (result.exitCode !== 0) {
        // Parse tsc output
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)/);
          if (match) {
            errors.push({
              file: match[1].trim(),
              line: parseInt(match[2], 10),
              column: parseInt(match[3], 10),
              message: match[5].trim(),
              code: `TS${match[4]}`,
              severity: 'error',
              source: 'typescript'
            });
          }
        }
      }

      // Also get from VS Code diagnostics
      const diagnosticErrors = await this.collectFromDiagnostics('typescript');
      errors.push(...diagnosticErrors);
    } catch {
      // Fallback to diagnostics only
      const diagnosticErrors = await this.collectFromDiagnostics('typescript');
      errors.push(...diagnosticErrors);
    }

    return errors;
  }

  /**
   * Collect ESLint errors with details
   */
  private async collectESLintErrors(): Promise<ErrorDetail[]> {
    const errors: ErrorDetail[] = [];

    try {
      // Try eslint first
      const result = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 30000
      });

      if (result.exitCode !== 0 || result.stdout.trim() !== '') {
        try {
          const output = JSON.parse(result.stdout || result.stderr || '[]');
          if (Array.isArray(output)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output.forEach((file: any) => {
              if (file.messages) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                file.messages.forEach((msg: any) => {
                  errors.push({
                    file: file.filePath || '',
                    line: msg.line || 0,
                    column: msg.column || 0,
                    message: msg.message || '',
                    code: msg.ruleId || '',
                    severity: msg.severity === 2 ? 'error' : 'warning',
                    source: 'eslint'
                  });
                });
              }
            });
          }
        } catch {
          // Parse text output if JSON fails
          const lines = result.stdout.split('\n');
          for (const line of lines) {
            const match = line.match(/(.+?):(\d+):(\d+)\s+(.+?)\s+\((.+?)\)/);
            if (match) {
              errors.push({
                file: match[1].trim(),
                line: parseInt(match[2], 10),
                column: parseInt(match[3], 10),
                message: match[4].trim(),
                code: match[5].trim(),
                severity: line.includes('error') ? 'error' : 'warning',
                source: 'eslint'
              });
            }
          }
        }
      }

      // Also get from VS Code diagnostics
      const diagnosticErrors = await this.collectFromDiagnostics('eslint');
      errors.push(...diagnosticErrors);
    } catch {
      // Fallback to diagnostics only
      const diagnosticErrors = await this.collectFromDiagnostics('eslint');
      errors.push(...diagnosticErrors);
    }

    return errors;
  }

  /**
   * Collect errors from VS Code diagnostics
   */
  private async collectFromDiagnostics(source: 'typescript' | 'eslint'): Promise<ErrorDetail[]> {
    const errors: ErrorDetail[] = [];
    const diagnostics = vscode.languages.getDiagnostics();

    for (const [uri, diags] of diagnostics) {
      if (uri.scheme !== 'file') continue;

      const isTypeScript = uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.tsx');
      const isJavaScript = uri.fsPath.endsWith('.js') || uri.fsPath.endsWith('.jsx');

      if ((source === 'typescript' && isTypeScript) || (source === 'eslint' && (isTypeScript || isJavaScript))) {
        diags.forEach(d => {
          if (d.source === source || (source === 'typescript' && !d.source)) {
            const range = d.range;
            errors.push({
              file: uri.fsPath,
              line: range.start.line + 1,
              column: range.start.character + 1,
              message: d.message,
              code: d.code?.toString(),
              severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
              source
            });
          }
        });
      }
    }

    return errors;
  }

  /**
   * Group errors by file
   */
  private groupByFile(errors: ErrorDetail[]): FileErrorStats[] {
    const fileMap = new Map<string, FileErrorStats>();

    for (const error of errors) {
      const relativePath = error.file.replace(this.workspaceRoot + '/', '');
      
      if (!fileMap.has(relativePath)) {
        fileMap.set(relativePath, {
          file: relativePath,
          errorCount: 0,
          warningCount: 0,
          errors: []
        });
      }

      const stats = fileMap.get(relativePath)!;
      if (error.severity === 'error') {
        stats.errorCount++;
      } else {
        stats.warningCount++;
      }
      stats.errors.push(error);
    }

    return Array.from(fileMap.values());
  }

  /**
   * Group errors by type/code
   */
  private groupByType(errors: ErrorDetail[]): Record<string, number> {
    const typeMap: Record<string, number> = {};

    for (const error of errors) {
      const key = error.code || error.message.split(':')[0] || 'unknown';
      typeMap[key] = (typeMap[key] || 0) + 1;
    }

    return typeMap;
  }

  /**
   * Get top errors (most common)
   */
  private getTopErrors(errors: ErrorDetail[]): ErrorDetail[] {
    const errorMap = new Map<string, { error: ErrorDetail; count: number }>();

    for (const error of errors) {
      const key = `${error.code || ''}:${error.message.substring(0, 50)}`;
      if (errorMap.has(key)) {
        errorMap.get(key)!.count++;
      } else {
        errorMap.set(key, { error, count: 1 });
      }
    }

    return Array.from(errorMap.values())
      .sort((a, b) => b.count - a.count)
      .map(item => item.error);
  }
}

