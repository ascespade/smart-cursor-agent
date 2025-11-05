/**
 * Security scanner for code vulnerabilities
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { getWorkspaceRoot } from '../utils/helpers';
import { SecurityIssue, SecurityReport } from '../types';

export class SecurityScanner {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Scan for security issues
   */
  async scan(): Promise<SecurityReport> {
    const issues: SecurityIssue[] = [];

    // Scan for secrets
    issues.push(...await this.scanForSecrets());

    // Scan for SQL injection
    issues.push(...await this.scanForSQLInjection());

    // Scan for XSS
    issues.push(...await this.scanForXSS());

    // Scan for dangerous patterns
    issues.push(...await this.scanForDangerousPatterns());

    // Calculate security score
    const score = this.calculateSecurityScore(issues);

    return {
      issues,
      score,
      timestamp: new Date(),
      passed: score >= 70
    };
  }

  /**
   * Scan for hardcoded secrets
   */
  private async scanForSecrets(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const patterns = [
      { regex: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, type: 'secret', desc: 'API key found' },
      { regex: /password\s*=\s*['"][^'"]+['"]/gi, type: 'secret', desc: 'Password found' },
      { regex: /token\s*=\s*['"][^'"]+['"]/gi, type: 'secret', desc: 'Token found' },
      { regex: /secret\s*=\s*['"][^'"]+['"]/gi, type: 'secret', desc: 'Secret found' }
    ];

    const files = await this.getSourceFiles();

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'secret',
              severity: 'critical',
              file: path.relative(this.workspaceRoot, file),
              line: lineNumber,
              description: pattern.desc,
              remediation: 'Move secret to environment variables or secure storage'
            });
          }
        });
      } catch {
        continue;
      }
    }

    return issues;
  }

  /**
   * Scan for SQL injection
   */
  private async scanForSQLInjection(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const patterns = [
      { regex: /SELECT.*FROM.*WHERE.*\+/gi, desc: 'String concatenation in SQL query' },
      { regex: /execute\(.*\+.*\)/gi, desc: 'Dynamic SQL execution' }
    ];

    const files = await this.getSourceFiles();

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'sql-injection',
              severity: 'high',
              file: path.relative(this.workspaceRoot, file),
              line: lineNumber,
              description: pattern.desc,
              remediation: 'Use parameterized queries or ORM'
            });
          }
        });
      } catch {
        continue;
      }
    }

    return issues;
  }

  /**
   * Scan for XSS vulnerabilities
   */
  private async scanForXSS(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const patterns = [
      { regex: /\.innerHTML\s*=/gi, desc: 'innerHTML assignment detected' },
      { regex: /dangerouslySetInnerHTML/gi, desc: 'dangerouslySetInnerHTML usage' }
    ];

    const files = await this.getSourceFiles();

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'xss',
              severity: 'high',
              file: path.relative(this.workspaceRoot, file),
              line: lineNumber,
              description: pattern.desc,
              remediation: 'Sanitize input or use textContent instead'
            });
          }
        });
      } catch {
        continue;
      }
    }

    return issues;
  }

  /**
   * Scan for dangerous patterns
   */
  private async scanForDangerousPatterns(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const patterns = [
      { regex: /eval\s*\(/gi, desc: 'eval() usage detected', severity: 'critical' as const },
      { regex: /Function\s*\(/gi, desc: 'Function constructor usage', severity: 'high' as const }
    ];

    const files = await this.getSourceFiles();

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'dangerous',
              severity: pattern.severity,
              file: path.relative(this.workspaceRoot, file),
              line: lineNumber,
              description: pattern.desc,
              remediation: 'Avoid dynamic code execution'
            });
          }
        });
      } catch {
        continue;
      }
    }

    return issues;
  }

  /**
   * Get source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**'];

    try {
      return await fg(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });
    } catch {
      return [];
    }
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }
}

