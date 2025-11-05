/**
 * Status bar manager
 */

import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'smartAgent.openDashboard';
    this.context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Show status bar
   */
  show(): void {
    this.updateStatus('idle');
    this.statusBarItem.show();
  }

  /**
   * Update status
   */
  updateStatus(
    status: 'idle' | 'analyzing' | 'working' | 'completed' | 'error',
    data?: { errors?: number; progress?: number }
  ): void {
    switch (status) {
      case 'idle':
        this.statusBarItem.text = '$(beaker) Smart Agent';
        this.statusBarItem.tooltip = 'Cursor Smart Agent - Ready';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'analyzing':
        this.statusBarItem.text = '$(sync~spin) Analyzing...';
        this.statusBarItem.tooltip = 'Analyzing project...';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'working': {
        const progress = data?.progress || 0;
        const errors = data?.errors || 0;
        this.statusBarItem.text = `$(sync~spin) Fixing ${errors} errors (${progress}%)`;
        this.statusBarItem.tooltip = `Fixing errors... ${progress}% complete`;
        this.statusBarItem.backgroundColor = undefined;
        break;
      }
      case 'completed':
        this.statusBarItem.text = '$(check) Smart Agent';
        this.statusBarItem.tooltip = 'All errors fixed!';
        this.statusBarItem.backgroundColor = undefined;
        break;
      case 'error':
        this.statusBarItem.text = '$(error) Smart Agent';
        this.statusBarItem.tooltip = 'Error occurred';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  /**
   * Hide status bar
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

