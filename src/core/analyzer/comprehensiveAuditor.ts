/**
 * Comprehensive Code Auditor - Zero tolerance error detection
 * Uses advanced analysis to find ALL errors, warnings, and suppressions
 */

import * as vscode from 'vscode';
import { execa } from 'execa';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';
import fg from 'fast-glob';
import type { AuditIssue, Suppression, AuditReport } from '../../types';

export class ComprehensiveAuditor {
  private workspaceRoot: string;
  private issues: AuditIssue[] = [];
  private suppressions: Suppression[] = [];
  private businessLogicConcerns: string[] = [];

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Perform comprehensive audit
   */
  async audit(): Promise<AuditReport> {
    console.log('🔍 Starting comprehensive code audit...');
    this.issues = [];
    this.suppressions = [];
    this.businessLogicConcerns = [];

    // Get all source files
    const files = await this.getAllSourceFiles();
    console.log(`📁 Found ${files.length} files to analyze`);

    // Run all audits in parallel
    await Promise.all([
      this.auditTypeScript(),
      this.auditESLint(),
      this.auditBuild(),
      this.auditSyntax(files),
      this.auditSuppressions(files),
      this.auditDependencies(),
      this.auditConfiguration(),
      this.auditBusinessLogic(files)
    ]);

    // Calculate summary
    const summary = this.calculateSummary();
    const codeQualityScore = this.calculateQualityScore(summary);
    const passed = this.issues.filter(i => i.severity === 'Critical' || i.severity === 'High').length === 0;

    return {
      passed,
      totalFiles: files.length,
      totalErrors: this.issues.filter(i => i.severity === 'Critical' || i.severity === 'High').length,
      totalWarnings: this.issues.filter(i => i.severity === 'Medium' || i.severity === 'Low').length,
      totalSuppressions: this.suppressions.length,
      errors: this.issues.filter(i => i.severity === 'Critical' || i.severity === 'High'),
      warnings: this.issues.filter(i => i.severity === 'Medium' || i.severity === 'Low'),
      suppressions: this.suppressions,
      businessLogicConcerns: this.businessLogicConcerns,
      summary,
      codeQualityScore,
      timestamp: new Date()
    };
  }

  /**
   * Audit TypeScript errors
   */
  private async auditTypeScript(): Promise<void> {
    console.log('🔍 Auditing TypeScript...');
    try {
      const result = await execa('npx', ['tsc', '--noEmit', '--strict', '--pretty', 'false'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024,
        shell: process.platform === 'win32'
      });

      if (result.exitCode !== 0) {
        const errors = this.parseTypeScriptErrors(result.stdout + result.stderr);
        for (const error of errors) {
          this.issues.push({
            file: error.file,
            line: error.line,
            column: error.column,
            type: 'TypeScript',
            severity: 'Critical',
            issue: error.message,
            fix: error.fix || 'Fix TypeScript error',
            code: error.code
          });
        }
      }
    } catch (error) {
      this.issues.push({
        file: 'tsconfig.json',
        line: 0,
        type: 'TypeScript',
        severity: 'High',
        issue: `Failed to run TypeScript compiler: ${error}`,
        fix: 'Check TypeScript installation and configuration'
      });
    }
  }

  /**
   * Audit ESLint violations
   */
  private async auditESLint(): Promise<void> {
    console.log('🔍 Auditing ESLint...');
    try {
      const result = await execa('npx', ['eslint', '.', '--format', 'json', '--max-warnings', '0'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024,
        shell: process.platform === 'win32'
      });

      if (result.exitCode !== 0) {
        try {
          const output = JSON.parse(result.stdout || result.stderr || '[]');
          if (Array.isArray(output)) {
            for (const file of output) {
              if (file.messages && Array.isArray(file.messages)) {
                for (const message of file.messages) {
                  const severity = message.severity === 2 ? 'Critical' : 'High';
                  this.issues.push({
                    file: file.filePath || '',
                    line: message.line || 0,
                    column: message.column || 0,
                    type: 'ESLint',
                    severity,
                    issue: `${message.message} (${message.ruleId || 'unknown'})`,
                    fix: message.fix ? 'Auto-fix available' : `Fix ESLint rule: ${message.ruleId || 'unknown'}`,
                    code: message.source
                  });
                }
              }
            }
          }
        } catch (parseError) {
          // Fallback to text parsing
          const lines = (result.stdout + result.stderr).split('\n');
          for (const line of lines) {
            if (line.includes('error') || line.includes('warning')) {
              this.issues.push({
                file: 'unknown',
                line: 0,
                type: 'ESLint',
                severity: 'High',
                issue: line.trim(),
                fix: 'Review ESLint output and fix issues'
              });
            }
          }
        }
      }
    } catch (error) {
      this.issues.push({
        file: '.eslintrc',
        line: 0,
        type: 'ESLint',
        severity: 'High',
        issue: `Failed to run ESLint: ${error}`,
        fix: 'Check ESLint installation and configuration'
      });
    }
  }

  /**
   * Audit build errors
   */
  private async auditBuild(): Promise<void> {
    console.log('🔍 Auditing build...');
    try {
      const result = await execa('npm', ['run', 'build'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024,
        shell: process.platform === 'win32'
      });

      if (result.exitCode !== 0) {
        const errors = this.parseBuildErrors(result.stdout + result.stderr);
        for (const error of errors) {
          this.issues.push({
            file: error.file || 'build',
            line: error.line || 0,
            type: 'Build',
            severity: 'Critical',
            issue: error.message,
            fix: error.fix || 'Fix build error'
          });
        }
      }
    } catch (error) {
      // Build might not be configured, that's okay
      console.log('⚠️ Build audit skipped (no build script)');
    }
  }

  /**
   * Audit syntax errors
   */
  private async auditSyntax(files: string[]): Promise<void> {
    console.log('🔍 Auditing syntax...');
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for JSON syntax
        if (file.endsWith('.json')) {
          try {
            JSON.parse(content);
          } catch (error) {
            this.issues.push({
              file,
              line: 0,
              type: 'Syntax',
              severity: 'Critical',
              issue: `Invalid JSON syntax: ${error}`,
              fix: 'Fix JSON syntax errors'
            });
          }
        }

        // Check for common syntax issues
        if (this.hasSyntaxIssues(content, file)) {
          this.issues.push({
            file,
            line: 0,
            type: 'Syntax',
            severity: 'Medium',
            issue: 'Potential syntax issues detected',
            fix: 'Review file for syntax errors'
          });
        }
      } catch (error) {
        this.issues.push({
          file,
          line: 0,
          type: 'Syntax',
          severity: 'High',
          issue: `Failed to read file: ${error}`,
          fix: 'Check file permissions and encoding'
        });
      }
    }
  }

  /**
   * Audit suppressions
   */
  private async auditSuppressions(files: string[]): Promise<void> {
    console.log('🔍 Auditing suppressions...');
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNumber = i + 1;

          // Check for TypeScript suppressions
          if (line.includes('@ts-ignore')) {
            this.suppressions.push({
              file,
              line: lineNumber,
              type: '@ts-ignore',
              shouldRemove: true,
              reason: 'TypeScript error suppression'
            });
          }

          if (line.includes('@ts-expect-error')) {
            this.suppressions.push({
              file,
              line: lineNumber,
              type: '@ts-expect-error',
              shouldRemove: false, // ts-expect-error is safer than ts-ignore
              reason: 'Expected TypeScript error'
            });
          }

          if (line.includes('@ts-nocheck')) {
            this.suppressions.push({
              file,
              line: lineNumber,
              type: '@ts-nocheck',
              shouldRemove: true,
              reason: 'TypeScript checking disabled for entire file'
            });
          }

          // Check for ESLint suppressions
          if (line.includes('eslint-disable')) {
            const match = line.match(/eslint-disable(?:-next-line|-line)?(?:\s+(.+))?/);
            const rule = match?.[1]?.trim();
            const type = line.includes('eslint-disable-next-line') 
              ? 'eslint-disable-next-line'
              : line.includes('eslint-disable-line')
              ? 'eslint-disable-line'
              : 'eslint-disable';

            this.suppressions.push({
              file,
              line: lineNumber,
              type: type as any,
              rule,
              shouldRemove: !rule || rule === '*', // Remove if all rules disabled
              reason: rule ? `ESLint rule disabled: ${rule}` : 'All ESLint rules disabled'
            });
          }

          // Check for TODO, FIXME, HACK, XXX
          if (line.match(/\b(TODO|FIXME|HACK|XXX):/i)) {
            this.businessLogicConcerns.push(`${file}:${lineNumber} - ${line.trim()}`);
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }

  /**
   * Audit dependencies
   */
  private async auditDependencies(): Promise<void> {
    console.log('🔍 Auditing dependencies...');
    try {
      const result = await execa('npm', ['audit', '--json'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 60000,
        shell: process.platform === 'win32'
      });

      if (result.exitCode !== 0) {
        try {
          const audit = JSON.parse(result.stdout || result.stderr || '{}');
          if (audit.vulnerabilities) {
            for (const [name, vuln] of Object.entries(audit.vulnerabilities as any)) {
              const vulnerability = vuln as any;
              this.issues.push({
                file: 'package.json',
                line: 0,
                type: 'Dependency',
                severity: vulnerability.severity === 'critical' || vulnerability.severity === 'high' ? 'Critical' : 'High',
                issue: `Security vulnerability in ${name}: ${vulnerability.title || 'Unknown'}`,
                fix: `Update ${name} to version ${vulnerability.patchedVersions || 'latest'}`
              });
            }
          }
        } catch (parseError) {
          // Fallback
          this.issues.push({
            file: 'package.json',
            line: 0,
            type: 'Dependency',
            severity: 'Medium',
            issue: 'Dependency audit found issues',
            fix: 'Run npm audit fix'
          });
        }
      }
    } catch (error) {
      // npm audit might not be available
      console.log('⚠️ Dependency audit skipped');
    }
  }

  /**
   * Audit configuration
   */
  private async auditConfiguration(): Promise<void> {
    console.log('🔍 Auditing configuration...');
    
    // Check tsconfig.json
    const tsconfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        
        if (!tsconfig.compilerOptions?.strict) {
          this.issues.push({
            file: 'tsconfig.json',
            line: 0,
            type: 'Configuration',
            severity: 'High',
            issue: 'TypeScript strict mode is not enabled',
            fix: 'Add "strict": true to compilerOptions'
          });
        }

        if (tsconfig.compilerOptions?.noImplicitAny === false) {
          this.issues.push({
            file: 'tsconfig.json',
            line: 0,
            type: 'Configuration',
            severity: 'High',
            issue: 'noImplicitAny is disabled',
            fix: 'Enable noImplicitAny: true'
          });
        }
      } catch (error) {
        this.issues.push({
          file: 'tsconfig.json',
          line: 0,
          type: 'Configuration',
          severity: 'Critical',
          issue: `Invalid tsconfig.json: ${error}`,
          fix: 'Fix tsconfig.json syntax'
        });
      }
    }

    // Check .eslintrc
    const eslintrcPath = path.join(this.workspaceRoot, '.eslintrc');
    if (fs.existsSync(eslintrcPath)) {
      try {
        const eslintrc = JSON.parse(fs.readFileSync(eslintrcPath, 'utf-8'));
        // Add more ESLint config checks here
      } catch (error) {
        // ESLint config might be in different format
      }
    }
  }

  /**
   * Audit business logic
   */
  private async auditBusinessLogic(files: string[]): Promise<void> {
    console.log('🔍 Auditing business logic...');
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx')) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNumber = i + 1;

          // Check for empty catch blocks
          if (line.includes('catch') && i + 1 < lines.length && lines[i + 1].trim() === '}') {
            this.businessLogicConcerns.push(`${file}:${lineNumber} - Empty catch block detected`);
          }

          // Check for console.log (debugging code)
          if (line.includes('console.log') && !line.includes('//')) {
            this.issues.push({
              file,
              line: lineNumber,
              type: 'Logic',
              severity: 'Low',
              issue: 'console.log found (debugging code)',
              fix: 'Remove console.log or use proper logging'
            });
          }

          // Check for potential race conditions
          if (line.includes('setTimeout') || line.includes('setInterval')) {
            if (!content.includes('clearTimeout') && !content.includes('clearInterval')) {
              this.businessLogicConcerns.push(`${file}:${lineNumber} - Potential memory leak: timer not cleared`);
            }
          }

          // Check for infinite loops
          if (line.includes('while(true)') || line.includes('for(;;)')) {
            this.businessLogicConcerns.push(`${file}:${lineNumber} - Potential infinite loop detected`);
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }

  /**
   * Parse TypeScript errors
   */
  private parseTypeScriptErrors(output: string): Array<{ file: string; line: number; column: number; message: string; fix?: string; code?: string }> {
    const errors: Array<{ file: string; line: number; column: number; message: string; fix?: string; code?: string }> = [];
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match: file.ts(line,col): error TS1234: message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          message: match[5],
          code: `TS${match[4]}`,
          fix: this.getTypeScriptFix(match[4], match[5])
        });
      }
    }

    return errors;
  }

  /**
   * Get TypeScript fix suggestion
   */
  private getTypeScriptFix(code: string, message: string): string {
    // Add intelligent fix suggestions based on error code
    const fixes: Record<string, string> = {
      '2304': 'Define the variable or import it',
      '2307': 'Install the missing module or add type definitions',
      '2339': 'Add the missing property or method',
      '2345': 'Fix the type mismatch',
      '2554': 'Fix function argument types',
      '7006': 'Add type annotation',
      '7017': 'Add explicit type annotation'
    };

    return fixes[code] || 'Fix TypeScript error';
  }

  /**
   * Parse build errors
   */
  private parseBuildErrors(output: string): Array<{ file?: string; line?: number; message: string; fix?: string }> {
    const errors: Array<{ file?: string; line?: number; message: string; fix?: string }> = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('ERROR') || line.includes('error')) {
        errors.push({
          message: line.trim(),
          fix: 'Fix build error'
        });
      }
    }

    return errors;
  }

  /**
   * Check for syntax issues
   */
  private hasSyntaxIssues(content: string, file: string): boolean {
    // Check for common syntax issues
    if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      // Check for unclosed brackets
      const openBrackets = (content.match(/\{/g) || []).length;
      const closeBrackets = (content.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return true;
      }

      // Check for unclosed parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all source files
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.json',
      '**/.eslintrc*',
      '**/tsconfig.json',
      '**/package.json'
    ];

    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**'
    ];

    try {
      return await fg(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });
    } catch (error) {
      console.error('Failed to get source files:', error);
      return [];
    }
  }

  /**
   * Calculate summary
   */
  private calculateSummary() {
    return {
      typescript: {
        errors: this.issues.filter(i => i.type === 'TypeScript' && (i.severity === 'Critical' || i.severity === 'High')).length,
        warnings: this.issues.filter(i => i.type === 'TypeScript' && (i.severity === 'Medium' || i.severity === 'Low')).length
      },
      eslint: {
        errors: this.issues.filter(i => i.type === 'ESLint' && (i.severity === 'Critical' || i.severity === 'High')).length,
        warnings: this.issues.filter(i => i.type === 'ESLint' && (i.severity === 'Medium' || i.severity === 'Low')).length
      },
      build: {
        errors: this.issues.filter(i => i.type === 'Build' && (i.severity === 'Critical' || i.severity === 'High')).length,
        warnings: this.issues.filter(i => i.type === 'Build' && (i.severity === 'Medium' || i.severity === 'Low')).length
      },
      syntax: {
        errors: this.issues.filter(i => i.type === 'Syntax' && (i.severity === 'Critical' || i.severity === 'High')).length,
        warnings: this.issues.filter(i => i.type === 'Syntax' && (i.severity === 'Medium' || i.severity === 'Low')).length
      },
      dependencies: {
        errors: this.issues.filter(i => i.type === 'Dependency' && (i.severity === 'Critical' || i.severity === 'High')).length,
        warnings: this.issues.filter(i => i.type === 'Dependency' && (i.severity === 'Medium' || i.severity === 'Low')).length
      },
      suppressions: this.suppressions.length
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(summary: any): number {
    let score = 100;
    
    // Deduct points for errors
    score -= summary.typescript.errors * 10;
    score -= summary.eslint.errors * 5;
    score -= summary.build.errors * 15;
    score -= summary.syntax.errors * 10;
    score -= summary.dependencies.errors * 10;
    
    // Deduct points for warnings
    score -= summary.typescript.warnings * 2;
    score -= summary.eslint.warnings * 1;
    score -= summary.build.warnings * 3;
    score -= summary.syntax.warnings * 2;
    score -= summary.dependencies.warnings * 2;
    
    // Deduct points for suppressions
    score -= summary.suppressions * 1;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
