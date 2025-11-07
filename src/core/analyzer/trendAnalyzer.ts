/**
 * Trend Analyzer - Analyzes error trends over time
 */

import { ProjectAnalysis, ErrorTrend, TrendAnalysis } from '../../types';
import { StorageManager } from '../../utils/storage';
import * as vscode from 'vscode';

export class TrendAnalyzer {
  private storage: StorageManager;
  private readonly MAX_TRENDS = 30; // Keep last 30 days

  constructor(context: vscode.ExtensionContext) {
    this.storage = new StorageManager(context);
  }

  /**
   * Save current analysis to trend history
   */
  async saveTrend(analysis: ProjectAnalysis): Promise<void> {
    const trend: ErrorTrend = {
      date: analysis.timestamp,
      typescript: analysis.errors.typescript,
      eslint: analysis.errors.eslint,
      warnings: analysis.errors.warnings,
      total: analysis.errors.total
    };

    const trends = await this.getTrends();
    trends.push(trend);

    // Keep only last N trends
    if (trends.length > this.MAX_TRENDS) {
      trends.shift();
    }

    await this.storage.saveWorkspace('errorTrends', trends);
  }

  /**
   * Get all trends
   */
  async getTrends(): Promise<ErrorTrend[]> {
    const trends = await this.storage.getWorkspace<ErrorTrend[]>('errorTrends');
    return trends || [];
  }

  /**
   * Analyze trends
   */
  async analyzeTrends(): Promise<TrendAnalysis> {
    const trends = await this.getTrends();

    if (trends.length === 0) {
      return {
        trends: [],
        improvement: 0,
        daysAnalyzed: 0,
        averageErrors: 0,
        peakErrors: 0,
        currentErrors: 0
      };
    }

    // Sort by date
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentErrors = trends[trends.length - 1].total;
    const firstErrors = trends[0].total;
    const peakErrors = Math.max(...trends.map(t => t.total));
    const averageErrors = trends.reduce((sum, t) => sum + t.total, 0) / trends.length;

    // Calculate improvement percentage
    const improvement = firstErrors > 0
      ? ((firstErrors - currentErrors) / firstErrors) * 100
      : 0;

    return {
      trends,
      improvement: Math.round(improvement * 100) / 100,
      daysAnalyzed: trends.length,
      averageErrors: Math.round(averageErrors * 100) / 100,
      peakErrors,
      currentErrors
    };
  }

  /**
   * Get trend chart data
   */
  async getTrendChartData(): Promise<{
    labels: string[];
    typescript: number[];
    eslint: number[];
    warnings: number[];
    total: number[];
  }> {
    const trends = await this.getTrends();
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: trends.map(t => new Date(t.date).toLocaleDateString()),
      typescript: trends.map(t => t.typescript),
      eslint: trends.map(t => t.eslint),
      warnings: trends.map(t => t.warnings),
      total: trends.map(t => t.total)
    };
  }

  /**
   * Clear trends
   */
  async clearTrends(): Promise<void> {
    await this.storage.saveWorkspace('errorTrends', []);
  }
}
