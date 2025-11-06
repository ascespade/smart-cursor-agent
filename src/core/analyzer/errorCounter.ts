/**
 * Error counter for TypeScript and ESLint errors
 */

import * as vscode from 'vscode';
import { execa } from 'execa';
import * as path from 'path';
import { getWorkspaceRoot } from '../../utils/helpers';
import { ErrorBreakdown } from '../../types';

export interface ErrorCountResult {
  typescript: number;
  eslint: number;
  warnings: number;
  total: number;
  breakdown: ErrorBreakdown[];
}

// Module-level logger for error counter
let loggerOutputChannel: vscode.OutputChannel | null = null;

function getLogger(): vscode.OutputChannel {
  if (!loggerOutputChannel) {
    loggerOutputChannel = vscode.window.createOutputChannel('Cursor Smart Agent - Error Counter');
  }
  return loggerOutputChannel;
}

function logInfo(message: string, ...args: unknown[]): void {
  const channel = getLogger();
  const timestamp = new Date().toISOString();
  channel.appendLine(`[INFO ${timestamp}] ${message}`);
  if (args.length > 0) {
    channel.appendLine(JSON.stringify(args, null, 2));
  }
}

function logError(message: string, error?: unknown): void {
  const channel = getLogger();
  const timestamp = new Date().toISOString();
  channel.appendLine(`[ERROR ${timestamp}] ${message}`);
  if (error instanceof Error) {
    channel.appendLine(`Error: ${error.message}`);
    if (error.stack) {
      channel.appendLine(`Stack: ${error.stack}`);
    }
  } else if (error) {
    channel.appendLine(String(error));
  }
}

function logWarn(message: string, ...args: unknown[]): void {
  const channel = getLogger();
  const timestamp = new Date().toISOString();
  channel.appendLine(`[WARN ${timestamp}] ${message}`);
  if (args.length > 0) {
    channel.appendLine(JSON.stringify(args, null, 2));
  }
}

export class ErrorCounter {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    // Normalize path for Windows compatibility
    this.workspaceRoot = path.normalize(root);
    logInfo(`ErrorCounter initialized with workspace root: ${this.workspaceRoot}`);
  }

  /**
   * Count all errors in the project
   */
  async countErrors(): Promise<ErrorCountResult> {
    logInfo('Starting error count process...');
    logInfo(`Working directory: ${this.workspaceRoot}`);

    const [typescriptErrors, eslintErrors] = await Promise.all([
      this.countTypeScriptErrors(),
      this.countESLintErrors()
    ]);

    logInfo(`TypeScript errors counted: ${typescriptErrors}`);
    logInfo(`ESLint errors counted: ${eslintErrors.errors}, warnings: ${eslintErrors.warnings}`);

    // Total = TypeScript errors + ESLint errors + Warnings
    const totalErrors = typescriptErrors + eslintErrors.errors;
    const warnings = eslintErrors.warnings;
    // Total issues = errors + warnings
    const totalIssues = totalErrors + warnings;

    // Validation: Log warning if counts seem incorrect
    if (typescriptErrors === 0 && eslintErrors.errors === 0 && eslintErrors.warnings === 0) {
      logWarn('All error counts are zero. This might indicate a problem with error detection.');
    }

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

    logInfo(`Final error count - TypeScript: ${typescriptErrors}, ESLint: ${eslintErrors.errors}, Warnings: ${warnings}, Total: ${totalIssues}`);

    return {
      typescript: typescriptErrors,
      eslint: eslintErrors.errors,
      warnings,
      total: totalIssues, // Total issues = errors + warnings
      breakdown
    };
  }

  /**
   * Count TypeScript errors
   */
  private async countTypeScriptErrors(): Promise<number> {
    logInfo('Starting TypeScript error counting...');
    
    try {
      // Ensure workspace root is properly normalized for Windows
      const normalizedRoot = path.normalize(this.workspaceRoot);
      logInfo(`Executing tsc command in directory: ${normalizedRoot}`);

      // Try to run tsc --noEmit to get errors
      const result = await execa('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
        cwd: normalizedRoot,
        reject: false,
        timeout: 30000,
        shell: process.platform === 'win32' // Use shell on Windows for better path handling
      });

      logInfo(`TypeScript command executed. Exit code: ${result.exitCode}`);
      logInfo(`TypeScript stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);

      if (result.exitCode === 0) {
        logInfo('TypeScript compilation successful - no errors found');
        return 0; // No errors
      }

      // Parse output to count errors
      const errorCount = this.parseTypeScriptOutput(result.stdout, result.stderr);
      logInfo(`Parsed TypeScript error count: ${errorCount}`);

      // Validation: If exit code indicates errors but we got 0, log a warning
      if (result.exitCode !== 0 && errorCount === 0) {
        logWarn('TypeScript command failed but no errors were parsed. This might indicate a parsing issue.');
        logWarn(`stdout sample: ${result.stdout.substring(0, 500)}`);
        logWarn(`stderr sample: ${result.stderr.substring(0, 500)}`);
      }

      return errorCount;
    } catch (error) {
      logError('Failed to execute TypeScript command', error);
      logWarn('Falling back to VS Code diagnostics for TypeScript errors');
      // If tsc is not available, try to use VS Code diagnostics
      return this.countTypeScriptErrorsFromDiagnostics();
    }
  }

  /**
   * Parse TypeScript compiler output to count errors
   */
  private parseTypeScriptOutput(stdout: string, stderr: string): number {
    const combinedOutput = stdout + '\n' + stderr;
    logInfo(`Parsing TypeScript output (total length: ${combinedOutput.length} chars)`);

    // Multiple patterns to match TypeScript errors
    const errorPatterns = [
      /error TS\d+/g,                    // Standard: error TS1234
      /error TS\d+:/g,                   // With colon: error TS1234:
      /\(\d+,\d+\): error TS\d+/g,       // With position: (10,5): error TS1234
      /\.tsx?\(\d+,\d+\): error TS\d+/g, // With file: file.ts(10,5): error TS1234
    ];

    let maxCount = 0;
    for (const pattern of errorPatterns) {
      const matches = combinedOutput.match(pattern);
      if (matches) {
        const count = matches.length;
        logInfo(`Pattern ${pattern.source} matched ${count} errors`);
        maxCount = Math.max(maxCount, count);
      }
    }

    // Fallback: count lines containing "error TS"
    if (maxCount === 0) {
      const errorLines = combinedOutput
        .split('\n')
        .filter(line => {
          const lowerLine = line.toLowerCase();
          return lowerLine.includes('error ts') || lowerLine.includes('error: ts');
        });
      maxCount = errorLines.length;
      logInfo(`Fallback line-based counting found ${maxCount} error lines`);
    }

    // Additional validation: check for common error indicators
    if (maxCount === 0 && (stdout.includes('error') || stderr.includes('error'))) {
      logWarn('Output contains "error" but no TypeScript errors were matched. Output might be in unexpected format.');
    }

    return maxCount;
  }

  /**
   * Count TypeScript errors from VS Code diagnostics
   */
  private async countTypeScriptErrorsFromDiagnostics(): Promise<number> {
    logInfo('Counting TypeScript errors from VS Code diagnostics...');
    try {
      const diagnostics = vscode.languages.getDiagnostics();
      let count = 0;
      let fileCount = 0;

      for (const [uri, diags] of diagnostics) {
        if (uri.scheme === 'file' && (uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.tsx'))) {
          const errors = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
          count += errors.length;
          if (errors.length > 0) {
            fileCount++;
          }
        }
      }

      logInfo(`Found ${count} TypeScript errors from diagnostics across ${fileCount} files`);
      return count;
    } catch (error) {
      logError('Failed to count TypeScript errors from diagnostics', error);
      return 0;
    }
  }

  /**
   * Count ESLint errors
   */
  private async countESLintErrors(): Promise<{ errors: number; warnings: number }> {
    logInfo('Starting ESLint error counting...');
    
    try {
      // Ensure workspace root is properly normalized for Windows
      const normalizedRoot = path.normalize(this.workspaceRoot);
      logInfo(`Executing ESLint command in directory: ${normalizedRoot}`);

      // Try to run eslint
      const result = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: normalizedRoot,
        reject: false,
        timeout: 30000,
        shell: process.platform === 'win32' // Use shell on Windows for better path handling
      });

      logInfo(`ESLint command executed. Exit code: ${result.exitCode}`);
      logInfo(`ESLint stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);

      if (result.exitCode === 0 && result.stdout.trim() === '') {
        logInfo('ESLint found no errors or warnings');
        return { errors: 0, warnings: 0 };
      }

      // Parse output to count errors and warnings
      const counts = this.parseESLintOutput(result.stdout, result.stderr);
      logInfo(`Parsed ESLint errors: ${counts.errors}, warnings: ${counts.warnings}`);

      // Validation: If exit code indicates errors but we got 0, log a warning
      if (result.exitCode !== 0 && counts.errors === 0 && counts.warnings === 0) {
        logWarn('ESLint command failed but no errors/warnings were parsed. This might indicate a parsing issue.');
        logWarn(`stdout sample: ${result.stdout.substring(0, 500)}`);
        logWarn(`stderr sample: ${result.stderr.substring(0, 500)}`);
      }

      return counts;
    } catch (error) {
      logError('Failed to execute ESLint command', error);
      logWarn('Falling back to VS Code diagnostics for ESLint errors');
      // If eslint is not available, try to use VS Code diagnostics
      return this.countESLintErrorsFromDiagnostics();
    }
  }

  /**
   * Parse ESLint output to count errors and warnings
   */
  private parseESLintOutput(stdout: string, stderr: string): { errors: number; warnings: number } {
    const combinedOutput = stdout || stderr || '';
    logInfo(`Parsing ESLint output (total length: ${combinedOutput.length} chars)`);

    // Try to parse as JSON first
    try {
      // Try stdout first, then stderr, then combined
      let jsonOutput: unknown = null;
      const jsonStrings = [stdout.trim(), stderr.trim(), combinedOutput.trim()].filter(s => s.length > 0);

      for (const jsonStr of jsonStrings) {
        try {
          // Check if it looks like JSON (starts with [ or {)
          if (jsonStr.startsWith('[') || jsonStr.startsWith('{')) {
            jsonOutput = JSON.parse(jsonStr);
            logInfo('Successfully parsed ESLint output as JSON');
            break;
          }
        } catch {
          // Continue to next string
          continue;
        }
      }

      if (jsonOutput && Array.isArray(jsonOutput)) {
        let errors = 0;
        let warnings = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jsonOutput.forEach((file: any) => {
          if (file.messages && Array.isArray(file.messages)) {
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

        logInfo(`Parsed JSON: ${errors} errors, ${warnings} warnings`);
        return { errors, warnings };
      }
    } catch (error) {
      logWarn('Failed to parse ESLint output as JSON', error);
    }

    // Fallback: parse text output
    logInfo('Falling back to text-based parsing for ESLint output');
    const lines = combinedOutput.split('\n');
    let errors = 0;
    let warnings = 0;

    // Look for error and warning patterns in text output
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      // Match common ESLint text output patterns
      if (lowerLine.includes('error') && (lowerLine.includes('eslint') || lowerLine.includes('✖'))) {
        errors++;
      } else if (lowerLine.includes('warning') && (lowerLine.includes('eslint') || lowerLine.includes('⚠'))) {
        warnings++;
      }
    }

    // Additional pattern matching for common ESLint output formats
    const errorMatches = combinedOutput.match(/\d+\s+error\(s\)/gi);
    const warningMatches = combinedOutput.match(/\d+\s+warning\(s\)/gi);

    if (errorMatches) {
      for (const match of errorMatches) {
        const numMatch = match.match(/(\d+)/);
        if (numMatch) {
          errors = Math.max(errors, parseInt(numMatch[1], 10));
        }
      }
    }

    if (warningMatches) {
      for (const match of warningMatches) {
        const numMatch = match.match(/(\d+)/);
        if (numMatch) {
          warnings = Math.max(warnings, parseInt(numMatch[1], 10));
        }
      }
    }

    logInfo(`Text-based parsing: ${errors} errors, ${warnings} warnings`);
    return { errors, warnings };
  }

  /**
   * Count ESLint errors from VS Code diagnostics
   */
  private async countESLintErrorsFromDiagnostics(): Promise<{ errors: number; warnings: number }> {
    logInfo('Counting ESLint errors from VS Code diagnostics...');
    try {
      const diagnostics = vscode.languages.getDiagnostics();
      let errors = 0;
      let warnings = 0;
      let fileCount = 0;

      for (const [uri, diags] of diagnostics) {
        if (uri.scheme === 'file' && (uri.fsPath.endsWith('.js') || uri.fsPath.endsWith('.jsx') || uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.tsx'))) {
          let fileErrors = 0;
          let fileWarnings = 0;
          diags.forEach(d => {
            if (d.source === 'eslint') {
              if (d.severity === vscode.DiagnosticSeverity.Error) {
                errors++;
                fileErrors++;
              } else if (d.severity === vscode.DiagnosticSeverity.Warning) {
                warnings++;
                fileWarnings++;
              }
            }
          });
          if (fileErrors > 0 || fileWarnings > 0) {
            fileCount++;
          }
        }
      }

      logInfo(`Found ${errors} ESLint errors and ${warnings} warnings from diagnostics across ${fileCount} files`);
      return { errors, warnings };
    } catch (error) {
      logError('Failed to count ESLint errors from diagnostics', error);
      return { errors: 0, warnings: 0 };
    }
  }
}

