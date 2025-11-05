/**
 * Smart notification manager
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../utils/config';

export class NotificationManager {
  /**
   * Show info notification
   */
  static async info(message: string, ...actions: string[]): Promise<string | undefined> {
    if (!ConfigManager.get<boolean>('showNotifications', true)) {
      return undefined;
    }

    return vscode.window.showInformationMessage(message, ...actions);
  }

  /**
   * Show warning notification
   */
  static async warn(message: string, ...actions: string[]): Promise<string | undefined> {
    if (!ConfigManager.get<boolean>('showNotifications', true)) {
      return undefined;
    }

    return vscode.window.showWarningMessage(message, ...actions);
  }

  /**
   * Show error notification
   */
  static async error(message: string, ...actions: string[]): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message, ...actions);
  }

  /**
   * Show progress notification
   */
  static showProgress(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>
  ): Thenable<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      task
    );
  }

  /**
   * Show analysis complete notification
   */
  static async showAnalysisComplete(
    errors: number,
    recommendation: { total: number; estimatedCost: number }
  ): Promise<string | undefined> {
    return this.info(
      `✅ Analysis complete: ${errors} errors found. ${recommendation.total} agents recommended ($${recommendation.estimatedCost.toFixed(2)})`,
      'View Results',
      'Start Fix',
      'Open Dashboard'
    );
  }

  /**
   * Show fix complete notification
   */
  static async showFixComplete(errorsFixed: number, duration: number): Promise<string | undefined> {
    return this.info(
      `🎉 Fix complete! ${errorsFixed} errors fixed in ${duration} minutes`,
      'View Changes',
      'Open Dashboard',
      'Generate Report'
    );
  }

  /**
   * Show prompt copied notification
   */
  static async showPromptCopied(): Promise<void> {
    await this.info(
      '📋 Prompt copied to clipboard! Open Cursor Composer (Cmd+I / Ctrl+I) and paste.',
      'Open Cursor'
    );
  }
}

