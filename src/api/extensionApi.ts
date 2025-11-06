/**
 * Extension API - Exposes functions that can be called by external agents
 * This allows agents (like Cursor AI) to use extension functions and get results
 */

import * as vscode from 'vscode';
import { ProjectAnalysis, AgentRecommendation } from '../types';
import { ProjectAnalyzer } from '../core/analyzer/projectAnalyzer';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { StorageManager } from '../utils/storage';
import { Logger } from '../utils/logger';
import { SecurityScanner } from '../security/securityScanner';

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * Extension API class
 */
export class ExtensionAPI {
  private static instance: ExtensionAPI | undefined;
  private storage: StorageManager | undefined;
  private logger: Logger | undefined;
  private context: vscode.ExtensionContext | undefined;

  private constructor() {}

  /**
   * Get API instance (singleton)
   */
  static getInstance(): ExtensionAPI {
    if (!ExtensionAPI.instance) {
      ExtensionAPI.instance = new ExtensionAPI();
    }
    return ExtensionAPI.instance;
  }

  /**
   * Initialize API with extension context
   */
  initialize(context: vscode.ExtensionContext, storage: StorageManager, logger: Logger): void {
    this.context = context;
    this.storage = storage;
    this.logger = logger;
  }

  /**
   * Analyze project and return results
   */
  async analyzeProject(): Promise<ApiResponse<ProjectAnalysis>> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return {
          success: false,
          error: 'No workspace folder open',
          timestamp: new Date()
        };
      }

      const analyzer = new ProjectAnalyzer();
      const analysis = await analyzer.analyze();

      // Save analysis
      if (this.storage) {
        await this.storage.saveAnalysis(analysis);
      }

      return {
        success: true,
        data: analysis,
        timestamp: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('API: analyzeProject failed', error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate agent recommendation
   */
  async calculateAgents(analysis?: ProjectAnalysis): Promise<ApiResponse<AgentRecommendation>> {
    try {
      // Get analysis if not provided
      let projectAnalysis = analysis;
      if (!projectAnalysis) {
        const analysisResult = await this.analyzeProject();
        if (!analysisResult.success || !analysisResult.data) {
          return {
            success: false,
            error: analysisResult.error || 'Failed to analyze project',
            timestamp: new Date()
          };
        }
        projectAnalysis = analysisResult.data;
      }

      const { getModeDefinition } = await import('../types/modes');
      const mode = getModeDefinition('auto'); // Default to auto mode for API
      const calculator = new AgentCalculator();
      const agentResult = calculator.calculate(projectAnalysis, mode);

      const { ModelSelector } = await import('../core/strategy/modelSelector');
      const { DecisionEngine } = await import('../core/strategy/decisionEngine');

      const modelSelector = new ModelSelector();
      const models = modelSelector.selectModels(projectAnalysis, agentResult.total);

      // Create recommendation from agent result
      const decisionEngine = new DecisionEngine();
      const strategy = decisionEngine.makeStrategy(projectAnalysis, {
        total: agentResult.total,
        perModel: agentResult.perModel,
        models: models,
        strategy: {
          type: 'parallel',
          phases: [],
          conflictResolution: 'auto'
        },
        estimatedTime: 0,
        estimatedCost: 0,
        reasoning: agentResult.reasoning,
        confidence: 70
      });

      // Calculate time and cost
      const estimatedTime = Math.ceil(projectAnalysis.errors.total / agentResult.total * 3 / 60); // hours
      const estimatedCost = agentResult.total * estimatedTime * 0.1; // $0.1 per agent-hour

      const recommendation: AgentRecommendation = {
        total: agentResult.total,
        perModel: agentResult.perModel,
        models: models,
        strategy: strategy,
        estimatedTime: estimatedTime,
        estimatedCost: estimatedCost,
        reasoning: agentResult.reasoning,
        confidence: 70
      };

      // Save recommendation
      if (this.storage) {
        await this.storage.saveRecommendation(recommendation);
      }

      return {
        success: true,
        data: recommendation,
        timestamp: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('API: calculateAgents failed', error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get project analysis (cached or fresh)
   */
  async getAnalysis(forceRefresh = false): Promise<ApiResponse<ProjectAnalysis | null>> {
    try {
      if (!forceRefresh && this.storage) {
        const cached = await this.storage.getAnalysis();
        if (cached) {
          return {
            success: true,
            data: cached,
            timestamp: new Date()
          };
        }
      }

      return await this.analyzeProject();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get agent recommendation (cached or fresh)
   */
  async getRecommendation(forceRefresh = false): Promise<ApiResponse<AgentRecommendation | null>> {
    try {
      if (!forceRefresh && this.storage) {
        const cached = await this.storage.getRecommendation();
        if (cached) {
          return {
            success: true,
            data: cached,
            timestamp: new Date()
          };
        }
      }

      return await this.calculateAgents();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Run security scan
   */
  async securityScan(): Promise<ApiResponse<{
    vulnerabilities: number;
    secrets: number;
    issues: string[];
  }>> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return {
          success: false,
          error: 'No workspace folder open',
          timestamp: new Date()
        };
      }

      const scanner = new SecurityScanner();
      const results = await scanner.scan();

      // Filter issues by type
      const vulnerabilities = results.issues.filter(i =>
        i.type === 'sql-injection' || i.type === 'xss' || i.type === 'dangerous'
      );
      const secrets = results.issues.filter(i => i.type === 'secret');

      return {
        success: true,
        data: {
          vulnerabilities: vulnerabilities.length,
          secrets: secrets.length,
          issues: results.issues.map(i => i.description)
        },
        timestamp: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('API: securityScan failed', error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<ApiResponse<{
    files: number;
    lines: number;
    errors: number;
    warnings: number;
    complexity: number;
  }>> {
    try {
      const analysisResult = await this.getAnalysis();
      if (!analysisResult.success || !analysisResult.data) {
        return {
          success: false,
          error: analysisResult.error || 'Failed to get analysis',
          timestamp: new Date()
        };
      }

      const analysis = analysisResult.data;
      return {
        success: true,
        data: {
          files: analysis.size.files,
          lines: analysis.size.linesOfCode,
          errors: analysis.errors.total,
          warnings: analysis.errors.warnings,
          complexity: analysis.complexity === 'low' ? 80 : analysis.complexity === 'medium' ? 60 : analysis.complexity === 'high' ? 40 : 20
        },
        timestamp: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get workspace information
   */
  getWorkspaceInfo(): ApiResponse<{
    name: string;
    path: string;
    files: string[];
  }> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return {
          success: false,
          error: 'No workspace folder open',
          timestamp: new Date()
        };
      }

      // Get all files in workspace (first 100)
      const files: string[] = [];
      const pattern = new vscode.RelativePattern(workspaceFolder, '**/*');
      // Note: This is a simplified version. In production, use vscode.workspace.findFiles

      return {
        success: true,
        data: {
          name: workspaceFolder.name,
          path: workspaceFolder.uri.fsPath,
          files: files
        },
        timestamp: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Export singleton instance
 */
export const extensionAPI = ExtensionAPI.getInstance();

/**
 * Helper function to call API from external context
 * Usage: const result = await callExtensionAPI('analyzeProject');
 */
export async function callExtensionAPI(
  method: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  const api = ExtensionAPI.getInstance();

  switch (method) {
    case 'analyzeProject':
      return await api.analyzeProject();

    case 'calculateAgents':
      return await api.calculateAgents(params?.analysis as ProjectAnalysis);

    case 'getAnalysis':
      return await api.getAnalysis(params?.forceRefresh as boolean);

    case 'getRecommendation':
      return await api.getRecommendation(params?.forceRefresh as boolean);

    case 'securityScan':
      return await api.securityScan();

    case 'getProjectStats':
      return await api.getProjectStats();

    case 'getWorkspaceInfo':
      return api.getWorkspaceInfo();

    default:
      return {
        success: false,
        error: `Unknown method: ${method}`,
        timestamp: new Date()
      };
  }
}

