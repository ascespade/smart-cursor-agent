/**
 * Complexity calculator for project analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { getWorkspaceRoot } from '../../utils/helpers';
import { ComplexityLevel } from '../../types';

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  level: ComplexityLevel;
}

export class ComplexityCalculator {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Calculate project complexity
   */
  async calculate(): Promise<ComplexityMetrics> {
    const files = await this.getSourceFiles();
    let totalLines = 0;
    const totalFiles = files.length;
    let totalFunctions = 0;
    let totalComplexity = 0;

    for (const file of files.slice(0, 100) as string[]) { // Limit to first 100 files for performance
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n').length;
        totalLines += lines;

        const functions = this.countFunctions(content);
        totalFunctions += functions;

        const complexity = this.calculateFileComplexity(content);
        totalComplexity += complexity;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    const avgComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
    const avgLinesPerFile = totalFiles > 0 ? totalLines / totalFiles : 0;
    const functionsPerFile = totalFiles > 0 ? totalFunctions / totalFiles : 0;

    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      avgComplexity,
      avgLinesPerFile,
      functionsPerFile
    );

    const technicalDebt = this.calculateTechnicalDebt(
      avgComplexity,
      avgLinesPerFile,
      totalFiles
    );

    const level = this.determineComplexityLevel(avgComplexity, avgLinesPerFile, totalFiles);

    return {
      cyclomaticComplexity: Math.round(avgComplexity * 100) / 100,
      cognitiveComplexity: Math.round(avgComplexity * 100) / 100,
      maintainabilityIndex: Math.round(maintainabilityIndex * 100) / 100,
      technicalDebt: Math.round(technicalDebt * 100) / 100,
      level
    };
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
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ];

    try {
      const files = await fg(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });

      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Count functions in a file
   */
  private countFunctions(content: string): number {
    const functionPatterns = [
      /function\s+\w+\s*\(/g,
      /const\s+\w+\s*=\s*\(/g,
      /const\s+\w+\s*=\s*async\s*\(/g,
      /const\s+\w+\s*=\s*function/g,
      /=>\s*{/g,
      /class\s+\w+/g
    ];

    let count = 0;
    functionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return Math.max(count, 1); // At least 1 function per file
  }

  /**
   * Calculate file complexity (simplified)
   */
  private calculateFileComplexity(content: string): number {
    const complexityIndicators = [
      /\bif\s*\(/g,
      /\belse\s*{/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcatch\s*\(/g,
      /\?\s*.*\s*:/g, // Ternary operators
      /\|\|/g, // Logical OR
      /&&/g, // Logical AND
      /\breturn\s+/g
    ];

    let complexity = 1; // Base complexity

    complexityIndicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Calculate maintainability index (0-100)
   */
  private calculateMaintainabilityIndex(
    avgComplexity: number,
    avgLinesPerFile: number,
    functionsPerFile: number
  ): number {
    // Simplified maintainability index calculation
    // Higher is better (0-100 scale)
    const complexityFactor = Math.max(0, 100 - (avgComplexity * 10));
    const linesFactor = Math.max(0, 100 - (avgLinesPerFile / 10));
    const functionsFactor = Math.max(0, 100 - (functionsPerFile * 5));

    return (complexityFactor + linesFactor + functionsFactor) / 3;
  }

  /**
   * Calculate technical debt score
   */
  private calculateTechnicalDebt(
    avgComplexity: number,
    avgLinesPerFile: number,
    totalFiles: number
  ): number {
    // Technical debt increases with complexity and size
    const complexityDebt = avgComplexity * 2;
    const sizeDebt = Math.log(totalFiles + 1) * 10;
    const linesDebt = avgLinesPerFile > 300 ? (avgLinesPerFile - 300) / 10 : 0;

    return complexityDebt + sizeDebt + linesDebt;
  }

  /**
   * Determine complexity level
   */
  private determineComplexityLevel(
    avgComplexity: number,
    avgLinesPerFile: number,
    totalFiles: number
  ): ComplexityLevel {
    if (avgComplexity < 5 && avgLinesPerFile < 200 && totalFiles < 50) {
      return 'low';
    } else if (avgComplexity < 10 && avgLinesPerFile < 400 && totalFiles < 200) {
      return 'medium';
    } else if (avgComplexity < 20 && avgLinesPerFile < 600 && totalFiles < 500) {
      return 'high';
    } else {
      return 'very-high';
    }
  }
}

