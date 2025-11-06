/**
 * Cursor Smart Agent Extension - Main Entry Point
 */

import * as vscode from 'vscode';
import * as path from 'path';
// Lazy load heavy modules - only import essentials at activation
import { StatusBarManager } from './ui/statusBar';
import { StorageManager } from './utils/storage';
import { Logger } from './utils/logger';
import { ConfigManager } from './utils/config';
import { DashboardView } from './ui/dashboard/dashboardView';
import { ProgressTracker } from './core/executor/progressTracker';
import { MODE_DEFINITIONS, getModeDefinition, ModeDefinition } from './types/modes';
import { ErrorGrouper, ErrorNode } from './core/analyzer/errorGrouper';
// Type-only imports (erased at runtime, no performance impact)
import type { ProjectAnalysis, AgentRecommendation } from './types';

let statusBar: StatusBarManager;
let dashboardView: DashboardView;
let storage: StorageManager;
let logger: Logger;
let progressTracker: ProgressTracker;
let extensionContext: vscode.ExtensionContext;
let currentReportPanel: vscode.WebviewPanel | undefined;

/**
 * Activate extension
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    extensionContext = context;
    logger = new Logger(context);
    logger.info('🚀 Cursor Smart Agent Extension activated!');

    // Initialize only essential managers synchronously
    storage = new StorageManager(context);
    statusBar = new StatusBarManager(context);
    dashboardView = new DashboardView(context);
    progressTracker = new ProgressTracker(logger);

    // Initialize API (lazy load)
    import('./api/extensionApi').then(({ extensionAPI }) => {
      extensionAPI.initialize(context, storage, logger);
    });

    // Register all commands
    registerCommands(context);

    // Register API commands (lazy load)
    import('./api/commandHandler').then(({ registerApiCommands }) => {
      registerApiCommands(context);
    });

    // Setup status bar
    statusBar.show();

    // Auto-analyze on startup if enabled (defer to avoid blocking)
    if (ConfigManager.isAutoAnalyzeOnStartup()) {
      setTimeout(() => {
        analyzeProject().catch(err => {
          logger.error('Auto-analyze on startup failed', err);
        });
      }, 2000);
    }

    logger.info('✅ Extension ready!');
  } catch (error) {
    // Log error and ensure extension doesn't crash
    const errorLogger = new Logger(context);
    errorLogger.error('Extension activation failed', error);
    vscode.window.showErrorMessage('Cursor Smart Agent: Activation failed. Check output for details.');
  }
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('smartAgent.analyze', analyzeProject),
    vscode.commands.registerCommand('smartAgent.quickFix', quickFix),
    vscode.commands.registerCommand('smartAgent.openDashboard', openDashboard),
    vscode.commands.registerCommand('smartAgent.switchMode', switchMode),
    vscode.commands.registerCommand('smartAgent.viewHistory', viewHistory),
    vscode.commands.registerCommand('smartAgent.runSimulation', runSimulation),
    vscode.commands.registerCommand('smartAgent.securityScan', securityScan),
    vscode.commands.registerCommand('smartAgent.generateReport', generateReport),
    vscode.commands.registerCommand('smartAgent.exportReport', exportReport),
    vscode.commands.registerCommand('smartAgent.openPlayground', openPlayground),
    vscode.commands.registerCommand('smartAgent.help', showHelp)
  );
}

/**
 * Analyze project
 */
async function analyzeProject() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open!');
    return;
  }

  statusBar.updateStatus('analyzing');

  // Lazy load modules
  const { NotificationManager } = await import('./ui/notifications');
  const { ProjectAnalyzer } = await import('./core/analyzer/projectAnalyzer');
  const { AgentCalculator } = await import('./core/strategy/agentCalculator');
  const { ModelSelector } = await import('./core/strategy/modelSelector');
  const { DecisionEngine } = await import('./core/strategy/decisionEngine');

  await NotificationManager.showProgress(
    'Analyzing project...',
    async (progress) => {
      try {
        progress.report({ increment: 0, message: 'Counting errors...' });

        const analyzer = new ProjectAnalyzer();
        const analysis = await analyzer.analyze();

        progress.report({ increment: 50, message: 'Calculating strategy...' });

        // Get current mode
        const modeName = ConfigManager.getDefaultMode();
        const mode = getModeDefinition(modeName);

        progress.report({ increment: 60, message: `Using ${mode.displayName}...` });

        const calculator = new AgentCalculator();
        const recommendation = calculator.calculate(analysis, mode);

        progress.report({ increment: 80, message: 'Storing results...' });

        // Store analysis, recommendation, and mode
        await storage.saveAnalysis(analysis);
        await storage.saveRecommendation(recommendation);
        await storage.saveWorkspace('lastMode', mode);

        progress.report({ increment: 100, message: 'Complete!' });

        statusBar.updateStatus('idle');

        // Calculate actual total (including warnings)
        const actualTotal = analysis.errors.typescript + analysis.errors.eslint + analysis.errors.warnings;

        // Show results
        const action = await NotificationManager.showAnalysisComplete(
          actualTotal,
          recommendation
        );

        if (action === 'View Results') {
          showAnalysisResults(analysis, recommendation, mode);
        } else if (action === 'Start Fix') {
          quickFix();
        } else if (action === 'Open Dashboard') {
          openDashboard();
        }
      } catch (error) {
        logger.error('Analysis failed', error);
        statusBar.updateStatus('error');
        vscode.window.showErrorMessage('Analysis failed. Check output for details.');
      }
    }
  );
}

/**
 * Quick fix
 */
async function quickFix() {
  // Lazy load modules
  const { NotificationManager } = await import('./ui/notifications');
  const { PromptBuilder } = await import('./cursor/promptBuilder');
  const { CursorIntegration } = await import('./cursor/integration');

  const analysis = await storage.getAnalysis();
  const recommendation = await storage.getRecommendation();

  if (!analysis || !recommendation) {
    const action = await NotificationManager.warn(
      'No analysis found. Run "Analyze Project" first.',
      'Analyze Now'
    );
    if (action === 'Analyze Now') {
      analyzeProject();
    }
    return;
  }

  // Get mode from storage or config
  const mode = await storage.getWorkspace<ModeDefinition>('lastMode') || getModeDefinition(ConfigManager.getDefaultMode());

  // Get recommendation from storage
  let recommendation = await storage.getRecommendation();
  if (!recommendation) {
    // Recalculate if not found
    const { AgentCalculator } = await import('./core/strategy/agentCalculator');
    const calculator = new AgentCalculator();
    recommendation = calculator.calculate(analysis, mode);
    await storage.saveRecommendation(recommendation);
  }

  // Build prompt
  const promptBuilder = new PromptBuilder();
  const prompt = promptBuilder.buildPrompt(analysis, recommendation, mode);

  // Copy to clipboard
  const cursorIntegration = new CursorIntegration();
  await cursorIntegration.generateAndCopyPrompt(analysis, recommendation, mode);

  const actualTotal = analysis.errors.typescript + analysis.errors.eslint + analysis.errors.warnings;

  const action = await NotificationManager.info(
    `✅ Prompt ready! (${actualTotal} issues, ${recommendation.total} agents, ${mode.displayName})`,
    'Open Dashboard',
    'View Prompt'
  );

  if (action === 'Open Dashboard') {
    openDashboard();
  } else if (action === 'View Prompt') {
    showPromptPreview(prompt);
  }
}

/**
 * Show analysis results
 */
function showAnalysisResults(
  analysis: ProjectAnalysis,
  recommendation: AgentRecommendation,
  mode: ModeDefinition
) {
  // Reuse panel if exists
  if (currentReportPanel) {
    currentReportPanel.reveal(vscode.ViewColumn.One);
    updateReportContent(currentReportPanel, analysis, recommendation, mode);
    return;
  }

  // Create new panel
  currentReportPanel = vscode.window.createWebviewPanel(
    'analysisResults',
    '📊 Analysis Report',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  // Cleanup on dispose
  currentReportPanel.onDidDispose(() => {
    currentReportPanel = undefined;
  });

  // Update content
  updateReportContent(currentReportPanel, analysis, recommendation, mode);

  // Handle messages from webview
  currentReportPanel.webview.onDidReceiveMessage(async message => {
    switch (message.command) {
      case 'startFix':
        await quickFix();
        break;
      case 'openDashboard':
        openDashboard();
        break;
      case 'changeMode':
        await switchMode();
        break;
      case 'exportReport':
        await exportReport();
        break;
      case 'openFile':
        if (message.file) {
          vscode.workspace.openTextDocument(message.file).then(doc => {
            vscode.window.showTextDocument(doc, {
              selection: new vscode.Range(
                (message.line || 1) - 1,
                message.column || 0,
                (message.line || 1) - 1,
                message.column || 0
              )
            });
          });
        }
        break;
    }
  });
}

/**
 * Update report content
 */
function updateReportContent(
  panel: vscode.WebviewPanel,
  analysis: ProjectAnalysis,
  recommendation: AgentRecommendation,
  mode: ModeDefinition
) {
  // Calculate actual total (including warnings)
  const actualTotal = analysis.errors.typescript +
    analysis.errors.eslint +
    analysis.errors.warnings;

  // Build error tree
  const errorGrouper = new ErrorGrouper();
  const errorTree = errorGrouper.groupByDirectory(analysis.errors.breakdown || []);

  // Update HTML
  panel.webview.html = getReportHTML(
    analysis,
    recommendation,
    mode,
    actualTotal,
    errorTree
  );
}

/**
 * Get report HTML with inline styles and scripts
 */
function getReportHTML(
  analysis: ProjectAnalysis,
  recommendation: AgentRecommendation,
  mode: ModeDefinition,
  actualTotal: number,
  errorTree: ErrorNode
): string {
  const getModelIcon = (name: string): string => {
    const icons: Record<string, string> = {
      'ChatGPT': '🤖',
      'Claude': '🧠',
      'DeepSeek': '🔍',
      'Gemini': '💎'
    };
    return icons[name] || '🤖';
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid var(--vscode-panel-border);
    }

    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 12px;
      font-size: 0.9em;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .mode-badge:hover {
      opacity: 0.8;
    }

    .cost-warning {
      background: #f4877130;
      border-left: 3px solid #f48771;
      padding: 10px 15px;
      margin: 15px 0;
      border-radius: 4px;
    }

    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      margin: 15px 0;
    }

    .card h2 {
      margin-bottom: 15px;
      font-size: 1.3em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
    }

    .stat:not(:last-child) {
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
      font-size: 0.95em;
      transition: opacity 0.2s;
    }

    .button:hover {
      opacity: 0.9;
    }

    .button-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .tree-node {
      margin: 5px 0;
    }

    .tree-header {
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }

    .tree-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .tree-icon {
      width: 20px;
      text-align: center;
    }

    .tree-name {
      flex: 1;
      font-weight: 500;
    }

    .tree-count {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      border-radius: 10px;
    }

    .tree-arrow {
      font-size: 0.8em;
      transition: transform 0.2s;
      width: 20px;
      text-align: center;
    }

    .tree-arrow.expanded {
      transform: rotate(90deg);
    }

    .tree-children {
      margin-left: 20px;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .tree-children.collapsed {
      max-height: 0;
    }

    .error-detail {
      padding: 6px 12px;
      margin: 3px 0;
      font-size: 0.9em;
      color: var(--vscode-errorForeground);
      background: var(--vscode-inputValidation-errorBackground);
      border-left: 3px solid var(--vscode-inputValidation-errorBorder);
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
    }

    .warning-detail {
      color: var(--vscode-editorWarning-foreground);
      background: var(--vscode-inputValidation-warningBackground);
      border-left-color: var(--vscode-inputValidation-warningBorder);
    }

    .model-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .model-card {
      padding: 15px;
      border: 2px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-editor-background);
    }

    .model-card h3 {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .model-badge {
      font-size: 0.8em;
      padding: 3px 8px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
    }

    .priority-critical { border-color: #f48771; }
    .priority-high { border-color: #f4b771; }
    .priority-medium { border-color: #71b7f4; }

    .actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Project Analysis Report</h1>
    <div class="mode-badge" onclick="changeMode()" title="Click to change mode">
      ${mode.displayName}
      ${mode.cost === 'paid' ? '💳' : '🆓'}
    </div>
  </div>

  ${mode.cost === 'paid' ? `
  <div class="cost-warning">
    ⚠️ <strong>Multi-Model Mode:</strong> This mode uses ${mode.modelCount} models and requires API credits.
    Estimated cost: <strong>$${recommendation.estimatedCost.toFixed(2)}</strong>
  </div>
  ` : ''}

  <div class="card">
    <h2>🐛 Errors Found</h2>
    <div class="stat">
      <span>TypeScript Errors:</span>
      <strong style="color: #f48771;">${analysis.errors.typescript}</strong>
    </div>
    <div class="stat">
      <span>ESLint Errors:</span>
      <strong style="color: #f48771;">${analysis.errors.eslint}</strong>
    </div>
    <div class="stat">
      <span>Warnings:</span>
      <strong style="color: #f4b771;">${analysis.errors.warnings}</strong>
    </div>
    <div class="stat">
      <span><strong>Total Issues:</strong></span>
      <strong style="color: #f48771; font-size: 1.2em;">${actualTotal}</strong>
    </div>
  </div>

  <div class="card">
    <h2>📂 Error Breakdown by Location</h2>
    <div id="error-tree"></div>
  </div>

  <div class="card">
    <h2>🎯 Recommended Strategy</h2>
    <div class="stat">
      <span>Mode:</span>
      <strong>${mode.displayName}</strong>
    </div>
    <div class="stat">
      <span>Total Agents:</span>
      <strong>${recommendation.total} agents</strong>
    </div>
    <div class="stat">
      <span>Agents per Model:</span>
      <strong>${recommendation.perModel} agents</strong>
    </div>
    <div class="stat">
      <span>Models Used:</span>
      <strong>${mode.modelCount} model${mode.modelCount > 1 ? 's' : ''}</strong>
    </div>
    <div class="stat">
      <span>Estimated Time:</span>
      <strong>${Math.round(recommendation.estimatedTime)} minutes</strong>
    </div>
    <div class="stat">
      <span>Estimated Cost:</span>
      <strong>${mode.cost === 'free' ? 'FREE' : '$' + recommendation.estimatedCost.toFixed(2)}</strong>
    </div>
    <div class="stat">
      <span>Confidence:</span>
      <strong>${recommendation.confidence}%</strong>
    </div>
  </div>

  <div class="card">
    <h2>💡 Why This Strategy?</h2>
    <ul style="margin-left: 20px; line-height: 1.6;">
      ${recommendation.reasoning.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <div class="card">
    <h2>🤖 Model Distribution</h2>
    <div class="model-grid">
      ${recommendation.models.map(m => `
        <div class="model-card priority-${m.priority}">
          <h3>
            ${getModelIcon(m.name)} ${m.name}
            <span class="model-badge">${m.agents} agents</span>
          </h3>
          <p style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin: 8px 0;">
            Priority: <strong>${m.priority}</strong>
          </p>
          <p style="font-size: 0.85em; margin-top: 8px;">
            <strong>Tasks:</strong><br/>
            ${m.tasks.join(', ')}
          </p>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="actions">
    <button class="button" onclick="startFix()">
      🚀 Start Fix
    </button>
    <button class="button button-secondary" onclick="openDashboard()">
      📊 Open Dashboard
    </button>
    <button class="button button-secondary" onclick="changeMode()">
      ⚙️ Change Mode
    </button>
    <button class="button button-secondary" onclick="exportReport()">
      💾 Export Report
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Error tree data
    const errorTree = ${JSON.stringify(errorTree)};

    // Render tree
    function renderTree() {
      const container = document.getElementById('error-tree');
      container.innerHTML = createTreeNode(errorTree);
    }

    function createTreeNode(node, level = 0) {
      const indent = level * 20;
      const icon = node.type === 'folder' ? '📁' : '📄';
      const hasChildren = node.children && node.children.length > 0;

      let html = '<div class="tree-node">';

      // Header
      html += \`
        <div class="tree-header" onclick="toggleNode(this)" style="margin-left: \${indent}px">
          \${hasChildren ? '<span class="tree-arrow">▶</span>' : '<span style="width: 20px;"></span>'}
          <span class="tree-icon">\${icon}</span>
          <span class="tree-name">\${node.name}</span>
          <span class="tree-count">\${node.count}</span>
        </div>
      \`;

      // Children
      if (hasChildren) {
        html += '<div class="tree-children collapsed">';
        node.children.forEach(child => {
          html += createTreeNode(child, level + 1);
        });
        html += '</div>';
      }

      // Errors
      if (node.errors && node.errors.length > 0) {
        html += '<div class="tree-children collapsed">';
        node.errors.forEach(error => {
          const className = error.severity === 'warning' ? 'warning-detail' : 'error-detail';
          html += \`
            <div class="\${className}" style="margin-left: \${(level + 1) * 20}px">
              Line \${error.line}:\${error.column} - \${error.message}
              \${error.rule ? \`<span style="opacity: 0.7;"> (\${error.rule})</span>\` : ''}
            </div>
          \`;
        });
        html += '</div>';
      }

      html += '</div>';
      return html;
    }

    function toggleNode(header) {
      const arrow = header.querySelector('.tree-arrow');
      const children = header.nextElementSibling;

      if (children && children.classList.contains('tree-children')) {
        const isCollapsed = children.classList.contains('collapsed');

        if (isCollapsed) {
          children.classList.remove('collapsed');
          children.style.maxHeight = children.scrollHeight + 'px';
          if (arrow) arrow.classList.add('expanded');
        } else {
          children.style.maxHeight = '0';
          children.classList.add('collapsed');
          if (arrow) arrow.classList.remove('expanded');
        }
      }
    }

    // Actions
    function startFix() {
      vscode.postMessage({ command: 'startFix' });
    }

    function openDashboard() {
      vscode.postMessage({ command: 'openDashboard' });
    }

    function changeMode() {
      vscode.postMessage({ command: 'changeMode' });
    }

    function exportReport() {
      vscode.postMessage({ command: 'exportReport' });
    }

    // Listen for updates
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.type) {
        case 'updateRecommendation':
          updateRecommendationUI(message.recommendation, message.mode);
          break;
      }
    });

    function updateRecommendationUI(newRec, newMode) {
      // Update mode badge
      const badge = document.querySelector('.mode-badge');
      if (badge) {
        badge.innerHTML = \`
          \${newMode.displayName}
          \${newMode.cost === 'paid' ? '💳' : '🆓'}
        \`;
      }

      // Show notification
      showNotification('Mode updated to ' + newMode.displayName);
    }

    function showNotification(message) {
      const notif = document.createElement('div');
      notif.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--vscode-notifications-background);
        color: var(--vscode-notifications-foreground);
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
      \`;
      notif.textContent = message;
      document.body.appendChild(notif);

      setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
      }, 3000);
    }

    // Initialize
    renderTree();
  </script>
</body>
</html>`;
}

/**
 * Open dashboard
 */
function openDashboard() {
  dashboardView.show(progressTracker);
}

/**
 * Switch mode
 */
async function switchMode() {
  const currentModeName = ConfigManager.getDefaultMode();

  const modes = Object.values(MODE_DEFINITIONS).map(mode => ({
    label: mode.displayName + (mode.name === currentModeName ? ' ✓' : ''),
    description: mode.description,
    detail: [
      `${mode.modelCount} model${mode.modelCount > 1 ? 's' : ''}`,
      `Up to ${mode.maxAgents} agents`,
      mode.cost === 'free' ? '🆓 FREE' : '💳 PAID'
    ].join(' • '),
    value: mode.name,
    picked: mode.name === currentModeName
  }));

  // Sort: Current first, then Free, then Paid
  modes.sort((a, b) => {
    if (a.picked) return -1;
    if (b.picked) return 1;

    const aDef = MODE_DEFINITIONS[a.value];
    const bDef = MODE_DEFINITIONS[b.value];

    if (aDef.cost !== bDef.cost) {
      return aDef.cost === 'free' ? -1 : 1;
    }

    return 0;
  });

  const selected = await vscode.window.showQuickPick(modes, {
    placeHolder: 'Select operating mode',
    title: '🎯 Switch Mode',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (selected && selected.value !== currentModeName) {
    await updateMode(selected.value);
  }
}

/**
 * Update mode
 */
async function updateMode(newModeName: string) {
  const config = vscode.workspace.getConfiguration('smartAgent');
  await config.update('defaultMode', newModeName, vscode.ConfigurationTarget.Global);

  const newMode = getModeDefinition(newModeName);

  // Recalculate recommendations if analysis exists
  const analysis = await storage.getAnalysis();

  if (analysis) {
    const { AgentCalculator } = await import('./core/strategy/agentCalculator');
    const calculator = new AgentCalculator();
    const newRecommendation = calculator.calculate(analysis, newMode);

    await storage.saveRecommendation(newRecommendation);
    await storage.saveWorkspace('lastMode', newMode);

    // Update open report if exists
    if (currentReportPanel && !currentReportPanel.disposed) {
      updateReportContent(currentReportPanel, analysis, newRecommendation, newMode);

      vscode.window.showInformationMessage(
        `✅ Switched to ${newMode.displayName}`
      );
    }
  } else {
    vscode.window.showInformationMessage(
      `✅ Default mode changed to ${newMode.displayName}`
    );
  }
}

/**
 * Get mode instance (lazy loaded)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getModeInstance(modeName: string, storage: StorageManager, logger: Logger): Promise<any> {
  switch (modeName) {
    case 'auto': {
      const { AutoMode } = await import('./modes/autoMode');
      return new AutoMode(undefined, storage, logger);
    }
    case 'non-stop': {
      const { NonStopMode } = await import('./modes/nonStopMode');
      return new NonStopMode(undefined, storage, logger);
    }
    case 'learning': {
      const { LearningMode } = await import('./modes/learningMode');
      return new LearningMode(undefined, storage, logger);
    }
    case 'security': {
      const { SecurityMode } = await import('./modes/securityMode');
      return new SecurityMode(undefined, storage, logger);
    }
    case 'simulation': {
      const { SimulationMode } = await import('./modes/simulationMode');
      return new SimulationMode(undefined, storage, logger);
    }
    case 'lazy': {
      const { LazyDevMode } = await import('./modes/lazyDevMode');
      return new LazyDevMode(undefined, storage, logger);
    }
    case 'smart': {
      const { SmartDevMode } = await import('./modes/smartDevMode');
      return new SmartDevMode(undefined, storage, logger);
    }
    case 'super': {
      const { SuperDevMode } = await import('./modes/superDevMode');
      return new SuperDevMode(undefined, storage, logger);
    }
    default: {
      const { AutoMode } = await import('./modes/autoMode');
      return new AutoMode(undefined, storage, logger);
    }
  }
}

/**
 * View history
 */
async function viewHistory() {
  const { HistoryManager } = await import('./learning/historyManager');
  const { NotificationManager } = await import('./ui/notifications');

  const historyManager = new HistoryManager(storage);
  const sessions = await historyManager.getRecentSessions(10);

  if (sessions.length === 0) {
    await NotificationManager.info('No history found. Run your first analysis to start tracking.');
    return;
  }

  // Show history in a simple view
  const items = sessions.map(s => ({
    label: `${s.path} - ${s.errors.before} errors`,
    description: `Fixed: ${s.errors.before - s.errors.after}, Duration: ${s.duration}min`,
    detail: `Success: ${s.success ? 'Yes' : 'No'}`
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a session to view details'
  });

  if (selected) {
    vscode.window.showInformationMessage('History details - coming soon!');
  }
}

/**
 * Run simulation
 */
async function runSimulation() {
  const { NotificationManager } = await import('./ui/notifications');
  await NotificationManager.info('🎮 Simulation mode - Switch to simulation mode and run Quick Fix');
  switchMode();
}

/**
 * Security scan
 */
async function securityScan() {
  const { NotificationManager } = await import('./ui/notifications');
  const { SecurityScanner } = await import('./security/securityScanner');

  await NotificationManager.showProgress('Scanning for security issues...', async (progress) => {
    try {
      const scanner = new SecurityScanner();
      const report = await scanner.scan();

      progress.report({ increment: 100 });

      if (report.passed) {
        await NotificationManager.info(
          `✅ Security scan passed! Score: ${report.score}/100`,
          'View Details'
        );
      } else {
        await NotificationManager.warn(
          `⚠️ Security issues found! Score: ${report.score}/100 (${report.issues.length} issues)`,
          'View Details'
        );
      }
    } catch (error) {
      logger.error('Security scan failed', error);
      await NotificationManager.error('Security scan failed. Check output for details.');
    }
  });
}

/**
 * Generate report
 */
async function generateReport() {
  const { NotificationManager } = await import('./ui/notifications');

  const analysis = await storage.getAnalysis();
  const recommendation = await storage.getRecommendation();

  if (!analysis || !recommendation) {
    await NotificationManager.warn('No analysis data to export. Run analysis first.');
    return;
  }

  const options: vscode.SaveDialogOptions = {
    filters: {
      'JSON': ['json'],
      'All Files': ['*']
    },
    defaultUri: vscode.Uri.file('smart-agent-report.json')
  };

  const uri = await vscode.window.showSaveDialog(options);
  if (uri) {
    const report = {
      analysis,
      recommendation,
      timestamp: new Date().toISOString()
    };

    const fs = await import('fs');
    await fs.promises.writeFile(uri.fsPath, JSON.stringify(report, null, 2));
    await NotificationManager.info('✅ Report exported successfully!');
  }
}

/**
 * Export report
 */
async function exportReport() {
  const { NotificationManager } = await import('./ui/notifications');

  const analysis = await storage.getAnalysis();
  const recommendation = await storage.getRecommendation();
  const mode = await storage.getWorkspace<ModeDefinition>('lastMode') || getModeDefinition(ConfigManager.getDefaultMode());

  if (!analysis || !recommendation) {
    await NotificationManager.warn('No analysis data to export. Run analysis first.');
    return;
  }

  // Select format
  const format = await vscode.window.showQuickPick([
    { label: '📄 Markdown', value: 'md' },
    { label: '📊 JSON', value: 'json' },
    { label: '📈 HTML', value: 'html' }
  ], {
    placeHolder: 'Select export format'
  });

  if (!format) return;

  let content: string;
  let filename: string;
  const timestamp = Date.now();

  const actualTotal = analysis.errors.typescript + analysis.errors.eslint + analysis.errors.warnings;
  const errorGrouper = new ErrorGrouper();
  const errorTree = errorGrouper.groupByDirectory(analysis.errors.breakdown || []);

  switch (format.value) {
    case 'md':
      content = generateMarkdownReport(analysis, recommendation, mode, actualTotal);
      filename = `cursor-agent-report-${timestamp}.md`;
      break;
    case 'json':
      content = JSON.stringify({
        analysis,
        recommendation,
        mode,
        timestamp: new Date().toISOString()
      }, null, 2);
      filename = `cursor-agent-report-${timestamp}.json`;
      break;
    case 'html':
      content = getReportHTML(analysis, recommendation, mode, actualTotal, errorTree);
      filename = `cursor-agent-report-${timestamp}.html`;
      break;
    default:
      return;
  }

  // Save to workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    await NotificationManager.error('No workspace folder open');
    return;
  }

  const filePath = vscode.Uri.joinPath(workspaceFolder.uri, filename);
  await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf-8'));

  const action = await NotificationManager.info(
    `✅ Report exported: ${filename}`,
    'Open File',
    'Open Folder'
  );

  if (action === 'Open File') {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } else if (action === 'Open Folder') {
    await vscode.commands.executeCommand('revealFileInOS', filePath);
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
  analysis: ProjectAnalysis,
  recommendation: AgentRecommendation,
  mode: ModeDefinition,
  actualTotal: number
): string {
  const workspaceName = vscode.workspace.name || 'Unknown';
  const timestamp = new Date().toLocaleString();

  const getModelIconForMarkdown = (name: string): string => {
    const icons: Record<string, string> = {
      'ChatGPT': '🤖',
      'Claude': '🧠',
      'DeepSeek': '🔍',
      'Gemini': '💎'
    };
    return icons[name] || '🤖';
  };

  return `# 🤖 Cursor Smart Agent - Analysis Report

**Generated:** ${timestamp}
**Project:** ${workspaceName}
**Mode:** ${mode.displayName}

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| TypeScript Errors | ${analysis.errors.typescript} |
| ESLint Errors | ${analysis.errors.eslint} |
| Warnings | ${analysis.errors.warnings} |
| **Total Issues** | **${actualTotal}** |
| Files Analyzed | ${analysis.size.files} |
| Lines of Code | ${analysis.size.linesOfCode.toLocaleString()} |
| Complexity | ${analysis.complexity} |

---

## 🎯 Recommended Strategy

**Mode:** ${mode.displayName} ${mode.cost === 'paid' ? '💳 (Paid)' : '🆓 (Free)'}

| Setting | Value |
|---------|-------|
| Total Agents | ${recommendation.total} |
| Agents per Model | ${recommendation.perModel} |
| Models Used | ${mode.modelCount} |
| Estimated Time | ${Math.round(recommendation.estimatedTime)} minutes |
| Estimated Cost | ${mode.cost === 'free' ? 'FREE' : '$' + recommendation.estimatedCost.toFixed(2)} |
| Confidence | ${recommendation.confidence}% |

---

## 💡 Reasoning

${recommendation.reasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

## 🤖 Model Distribution

${recommendation.models.map(m => `
### ${getModelIconForMarkdown(m.name)} ${m.name}

- **Agents:** ${m.agents}
- **Priority:** ${m.priority}
- **Branch:** \`${m.branch}\`
- **Tasks:** ${m.tasks.join(', ')}

`).join('\n')}

---

## 📂 Error Breakdown

### TypeScript Errors (${analysis.errors.typescript})

${analysis.errors.breakdown
    .filter(e => e.type === 'TypeScript')
    .map(e => `- **${e.type}** (${e.severity}): ${e.count} errors in ${e.files.length} files`)
    .join('\n') || 'None'}

### ESLint Errors (${analysis.errors.eslint})

${analysis.errors.breakdown
    .filter(e => e.type === 'ESLint')
    .map(e => `- **${e.type}** (${e.severity}): ${e.count} errors in ${e.files.length} files`)
    .join('\n') || 'None'}

### Warnings (${analysis.errors.warnings})

${analysis.errors.breakdown
    .filter(e => e.severity === 'warning')
    .map(e => `- **${e.type}**: ${e.count} warnings in ${e.files.length} files`)
    .join('\n') || 'None'}

---

## 📝 Next Steps

1. Copy the generated prompt to clipboard
2. Open Cursor Composer (\`Cmd+I\` / \`Ctrl+I\`)
3. Paste and execute
4. Monitor progress in the dashboard

---

*Report generated by Cursor Smart Agent Extension*

`;
}

/**
 * Open playground
 */
async function openPlayground() {
  const { NotificationManager } = await import('./ui/notifications');
  await NotificationManager.info('🎮 Playground - Coming soon!');
}

/**
 * Show help
 */
async function showHelp() {
  if (extensionContext) {
    const { HelpPanel } = await import('./ui/helpPanel');
    HelpPanel.show(extensionContext);
  } else {
    // Fallback: open external URL
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/cursor-smart-agent/cursor-smart-agent#readme'));
  }
}

/**
 * Show prompt preview
 */
function showPromptPreview(prompt: string) {
  const doc = vscode.workspace.openTextDocument({
    content: prompt,
    language: 'markdown'
  });

  doc.then(d => {
    vscode.window.showTextDocument(d, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: true
    });
  });
}

/**
 * Estimate time
 */
function estimateTime(errorCount: number, agentCount: number): number {
  const minutesPerError = 3;
  const totalMinutes = (errorCount / agentCount) * minutesPerError;
  return Math.ceil(totalMinutes / 60);
}

/**
 * Estimate cost
 */
function estimateCost(hours: number, modelCount: number): number {
  const costPerHourPerModel = 3;
  return hours * modelCount * costPerHourPerModel;
}

/**
 * Deactivate extension
 */
export function deactivate() {
  if (logger) {
    logger.info('👋 Extension deactivated');
  }
}

