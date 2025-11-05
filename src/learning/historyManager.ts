/**
 * History manager for project sessions
 */

import { StorageManager } from '../utils/storage';
import { ProjectSession, UserHistory, ProjectAnalysis } from '../types';
import { ConfigManager } from '../utils/config';

export class HistoryManager {
  constructor(private storage: StorageManager) {}

  /**
   * Save a project session
   */
  async saveSession(session: ProjectSession): Promise<void> {
    await this.storage.addProjectSession(session);
  }

  /**
   * Get all project sessions
   */
  async getSessions(): Promise<ProjectSession[]> {
    const history = await this.storage.getHistory();
    return history?.projects || [];
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<ProjectSession[]> {
    const sessions = await this.getSessions();
    return sessions
      .sort((a, b) => b.analyzed.getTime() - a.analyzed.getTime())
      .slice(0, limit);
  }

  /**
   * Get successful sessions
   */
  async getSuccessfulSessions(): Promise<ProjectSession[]> {
    const sessions = await this.getSessions();
    return sessions.filter(s => s.success);
  }

  /**
   * Find similar sessions
   */
  async findSimilarSessions(analysis: ProjectAnalysis): Promise<ProjectSession[]> {
    const sessions = await this.getSessions();

    return sessions
      .filter(s => {
        const errorDiff = Math.abs(s.errors.before - analysis.errors.total);
        return errorDiff < analysis.errors.total * 0.3; // Within 30%
      })
      .sort((a, b) => {
        const aDiff = Math.abs(a.errors.before - analysis.errors.total);
        const bDiff = Math.abs(b.errors.before - analysis.errors.total);
        return aDiff - bDiff;
      })
      .slice(0, 5);
  }

  /**
   * Clean old sessions
   */
  async cleanOldSessions(): Promise<number> {
    const retentionDays = ConfigManager.getHistoryRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const history = await this.storage.getHistory();
    if (!history) {
      return 0;
    }

    const beforeCount = history.projects.length;
    history.projects = history.projects.filter(
      p => new Date(p.analyzed) > cutoffDate
    );

    await this.storage.saveGlobal('history', history);
    return beforeCount - history.projects.length;
  }

  /**
   * Export history
   */
  async exportHistory(): Promise<string> {
    const history = await this.storage.getHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import history
   */
  async importHistory(json: string): Promise<void> {
    const history = JSON.parse(json) as UserHistory;
    await this.storage.saveGlobal('history', history);
  }
}

