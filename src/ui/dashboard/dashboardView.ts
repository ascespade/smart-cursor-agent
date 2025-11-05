/**
 * Dashboard webview provider
 */

import * as vscode from 'vscode';
import * as path from 'path';
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
    const htmlPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.html');
    const cssPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.css');
    const jsPath = path.join(this.context.extensionPath, 'resources', 'webview', 'dashboard.js');

    // In production, we'd read the files and inject them
    // For now, return a simple HTML structure
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cursor Smart Agent Dashboard</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-panel-border);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: var(--vscode-textLink-foreground);
    }
    .log-container {
      max-height: 400px;
      overflow-y: auto;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <header>
      <h1>🤖 Cursor Smart Agent Dashboard</h1>
    </header>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="progress">0%</div>
        <div>Overall Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="errorsFixed">0</div>
        <div>Errors Fixed</div>
      </div>
    </div>
    <div class="log-container" id="logs">
      <div>Loading...</div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateDashboard') {
        const data = message.data;
        document.getElementById('progress').textContent = data.progress.overall + '%';
        document.getElementById('errorsFixed').textContent = data.progress.errorsFixed;
        const logsHtml = data.logs.map(log =>
          '<div>' + new Date(log.timestamp).toLocaleTimeString() + ' - ' + log.message + '</div>'
        ).join('');
        document.getElementById('logs').innerHTML = logsHtml;
      }
    });
    vscode.postMessage({ command: 'getDashboardData' });
    setInterval(() => vscode.postMessage({ command: 'getDashboardData' }), 2000);
  </script>
</body>
</html>`;
  }
}

