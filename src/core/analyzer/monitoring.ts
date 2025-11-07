/**
 * Real-time Monitoring - Monitor VS Code diagnostics changes
 */

import * as vscode from 'vscode';
import { ErrorCounter } from './errorCounter';
import { ProjectAnalysis } from '../../types';

export class MonitoringService {
  private diagnosticsListener: vscode.Disposable | null = null;
  private onChangeCallbacks: Array<(analysis: ProjectAnalysis) => void> = [];
  private isMonitoring = false;
  private lastAnalysis: ProjectAnalysis | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring diagnostics changes
   */
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Listen to diagnostics changes
    this.diagnosticsListener = vscode.languages.onDidChangeDiagnostics(async () => {
      await this.checkForChanges();
    });

    // Periodic check
    this.checkInterval = setInterval(async () => {
      await this.checkForChanges();
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.diagnosticsListener) {
      this.diagnosticsListener.dispose();
      this.diagnosticsListener = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register callback for changes
   */
  onErrorChange(callback: (analysis: ProjectAnalysis) => void): vscode.Disposable {
    this.onChangeCallbacks.push(callback);

    return new vscode.Disposable(() => {
      const index = this.onChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onChangeCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Check for changes in errors
   */
  private async checkForChanges(): Promise<void> {
    try {
      const counter = new ErrorCounter();
      const errorCount = await counter.countErrors();

      // Get full analysis
      const { ProjectAnalyzer } = await import('./projectAnalyzer');
      const analyzer = new ProjectAnalyzer();
      const analysis = await analyzer.analyze();

      // Compare with last analysis
      if (this.lastAnalysis) {
        const hasChanged =
          this.lastAnalysis.errors.typescript !== analysis.errors.typescript ||
          this.lastAnalysis.errors.eslint !== analysis.errors.eslint ||
          this.lastAnalysis.errors.warnings !== analysis.errors.warnings ||
          this.lastAnalysis.errors.total !== analysis.errors.total;

        if (hasChanged) {
          // Notify callbacks
          for (const callback of this.onChangeCallbacks) {
            try {
              callback(analysis);
            } catch (error) {
              console.error('Error in monitoring callback:', error);
            }
          }
        }
      }

      this.lastAnalysis = analysis;
    } catch (error) {
      console.error('Error checking for changes:', error);
    }
  }

  /**
   * Get current analysis
   */
  async getCurrentAnalysis(): Promise<ProjectAnalysis | null> {
    if (!this.lastAnalysis) {
      await this.checkForChanges();
    }
    return this.lastAnalysis;
  }
}
