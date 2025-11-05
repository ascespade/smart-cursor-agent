/**
 * Pattern detector for code analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { getWorkspaceRoot } from '../../utils/helpers';
import { PatternMatch } from '../../types/analysis';

export interface DetectedPatterns {
  patterns: PatternMatch[];
  categories: Record<string, number>;
}

export class PatternDetector {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Detect patterns in the codebase
   */
  async detectPatterns(): Promise<DetectedPatterns> {
    const files = await this.getSourceFiles();
    const patterns: PatternMatch[] = [];

    for (const file of files.slice(0, 50)) { // Limit for performance
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const filePatterns = this.analyzeFile(file, content);
        patterns.push(...filePatterns);
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    const categories: Record<string, number> = {};
    patterns.forEach(p => {
      categories[p.pattern] = (categories[p.pattern] || 0) + 1;
    });

    return { patterns, categories };
  }

  /**
   * Get all source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];

    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**'
    ];

    try {
      const files = await fg(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze a single file for patterns
   */
  private analyzeFile(filePath: string, content: string): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const lines = content.split('\n');

    // Define pattern checks
    const patternChecks = [
      {
        name: 'async-await',
        regex: /async\s+function|async\s+\(|await\s+/g,
        confidence: 0.9
      },
      {
        name: 'promise-chain',
        regex: /\.then\(|\.catch\(|Promise\./g,
        confidence: 0.8
      },
      {
        name: 'class-definition',
        regex: /class\s+\w+\s+(extends|implements)?/g,
        confidence: 0.95
      },
      {
        name: 'hook-usage',
        regex: /use[A-Z]\w+\(/g,
        confidence: 0.9
      },
      {
        name: 'error-handling',
        regex: /try\s*\{|catch\s*\(|\.catch\(/g,
        confidence: 0.85
      },
      {
        name: 'type-assertion',
        regex: /as\s+\w+|<\w+>/g,
        confidence: 0.7
      },
      {
        name: 'console-log',
        regex: /console\.(log|error|warn|debug)/g,
        confidence: 0.95
      },
      {
        name: 'todo-comment',
        regex: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi,
        confidence: 0.9
      }
    ];

    patternChecks.forEach(check => {
      let match;
      const regex = new RegExp(check.regex.source, check.regex.flags);
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1] || '';
        const context = line.trim().substring(0, 100);

        patterns.push({
          pattern: check.name,
          file: path.relative(this.workspaceRoot, filePath),
          line: lineNumber,
          context,
          confidence: check.confidence
        });
      }
    });

    return patterns;
  }

  /**
   * Detect common anti-patterns
   */
  async detectAntiPatterns(): Promise<PatternMatch[]> {
    const files = await this.getSourceFiles();
    const antiPatterns: PatternMatch[] = [];

    for (const file of files.slice(0, 50)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const patterns = this.detectAntiPatternsInFile(file, content);
        antiPatterns.push(...patterns);
      } catch (error) {
        continue;
      }
    }

    return antiPatterns;
  }

  /**
   * Detect anti-patterns in a file
   */
  private detectAntiPatternsInFile(filePath: string, content: string): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const lines = content.split('\n');

    const antiPatternChecks = [
      {
        name: 'any-type',
        regex: /:\s*any\b|any\s*>/g,
        confidence: 0.9
      },
      {
        name: 'eval-usage',
        regex: /eval\s*\(/g,
        confidence: 0.95
      },
      {
        name: 'innerHTML',
        regex: /\.innerHTML\s*=/g,
        confidence: 0.8
      },
      {
        name: 'deep-nesting',
        regex: /{[\s\S]*{[\s\S]*{[\s\S]*{/g,
        confidence: 0.7
      },
      {
        name: 'long-function',
        regex: /function\s+\w+[\s\S]{500,}/g,
        confidence: 0.6
      }
    ];

    antiPatternChecks.forEach(check => {
      let match;
      const regex = new RegExp(check.regex.source, check.regex.flags);
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1] || '';
        const context = line.trim().substring(0, 100);

        patterns.push({
          pattern: check.name,
          file: path.relative(this.workspaceRoot, filePath),
          line: lineNumber,
          context,
          confidence: check.confidence
        });
      }
    });

    return patterns;
  }
}

