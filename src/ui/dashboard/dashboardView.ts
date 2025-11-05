/**
 * Dashboard webview provider
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DashboardData } from '../../types/ui';
import { ProgressTracker } from '../../core/executor/progressTracker';

export class DashboardView {
  private panel: vscode.WebviewPanel | undefined;
  private progressTracker: ProgressTracker | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Show dashboard
   */
  show(progressTracker?: ProgressTracker): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.progressTracker = progressTracker;

    this.panel = vscode.window.createWebviewPanel(
      'smartAgentDashboard',
      'Cursor Smart Agent Dashboard',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'webview'))
        ]
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'getDashboardData':
            this.sendDashboardData();
            break;
          case 'pause':
            vscode.window.showInformationMessage('Pause functionality - coming soon');
            break;
          case 'resume':
            vscode.window.showInformationMessage('Resume functionality - coming soon');
            break;
          case 'stop':
            vscode.window.showInformationMessage('Stop functionality - coming soon');
            break;
          case 'exportReport':
            this.exportReport();
            break;
        }
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Send initial data
    this.sendDashboardData();

    // Update periodically
    const interval = setInterval(() => {
      if (this.panel) {
        this.sendDashboardData();
      } else {
        clearInterval(interval);
      }
    }, 2000);
  }

  /**
   * Send dashboard data to webview
   */
  private sendDashboardData(): void {
    if (!this.panel || !this.progressTracker) {
      return;
    }

    const progress = this.progressTracker.getProgress();
    const agents = this.progressTracker.getAgentStatuses();
    const logs = this.progressTracker.getLogs(100);

    const dashboardData: DashboardData = {
      agents,
      progress,
      logs,
      errors: {
        typescript: 0,
        eslint: 0,
        warnings: 0,
        byFile: {},
        byType: {}
      },
      metrics: {
        cost: 0,
        time: 0,
        efficiency: 0,
        quality: 0
      }
    };

    this.panel.webview.postMessage({
      command: 'updateDashboard',
      data: dashboardData
    });
  }

  /**
   * Export report
   */
  private async exportReport(): Promise<void> {
    const options: vscode.SaveDialogOptions = {
      filters: {
        'JSON': ['json'],
        'All Files': ['*']
      },
      defaultUri: vscode.Uri.file('smart-agent-report.json')
    };

    const uri = await vscode.window.showSaveDialog(options);
    if (uri && this.progressTracker) {
      const data = {
        progress: this.progressTracker.getProgress(),
        agents: this.progressTracker.getAgentStatuses(),
        logs: this.progressTracker.getLogs()
      };

      const fs = await import('fs');
      fs.promises.writeFile(uri.fsPath, JSON.stringify(data, null, 2));
      vscode.window.showInformationMessage('Report exported successfully!');
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    if (!this.panel) {
      return '<html><body>Error loading dashboard</body></html>';
    }

    // Read HTML, CSS, and JS files
    const htmlPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.html');
    const cssPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.css');
    const jsPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.js');

    // Get webview URIs
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(cssPath)
    );
    const jsUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(jsPath)
    );

    // Read HTML file and replace links with webview URIs
    let html = fs.readFileSync(htmlPath, 'utf-8');
    
    if (cssUri && jsUri) {
      // Replace CSS and JS links with webview URIs
      html = html.replace(
        /<link rel="stylesheet" href="dashboard\.css">/,
        `<link rel="stylesheet" href="${cssUri}">`
      );
      html = html.replace(
        /<script src="dashboard\.js"><\/script>/,
        `<script src="${jsUri}"></script>`
      );
    }

    return html;
  }
}

