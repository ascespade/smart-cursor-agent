/**
 * Code validator for security and quality
 */

import { SecurityIssue } from '../types';

export class CodeValidator {
  /**
   * Validate code changes
   */
  validateCode(code: string, filePath: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for dangerous patterns
    if (/eval\s*\(/.test(code)) {
      issues.push({
        type: 'dangerous',
        severity: 'critical',
        file: filePath,
        line: 1,
        description: 'eval() usage detected',
        remediation: 'Avoid eval() - use safer alternatives'
      });
    }

    if (/Function\s*\(/.test(code)) {
      issues.push({
        type: 'dangerous',
        severity: 'high',
        file: filePath,
        line: 1,
        description: 'Function constructor usage',
        remediation: 'Avoid Function constructor'
      });
    }

    // Check for hardcoded secrets
    if (/api[_-]?key\s*=\s*['"][^'"]+['"]/gi.test(code)) {
      issues.push({
        type: 'secret',
        severity: 'critical',
        file: filePath,
        line: 1,
        description: 'Hardcoded API key',
        remediation: 'Use environment variables'
      });
    }

    return issues;
  }

  /**
   * Calculate code safety score
   */
  calculateSafetyScore(issues: SecurityIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }
}

