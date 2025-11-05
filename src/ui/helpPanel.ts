/**
 * Help panel with documentation
 */

import * as vscode from 'vscode';

export class HelpPanel {
  private static panel: vscode.WebviewPanel | undefined;

  /**
   * Show help panel
   */
  static show(context: vscode.ExtensionContext): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'smartAgentHelp',
      'Cursor Smart Agent - Help',
      vscode.ViewColumn.Two,
      {
        enableScripts: true
      }
    );

    this.panel.webview.html = this.getHelpContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * Get help content HTML
   */
  private static getHelpContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    h1 {
      color: var(--vscode-textLink-foreground);
      border-bottom: 2px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    h2 {
      color: var(--vscode-textLink-foreground);
      margin-top: 30px;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background: var(--vscode-editor-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
    }
    .command {
      background: var(--vscode-textCodeBlock-background);
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
      font-family: var(--vscode-editor-font-family);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid var(--vscode-panel-border);
      padding: 10px;
      text-align: left;
    }
    th {
      background: var(--vscode-list-activeSelectionBackground);
    }
  </style>
</head>
<body>
  <h1>🤖 Cursor Smart Agent - Help</h1>

  <div class="section">
    <h2>Quick Start</h2>
    <ol>
      <li>Press <code>Cmd+Shift+A</code> (Mac) or <code>Ctrl+Shift+A</code> (Windows) to analyze your project</li>
      <li>Review the analysis results</li>
      <li>Press <code>Cmd+Shift+F</code> to start auto-fix</li>
      <li>Copy the generated prompt and paste into Cursor Composer</li>
    </ol>
  </div>

  <div class="section">
    <h2>Commands</h2>
    <table>
      <tr>
        <th>Command</th>
        <th>Shortcut</th>
        <th>Description</th>
      </tr>
      <tr>
        <td>Analyze Project</td>
        <td>Cmd+Shift+A</td>
        <td>Count all TypeScript and ESLint errors</td>
      </tr>
      <tr>
        <td>Quick Fix</td>
        <td>Cmd+Shift+F</td>
        <td>Start auto-fix with current mode</td>
      </tr>
      <tr>
        <td>Open Dashboard</td>
        <td>Cmd+Shift+D</td>
        <td>View real-time progress</td>
      </tr>
      <tr>
        <td>Switch Mode</td>
        <td>-</td>
        <td>Change execution mode</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Modes</h2>
    <h3>🧠 Auto Mode</h3>
    <p>AI automatically chooses the best strategy based on your project history. Recommended for most users.</p>

    <h3>🤖 Non-Stop Mode</h3>
    <p>Agents work continuously without asking questions. Perfect for large projects with 500+ errors.</p>

    <h3>🎓 Smart Developer Mode</h3>
    <p>Context-aware suggestions and proactive error prevention. Perfect for daily development.</p>

    <h3>😴 Lazy Developer Mode</h3>
    <p>Minimal input, maximum output. Describe your project and let AI build everything.</p>

    <h3>🦸 Super Developer Mode</h3>
    <p>Multi-project orchestration with DevOps integration. Perfect for monorepos and teams.</p>

    <h3>🔒 Security Mode</h3>
    <p>Security-first approach with automatic vulnerability scanning. Perfect for production code.</p>

    <h3>🎮 Simulation Mode</h3>
    <p>Preview all changes before applying. Perfect for testing strategies or first-time use.</p>

    <h3>📚 Learning Mode</h3>
    <p>Continuously improves recommendations by learning from your past fixes. Gets smarter over time.</p>
  </div>

  <div class="section">
    <h2>Settings</h2>
    <p>Configure the extension in VS Code settings:</p>
    <div class="command">
      <code>smartAgent.defaultMode</code> - Default execution mode<br>
      <code>smartAgent.nonStopMode</code> - Enable non-stop execution<br>
      <code>smartAgent.confidenceThreshold</code> - When to ask questions (0 = never)<br>
      <code>smartAgent.defaultAgentCount</code> - Default number of agents<br>
      <code>smartAgent.preferredModels</code> - Preferred AI models<br>
      <code>smartAgent.gitIntegration</code> - Enable Git integration<br>
      <code>smartAgent.securityScanning</code> - Enable security scanning<br>
      <code>smartAgent.learningEnabled</code> - Enable learning mode
    </div>
  </div>

  <div class="section">
    <h2>Troubleshooting</h2>
    <h3>Extension Not Working?</h3>
    <ol>
      <li>Check VS Code version (requires 1.80+)</li>
      <li>Reload window: <code>Cmd+Shift+P</code> → "Reload Window"</li>
      <li>Check Output panel: "Cursor Smart Agent"</li>
    </ol>

    <h3>Analysis Failing?</h3>
    <ol>
      <li>Ensure <code>tsc</code> and <code>eslint</code> are installed</li>
      <li>Check workspace has <code>package.json</code></li>
      <li>Verify TypeScript/ESLint configs exist</li>
    </ol>
  </div>

  <div class="section">
    <h2>More Information</h2>
    <p>For more details, visit the GitHub repository or check the README file.</p>
  </div>
</body>
</html>`;
  }
}

