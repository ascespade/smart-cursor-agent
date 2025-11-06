/**
 * Command Handler - Handles API calls through VS Code commands
 * This allows agents to call extension functions via vscode.commands.executeCommand
 */

import * as vscode from 'vscode';
import { extensionAPI, callExtensionAPI, ApiResponse } from './extensionApi';

/**
 * Register API commands
 */
export function registerApiCommands(context: vscode.ExtensionContext): void {
  // Register commands that can be called externally
  context.subscriptions.push(
    // Analyze project
    vscode.commands.registerCommand('smartAgent.api.analyze', async () => {
      return await extensionAPI.analyzeProject();
    }),

    // Calculate agents
    vscode.commands.registerCommand('smartAgent.api.calculateAgents', async (analysis?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await extensionAPI.calculateAgents(analysis as any);
    }),

    // Get analysis
    vscode.commands.registerCommand('smartAgent.api.getAnalysis', async (forceRefresh = false) => {
      return await extensionAPI.getAnalysis(forceRefresh);
    }),

    // Get recommendation
    vscode.commands.registerCommand('smartAgent.api.getRecommendation', async (forceRefresh = false) => {
      return await extensionAPI.getRecommendation(forceRefresh);
    }),

    // Security scan
    vscode.commands.registerCommand('smartAgent.api.securityScan', async () => {
      return await extensionAPI.securityScan();
    }),

    // Get project stats
    vscode.commands.registerCommand('smartAgent.api.getProjectStats', async () => {
      return await extensionAPI.getProjectStats();
    }),

    // Get workspace info
    vscode.commands.registerCommand('smartAgent.api.getWorkspaceInfo', () => {
      return extensionAPI.getWorkspaceInfo();
    }),

    // Generic API call handler
    vscode.commands.registerCommand('smartAgent.api.call', async (method: string, params?: Record<string, unknown>) => {
      return await callExtensionAPI(method, params);
    }),

    // Comprehensive audit
    vscode.commands.registerCommand('smartAgent.api.comprehensiveAudit', async () => {
      const { AuditRunner } = await import('../core/analyzer/auditRunner');
      const runner = new AuditRunner(context);
      return await runner.runAudit();
    })
  );
}

/**
 * Helper function to call API from external code
 * Usage: const result = await executeApiCommand('analyzeProject');
 */
export async function executeApiCommand(
  command: string,
  ...args: unknown[]
): Promise<ApiResponse<unknown>> {
  try {
    const result = await vscode.commands.executeCommand(`smartAgent.api.${command}`, ...args);
    return result as ApiResponse<unknown>;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date()
    };
  }
}

