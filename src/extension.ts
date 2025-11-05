/**
 * Cursor Smart Agent Extension - Main Entry Point
 */

import * as vscode from 'vscode';
// Lazy load heavy modules - only import essentials at activation
import { StatusBarManager } from './ui/statusBar';
import { StorageManager } from './utils/storage';
import { Logger } from './utils/logger';
import { ConfigManager } from './utils/config';
import { DashboardView } from './ui/dashboard/dashboardView';
import { ProgressTracker } from './core/executor/progressTracker';
// Type-only imports (erased at runtime, no performance impact)
import type { ProjectAnalysis, AgentRecommendation } from './types';

let statusBar: StatusBarManager;
let dashboardView: DashboardView;
let storage: StorageManager;
let logger: Logger;
let progressTracker: ProgressTracker;
let extensionContext: vscode.ExtensionContext;

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

        const calculator = new AgentCalculator();
        const agentCalc = calculator.calculate(analysis);

        const modelSelector = new ModelSelector();
        const models = modelSelector.selectModels(analysis, agentCalc.total);

        const decisionEngine = new DecisionEngine();
        const strategy = decisionEngine.makeStrategy(analysis, {
          total: agentCalc.total,
          perModel: agentCalc.perModel,
          models,
          strategy: { type: 'hybrid', phases: [], conflictResolution: 'auto' },
          estimatedTime: 2,
          estimatedCost: 10,
          reasoning: agentCalc.reasoning,
          confidence: 75
        });

        const estimatedTime = estimateTime(analysis.errors.total, agentCalc.total);
        const estimatedCost = estimateCost(estimatedTime, models.length);

        const recommendation: AgentRecommendation = {
          total: agentCalc.total,
          perModel: agentCalc.perModel,
          models,
          strategy,
          estimatedTime,
          estimatedCost,
          reasoning: agentCalc.reasoning,
          confidence: 75
        };

        progress.report({ increment: 80, message: 'Storing results...' });

        // Store analysis
        await storage.saveAnalysis(analysis);
        await storage.saveRecommendation(recommendation);

        progress.report({ increment: 100, message: 'Complete!' });

        statusBar.updateStatus('idle');

        // Show results
        const action = await NotificationManager.showAnalysisComplete(
          analysis.errors.total,
          recommendation
        );

        if (action === 'View Results') {
          showAnalysisResults(analysis, recommendation);
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

  // Get current mode
  const modeName = ConfigManager.getDefaultMode();
  const mode = await getModeInstance(modeName, storage, logger);

  // Execute mode
  const strategy = await mode.execute(analysis);

  // Build prompt
  const promptBuilder = new PromptBuilder();
  const prompt = promptBuilder.buildPrompt(analysis, strategy, mode.getConfig());

  // Copy to clipboard
  const cursorIntegration = new CursorIntegration();
  await cursorIntegration.generateAndCopyPrompt(analysis, strategy, mode.getConfig());

  const action = await NotificationManager.info(
    `✅ Prompt ready! (${analysis.errors.total} errors, ${strategy.total} agents)`,
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
function showAnalysisResults(analysis: ProjectAnalysis, recommendation: AgentRecommendation) {
  const panel = vscode.window.createWebviewPanel(
    'analysisResults',
    'Analysis Results',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = getAnalysisResultsHTML(analysis, recommendation);

  panel.webview.onDidReceiveMessage(message => {
    switch (message.command) {
      case 'startFix':
        quickFix();
        break;
      case 'openDashboard':
        openDashboard();
        break;
      case 'customize':
        switchMode();
        break;
    }
  });
}

/**
 * Get analysis results HTML
 */
function getAnalysisResultsHTML(analysis: ProjectAnalysis, recommendation: AgentRecommendation): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }
    .card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      margin: 10px 0;
    }
    .stat {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
    .button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
  </style>
</head>
<body>
  <h1>📊 Project Analysis</h1>

  <div class="card">
    <h2>Errors Found</h2>
    <div class="stat">
      <span>TypeScript:</span>
      <strong>${analysis.errors.typescript}</strong>
    </div>
    <div class="stat">
      <span>ESLint:</span>
      <strong>${analysis.errors.eslint}</strong>
    </div>
    <div class="stat">
      <span>Warnings:</span>
      <strong>${analysis.errors.warnings}</strong>
    </div>
    <div class="stat">
      <span><strong>Total:</strong></span>
      <strong style="color: #f48771;">${analysis.errors.total}</strong>
    </div>
  </div>

  <div class="card">
    <h2>🎯 Recommendation</h2>
    <div class="stat">
      <span>Agent Count:</span>
      <strong>${recommendation.total} agents</strong>
    </div>
    <div class="stat">
      <span>Models:</span>
      <strong>${recommendation.models.length} models</strong>
    </div>
    <div class="stat">
      <span>Estimated Time:</span>
      <strong>${recommendation.estimatedTime} hours</strong>
    </div>
    <div class="stat">
      <span>Estimated Cost:</span>
      <strong>$${recommendation.estimatedCost.toFixed(2)}</strong>
    </div>
    <div class="stat">
      <span>Confidence:</span>
      <strong>${recommendation.confidence}%</strong>
    </div>
  </div>

  <div class="card">
    <h2>💡 Reasoning</h2>
    <ul>
        ${recommendation.reasoning.map((r: string) => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <div style="margin-top: 20px;">
    <button class="button" onclick="startFix()">🚀 Start Fix</button>
    <button class="button" onclick="openDashboard()">📊 Open Dashboard</button>
    <button class="button" onclick="customize()">⚙️ Customize</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function startFix() {
      vscode.postMessage({ command: 'startFix' });
    }
    function openDashboard() {
      vscode.postMessage({ command: 'openDashboard' });
    }
    function customize() {
      vscode.postMessage({ command: 'customize' });
    }
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
  const { QuickPickManager } = await import('./ui/quickPick');
  const { NotificationManager } = await import('./ui/notifications');

  const selected = await QuickPickManager.showModeSelection();
  if (selected) {
    await ConfigManager.update('defaultMode', selected);
    await NotificationManager.info(`✅ Switched to ${selected} mode`);
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

