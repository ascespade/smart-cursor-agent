/**
 * Recommendation Engine - Generates smart recommendations for fixing errors
 */

import { ProjectAnalysis, Recommendation, RecommendationsReport, ErrorByFile } from '../../types';
import { ErrorCounter } from './errorCounter';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';

export class RecommendationEngine {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(analysis: ProjectAnalysis): Promise<RecommendationsReport> {
    const recommendations: Recommendation[] = [];

    // 1. TypeScript errors recommendation
    if (analysis.errors.typescript > 0) {
      const topFiles = await this.getTopErrorFiles('typescript', 10);
      recommendations.push({
        type: 'fix',
        priority: analysis.errors.typescript > 100 ? 'high' : analysis.errors.typescript > 50 ? 'medium' : 'low',
        message: `لديك ${analysis.errors.typescript} خطأ TypeScript. يُنصح بإصلاحها أولاً لتحسين جودة الكود واستقرار التطبيق.`,
        files: topFiles.map(f => f.file),
        estimatedTime: analysis.errors.typescript * 2, // 2 minutes per error
        impact: `إصلاح ${analysis.errors.typescript} خطأ TypeScript سيحسن جودة الكود واستقرار التطبيق بشكل كبير`,
        confidence: Math.min(95, 50 + analysis.errors.typescript / 2)
      });
    }

    // 2. ESLint errors recommendation
    if (analysis.errors.eslint > 0) {
      const topFiles = await this.getTopErrorFiles('eslint', 20);
      recommendations.push({
        type: 'fix',
        priority: analysis.errors.eslint > 500 ? 'high' : analysis.errors.eslint > 200 ? 'medium' : 'low',
        message: `لديك ${analysis.errors.eslint} خطأ ESLint. يُنصح بإصلاحها لتحسين جودة الكود.`,
        files: topFiles.map(f => f.file),
        estimatedTime: analysis.errors.eslint * 1.5, // 1.5 minutes per error
        impact: `إصلاح ${analysis.errors.eslint} خطأ ESLint سيحسن جودة الكود وقابلية القراءة`,
        confidence: Math.min(90, 40 + analysis.errors.eslint / 5)
      });
    }

    // 3. ESLint warnings recommendation
    if (analysis.errors.warnings > 0) {
      const topFiles = await this.getTopErrorFiles('warnings', 30);
      recommendations.push({
        type: 'refactor',
        priority: analysis.errors.warnings > 1000 ? 'medium' : 'low',
        message: `لديك ${analysis.errors.warnings} تحذير ESLint. يُنصح بتنظيف الكود لتحسين قابلية القراءة والصيانة.`,
        files: topFiles.map(f => f.file),
        estimatedTime: analysis.errors.warnings * 0.5, // 30 seconds per warning
        impact: `تنظيف ${analysis.errors.warnings} تحذير ESLint سيحسن قابلية القراءة والصيانة`,
        confidence: Math.min(85, 30 + analysis.errors.warnings / 20)
      });
    }

    // 4. High error density recommendation
    if (analysis.errorDensity > 10) {
      recommendations.push({
        type: 'refactor',
        priority: 'high',
        message: `كثافة الأخطاء عالية (${analysis.errorDensity.toFixed(2)} أخطاء لكل 1000 سطر). يُنصح بإعادة هيكلة الكود.`,
        files: [],
        estimatedTime: analysis.size.linesOfCode / 100, // 1 minute per 100 lines
        impact: 'إعادة هيكلة الكود ستقلل كثافة الأخطاء وتحسن جودة الكود',
        confidence: 80
      });
    }

    // 5. Large files recommendation
    const largeFiles = await this.getLargeFiles(500); // Files with > 500 lines
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'refactor',
        priority: 'medium',
        message: `لديك ${largeFiles.length} ملف كبير (> 500 سطر). يُنصح بتقسيمها لتحسين الصيانة.`,
        files: largeFiles,
        estimatedTime: largeFiles.length * 30, // 30 minutes per file
        impact: 'تقسيم الملفات الكبيرة سيحسن الصيانة وقابلية القراءة',
        confidence: 75
      });
    }

    // Calculate totals
    const totalEstimatedTime = recommendations.reduce((sum, r) => sum + r.estimatedTime, 0);
    const priorityOrder = recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return {
      recommendations,
      totalEstimatedTime: Math.round(totalEstimatedTime),
      totalImpact: `تنفيذ جميع التوصيات سيحسن جودة الكود بشكل كبير`,
      priorityOrder
    };
  }

  /**
   * Get top error files by type
   */
  private async getTopErrorFiles(type: 'typescript' | 'eslint' | 'warnings', limit: number): Promise<ErrorByFile[]> {
    const counter = new ErrorCounter();
    const errors = await counter.countErrors();

    // This is a simplified version - in real implementation, we'd need to track files
    // For now, return empty array as we need to enhance ErrorCounter to track files
    return [];
  }

  /**
   * Get large files
   */
  private async getLargeFiles(minLines: number): Promise<string[]> {
    const largeFiles: string[] = [];

    try {
      const files = await this.getAllSourceFiles();
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n').length;
          if (lines > minLines) {
            const relativePath = path.relative(this.workspaceRoot, file);
            largeFiles.push(relativePath);
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to get large files:', error);
    }

    return largeFiles;
  }

  /**
   * Get all source files
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const fg = await import('fast-glob');
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    try {
      return await fg.default(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });
    } catch {
      return [];
    }
  }
}
