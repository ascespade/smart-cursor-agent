/**
 * Storage manager for persistent data
 */

import * as vscode from 'vscode';
import { ProjectAnalysis, AgentRecommendation, UserHistory, ProjectSession } from '../types';
import { Logger } from './logger';

export class StorageManager {
  private logger: Logger;

  constructor(private context: vscode.ExtensionContext, logger?: Logger) {
    this.logger = logger || new Logger(context);
  }

  /**
   * Save global data (across all workspaces)
   */
  async saveGlobal<T>(key: string, value: T): Promise<void> {
    try {
      await this.context.globalState.update(key, value);
    } catch (error) {
      this.logger.error(`Failed to save global data for key ${key}`, error);
      throw error;
    }
  }

  /**
   * Get global data
   */
  async getGlobal<T>(key: string): Promise<T | undefined> {
    try {
      return this.context.globalState.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get global data for key ${key}`, error);
      return undefined;
    }
  }

  /**
   * Save workspace-specific data
   */
  async saveWorkspace<T>(key: string, value: T): Promise<void> {
    try {
      await this.context.workspaceState.update(key, value);
    } catch (error) {
      this.logger.error(`Failed to save workspace data for key ${key}`, error);
      throw error;
    }
  }

  /**
   * Get workspace-specific data
   */
  async getWorkspace<T>(key: string): Promise<T | undefined> {
    try {
      return this.context.workspaceState.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get workspace data for key ${key}`, error);
      return undefined;
    }
  }

  /**
   * Save project analysis
   */
  async saveAnalysis(analysis: ProjectAnalysis): Promise<void> {
    await this.saveWorkspace('lastAnalysis', analysis);
  }

  /**
   * Get last analysis
   */
  async getAnalysis(): Promise<ProjectAnalysis | undefined> {
    return this.getWorkspace<ProjectAnalysis>('lastAnalysis');
  }

  /**
   * Save recommendation
   */
  async saveRecommendation(recommendation: AgentRecommendation): Promise<void> {
    await this.saveWorkspace('lastRecommendation', recommendation);
  }

  /**
   * Get last recommendation
   */
  async getRecommendation(): Promise<AgentRecommendation | undefined> {
    return this.getWorkspace<AgentRecommendation>('lastRecommendation');
  }

  /**
   * Add project session to history
   */
  async addProjectSession(session: ProjectSession): Promise<void> {
    const history = await this.getHistory();
    if (!history) {
      const newHistory: UserHistory = {
        projects: [session],
        preferences: {
          defaultMode: 'auto',
          preferredAgentCount: 4,
          preferredModels: ['ChatGPT', 'Claude'],
          autoAnalyze: false,
          nonStopEnabled: true
        },
        learning: {
          patterns: {},
          weights: {},
          successRates: {}
        }
      };
      await this.saveGlobal('history', newHistory);
    } else {
      history.projects.push(session);
      // Keep only last N projects (based on retention)
      const retentionDays = 90; // Default, can be configured
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      history.projects = history.projects.filter(
        p => new Date(p.analyzed) > cutoffDate
      );

      await this.saveGlobal('history', history);
    }
  }

  /**
   * Get user history
   */
  async getHistory(): Promise<UserHistory | undefined> {
    return this.getGlobal<UserHistory>('history');
  }

  /**
   * Clear workspace data
   */
  async clearWorkspace(): Promise<void> {
    const keys = this.context.workspaceState.keys();
    for (const key of keys) {
      await this.context.workspaceState.update(key, undefined);
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.clearWorkspace();
    const keys = this.context.globalState.keys();
    for (const key of keys) {
      await this.context.globalState.update(key, undefined);
    }
  }
}

