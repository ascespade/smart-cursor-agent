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
  private resultCache: Map<string, { count: number | { errors: number; warnings: number }; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

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
   * Wait for VS Code diagnostics to be ready
   */
  private async waitForDiagnostics(timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const diagnostics = vscode.languages.getDiagnostics();
      if (diagnostics) {
        const diagnosticsArray = Array.from(diagnostics);
        if (diagnosticsArray.length > 0) {
          logInfo(`Diagnostics ready after ${Date.now() - startTime}ms with ${diagnosticsArray.length} files`);
          return true; // Diagnostics متوفرة
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    logWarn(`Diagnostics not ready after ${timeout}ms timeout`);
    return false;
  }

  /**
   * Get cached result if available
   */
  private getCachedResult(key: string): number | null {
    const cached = this.resultCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      const count = cached.count;
      if (typeof count === 'number') {
        logInfo(`Using cached result for ${key}: ${count}`);
        return count;
      }
    }
    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(key: string, count: number): void {
    this.resultCache.set(key, { count, timestamp: Date.now() });
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.resultCache.clear();
    logInfo('Cache invalidated');
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
   * Count TypeScript errors - improved strategy: try tsc command first (most accurate), then diagnostics
   */
  private async countTypeScriptErrors(): Promise<number> {
    logInfo('Starting TypeScript error counting...');
    
    // Check cache first
    const cached = this.getCachedResult('typescript');
    if (cached !== null) {
      return cached;
    }

    // Strategy 1: Try tsc command first (most accurate and reliable)
    try {
      // Ensure workspace root is properly normalized for Windows
      const normalizedRoot = path.normalize(this.workspaceRoot);
      logInfo(`Executing tsc command in directory: ${normalizedRoot}`);

      // Try multiple command variations
      const commands = [
        ['tsc', '--noEmit', '--pretty', 'false'],
        ['npx', 'tsc', '--noEmit', '--pretty', 'false'],
        ['npx', '--yes', 'tsc', '--noEmit', '--pretty', 'false']
      ];

      for (const cmd of commands) {
        try {
          logInfo(`Trying command: ${cmd.join(' ')}`);
          const result = await execa(cmd[0], cmd.slice(1), {
            cwd: normalizedRoot,
            reject: false,
            timeout: 120000, // 2 minutes timeout
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
            shell: process.platform === 'win32', // Use shell on Windows for better path handling
            env: {
              ...process.env,
              PATH: process.env.PATH
            }
          });

          logInfo(`TypeScript command executed. Exit code: ${result.exitCode}`);
          logInfo(`TypeScript stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);

          // Check if command output is valid (not the "This is not the tsc command" message)
          if (result.stdout.includes('This is not the tsc command') || result.stderr.includes('This is not the tsc command')) {
            logWarn('Invalid tsc command detected, trying next variation...');
            continue;
          }

          if (result.exitCode === 0) {
            logInfo('TypeScript compilation successful - no errors found');
            this.setCachedResult('typescript', 0);
            return 0; // No errors
          }

          // Parse output to count errors
          const errorCount = this.parseTypeScriptOutput(result.stdout, result.stderr);
          logInfo(`Parsed TypeScript error count: ${errorCount}`);

          // Validation: If exit code indicates errors but we got 0, log a warning
          if (result.exitCode !== 0 && errorCount === 0) {
            logWarn('TypeScript command failed but no errors were parsed. This might indicate a parsing issue.');
            logWarn(`stdout sample: ${result.stdout.substring(0, 1000)}`);
            logWarn(`stderr sample: ${result.stderr.substring(0, 1000)}`);
            
            // Try a more aggressive parsing approach
            const aggressiveCount = this.parseTypeScriptOutputAggressive(result.stdout, result.stderr);
            if (aggressiveCount > 0) {
              logInfo(`Using aggressive parsing count: ${aggressiveCount}`);
              this.setCachedResult('typescript', aggressiveCount);
              return aggressiveCount;
            }
          }

          // If we got a count > 0, use it
          if (errorCount > 0) {
            this.setCachedResult('typescript', errorCount);
            return errorCount;
          }
        } catch (cmdError) {
          logWarn(`Command ${cmd.join(' ')} failed: ${cmdError}, trying next...`);
          continue;
        }
      }
    } catch (error) {
      logError('Failed to execute TypeScript command', error);
    }

    // Strategy 2: Fallback to VS Code diagnostics
    logInfo('Falling back to VS Code diagnostics...');
    logInfo('Waiting for VS Code diagnostics to be ready...');
    const diagnosticsReady = await this.waitForDiagnostics(5000);
    
    if (diagnosticsReady) {
      const diagnosticsCount = await this.countTypeScriptErrorsFromDiagnostics();
      logInfo(`TypeScript errors from diagnostics: ${diagnosticsCount}`);
      this.setCachedResult('typescript', diagnosticsCount);
      return diagnosticsCount;
    }

    // Last resort: return 0
    logWarn('Could not count TypeScript errors from command or diagnostics');
    this.setCachedResult('typescript', 0);
    return 0;
  }

  /**
   * Aggressive parsing for TypeScript output - tries multiple approaches
   */
  private parseTypeScriptOutputAggressive(stdout: string, stderr: string): number {
    const combinedOutput = (stderr || stdout || '').trim();
    logInfo(`Aggressive parsing TypeScript output (total length: ${combinedOutput.length} chars)`);

    if (!combinedOutput) {
      return 0;
    }

    // Method 1: Count all "error TS" occurrences (most reliable)
    const errorTSMatches = combinedOutput.match(/error\s+TS\d+/gi);
    if (errorTSMatches && errorTSMatches.length > 0) {
      logInfo(`Found ${errorTSMatches.length} errors using "error TS" pattern`);
      return errorTSMatches.length;
    }

    // Method 2: Count all "TS" followed by numbers (error codes)
    const tsErrorMatches = combinedOutput.match(/TS\d+/gi);
    if (tsErrorMatches && tsErrorMatches.length > 0) {
      logInfo(`Found ${tsErrorMatches.length} TS error codes`);
      return tsErrorMatches.length;
    }

    // Method 3: Count lines with "error" and "TS"
    const errorLines = combinedOutput
      .split(/\r?\n/)
      .filter(line => {
        const lowerLine = line.toLowerCase().trim();
        return lowerLine.includes('error') && lowerLine.includes('ts') && 
               !lowerLine.startsWith('npm') && 
               !lowerLine.startsWith('node') &&
               !lowerLine.includes('This is not the tsc command');
      });
    
    if (errorLines.length > 0) {
      logInfo(`Found ${errorLines.length} error lines`);
      return errorLines.length;
    }

    return 0;
  }

  /**
   * Parse TypeScript compiler output to count errors - improved with better patterns
   */
  private parseTypeScriptOutput(stdout: string, stderr: string): number {
    // tsc outputs errors to stderr primarily, but check both
    const combinedOutput = (stderr || stdout || '').trim();
    logInfo(`Parsing TypeScript output (total length: ${combinedOutput.length} chars)`);

    if (!combinedOutput) {
      return 0;
    }

    // First, try the most reliable method: count all "error TS" occurrences
    // This is the most accurate way to count TypeScript errors
    // Pattern: "error TS" followed by numbers (e.g., "error TS2322", "error TS2345")
    const errorTSMatches = combinedOutput.match(/error\s+TS\d+/gi);
    if (errorTSMatches && errorTSMatches.length > 0) {
      const errorCount = errorTSMatches.length;
      logInfo(`Found ${errorCount} TypeScript errors using "error TS" pattern matching`);
      return errorCount;
    }

    // Also try: "error TS" with colon (e.g., "error TS2322:")
    const errorTSColonMatches = combinedOutput.match(/error\s+TS\d+:/gi);
    if (errorTSColonMatches && errorTSColonMatches.length > 0) {
      const errorCount = errorTSColonMatches.length;
      logInfo(`Found ${errorCount} TypeScript errors using "error TS:" pattern matching`);
      return errorCount;
    }

    // Use Set to avoid counting duplicate errors
    const errorSet = new Set<string>();

    // Multiple patterns to match TypeScript errors - more comprehensive
    const errorPatterns = [
      // Standard: file.ts(line,col): error TS1234: message
      /^(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):/gm,
      // Alternative: file.ts:line:col - error TS1234: message
      /^(.+?):(\d+):(\d+)\s*-\s*error\s+TS(\d+):/gm,
      // Simple: error TS1234 (case insensitive)
      /error\s+TS(\d+)/gi,
      // With file prefix: file.ts: error TS1234
      /^(.+?):\s*error\s+TS(\d+):/gm,
      // Windows path format: D:\path\file.ts(line,col): error TS1234
      /^([A-Z]:[\\\/].+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):/gm,
      // With colon: error TS1234:
      /error\s+TS(\d+):/gi,
    ];

    // Try each pattern and collect unique errors
    for (const pattern of errorPatterns) {
      try {
        const matches = combinedOutput.matchAll(pattern);
        for (const match of matches) {
          // Extract error code (TS number)
          const errorCode = match[4] || match[1] || match[2] || match[5];
          if (errorCode) {
            // Create unique identifier: file + line + error code
            const file = match[1] || '';
            const line = match[2] || match[3] || '';
            const uniqueId = `${file}:${line}:TS${errorCode}`;
            errorSet.add(uniqueId);
          }
        }
      } catch (error) {
        // Pattern might not support matchAll, try match instead
        const matches = combinedOutput.match(pattern);
        if (matches) {
          for (const match of matches) {
            const errorCodeMatch = match.match(/TS(\d+)/i);
            if (errorCodeMatch) {
              errorSet.add(`TS${errorCodeMatch[1]}`);
            }
          }
        }
      }
    }

    let errorCount = errorSet.size;
    logInfo(`Found ${errorCount} unique TypeScript errors using pattern matching`);

    // Fallback: count lines containing "error TS" if no patterns matched
    if (errorCount === 0) {
      const errorLines = combinedOutput
        .split(/\r?\n/)
        .filter(line => {
          const lowerLine = line.toLowerCase().trim();
          return (lowerLine.includes('error ts') || lowerLine.includes('error: ts')) && 
                 !lowerLine.startsWith('npm') && 
                 !lowerLine.startsWith('node') &&
                 !lowerLine.includes('This is not the tsc command');
        });
      errorCount = errorLines.length;
      logInfo(`Fallback line-based counting found ${errorCount} error lines`);
    }

    // Additional validation: check for common error indicators
    if (errorCount === 0 && (stdout.includes('error') || stderr.includes('error'))) {
      logWarn('Output contains "error" but no TypeScript errors were matched. Output might be in unexpected format.');
      // Log sample for debugging
      const sample = combinedOutput.substring(0, 2000);
      logWarn(`Output sample (first 2000 chars): ${sample}`);
      
      // Try one more time with a simpler approach
      const simpleErrorCount = (combinedOutput.match(/TS\d+/gi) || []).length;
      if (simpleErrorCount > 0) {
        logInfo(`Found ${simpleErrorCount} TS error codes using simple pattern`);
        return simpleErrorCount;
      }
    }

    return errorCount;
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
   * Count ESLint errors - improved strategy: try diagnostics first, then command
   */
  private async countESLintErrors(): Promise<{ errors: number; warnings: number }> {
    logInfo('Starting ESLint error counting...');
    
    // Check cache first
    const cachedKey = 'eslint';
    const cached = this.resultCache.get(cachedKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      const cachedResult = cached.count as { errors: number; warnings: number } | number;
      if (typeof cachedResult === 'object' && 'errors' in cachedResult && 'warnings' in cachedResult) {
        logInfo(`Using cached ESLint result: errors=${cachedResult.errors}, warnings=${cachedResult.warnings}`);
        return cachedResult;
      }
    }

    // Strategy 1: Wait for and use VS Code diagnostics first (most reliable)
    logInfo('Waiting for VS Code diagnostics to be ready...');
    const diagnosticsReady = await this.waitForDiagnostics(5000);
    
    if (diagnosticsReady) {
      const diagnosticsCount = await this.countESLintErrorsFromDiagnostics();
      logInfo(`ESLint errors from diagnostics: ${diagnosticsCount.errors} errors, ${diagnosticsCount.warnings} warnings`);
      
      // If we got reasonable counts from diagnostics, use them
      if (diagnosticsCount.errors > 0 || diagnosticsCount.warnings > 0) {
        this.resultCache.set(cachedKey, { count: diagnosticsCount, timestamp: Date.now() });
        return diagnosticsCount;
      }
    }

    // Strategy 2: Try eslint command as fallback
    try {
      // Ensure workspace root is properly normalized for Windows
      const normalizedRoot = path.normalize(this.workspaceRoot);
      logInfo(`Executing ESLint command in directory: ${normalizedRoot}`);

      // Try to run eslint
      const result = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: normalizedRoot,
        reject: false,
        timeout: 60000, // Increased timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        shell: process.platform === 'win32', // Use shell on Windows for better path handling
        env: {
          ...process.env,
          PATH: process.env.PATH
        }
      });

      logInfo(`ESLint command executed. Exit code: ${result.exitCode}`);
      logInfo(`ESLint stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);

      if (result.exitCode === 0 && result.stdout.trim() === '') {
        logInfo('ESLint found no errors or warnings');
        const result = { errors: 0, warnings: 0 };
        this.resultCache.set(cachedKey, { count: result, timestamp: Date.now() });
        return result;
      }

      // Parse output to count errors and warnings
      const counts = this.parseESLintOutput(result.stdout, result.stderr);
      logInfo(`Parsed ESLint errors: ${counts.errors}, warnings: ${counts.warnings}`);

      // Validation: If exit code indicates errors but we got 0, log a warning
      if (result.exitCode !== 0 && counts.errors === 0 && counts.warnings === 0) {
        logWarn('ESLint command failed but no errors/warnings were parsed. This might indicate a parsing issue.');
        logWarn(`stdout sample: ${result.stdout.substring(0, 500)}`);
        logWarn(`stderr sample: ${result.stderr.substring(0, 500)}`);
        
        // Try diagnostics again as last resort
        const diagnosticsCount = await this.countESLintErrorsFromDiagnostics();
        if (diagnosticsCount.errors > 0 || diagnosticsCount.warnings > 0) {
          logInfo(`Using diagnostics count instead: ${diagnosticsCount.errors} errors, ${diagnosticsCount.warnings} warnings`);
          this.resultCache.set(cachedKey, { count: diagnosticsCount, timestamp: Date.now() });
          return diagnosticsCount;
        }
      }

      this.resultCache.set(cachedKey, { count: counts, timestamp: Date.now() });
      return counts;
    } catch (error) {
      logError('Failed to execute ESLint command', error);
      logWarn('Falling back to VS Code diagnostics for ESLint errors');
      // If eslint is not available, try to use VS Code diagnostics
      const diagnosticsCount = await this.countESLintErrorsFromDiagnostics();
      this.resultCache.set(cachedKey, { count: diagnosticsCount, timestamp: Date.now() });
      return diagnosticsCount;
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

