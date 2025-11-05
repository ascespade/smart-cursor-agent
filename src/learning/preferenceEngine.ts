/**
 * Preference engine for learning user preferences
 */

import { StorageManager } from '../utils/storage';
import { UserPreferences } from '../types';

export class PreferenceEngine {
  constructor(private storage: StorageManager) {}

  /**
   * Analyze user preferences from history
   */
  async analyzePreferences(): Promise<UserPreferences> {
    const history = await this.storage.getHistory();

    if (!history || history.projects.length === 0) {
      return {
        defaultMode: 'auto',
        preferredAgentCount: 4,
        preferredModels: ['ChatGPT', 'Claude'],
        autoAnalyze: false,
        nonStopEnabled: true
      };
    }

    // Analyze successful sessions
    const successfulSessions = history.projects.filter(p => p.success);

    // Calculate average agent count
    const avgAgentCount = successfulSessions.length > 0
      ? Math.round(
          successfulSessions.reduce((sum, p) => sum + p.strategy.total, 0) /
          successfulSessions.length
        )
      : 4;

    // Find most used mode
    const modeCounts: Record<string, number> = {};
    successfulSessions.forEach(() => {
      // Extract mode from strategy or session metadata
      const mode = 'auto'; // Default, would be extracted from session
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    });

    const defaultMode = Object.keys(modeCounts).reduce((a, b) =>
      modeCounts[a] > modeCounts[b] ? a : b,
      'auto'
    );

    // Find preferred models
    const modelCounts: Record<string, number> = {};
    successfulSessions.forEach(s => {
      s.strategy.models.forEach(m => {
        modelCounts[m.name] = (modelCounts[m.name] || 0) + 1;
      });
    });

    const preferredModels = Object.keys(modelCounts)
      .sort((a, b) => modelCounts[b] - modelCounts[a])
      .slice(0, 2) as Array<'ChatGPT' | 'Claude' | 'DeepSeek' | 'Gemini'>;

    return {
      defaultMode,
      preferredAgentCount: avgAgentCount,
      preferredModels: preferredModels.length > 0 ? preferredModels : ['ChatGPT', 'Claude'],
      autoAnalyze: false,
      nonStopEnabled: true
    };
  }

  /**
   * Update preferences based on new session
   */
  async updatePreferences(success: boolean, strategy: any): Promise<void> {
    const history = await this.storage.getHistory();
    if (!history) {
      return;
    }

    // Update learning weights
    if (!history.learning.weights) {
      history.learning.weights = {};
    }

    if (success) {
      // Increase weights for successful strategies
      const key = `agentCount_${strategy.total}`;
      history.learning.weights[key] = (history.learning.weights[key] || 1.0) * 1.1;
    }

    // Update success rates
    if (!history.learning.successRates) {
      history.learning.successRates = {};
    }

    const rateKey = 'overall';
    const currentRate = history.learning.successRates[rateKey] || 0.5;
    const totalSessions = history.projects.length;
    const newRate = success
      ? (currentRate * (totalSessions - 1) + 1) / totalSessions
      : (currentRate * (totalSessions - 1)) / totalSessions;

    history.learning.successRates[rateKey] = newRate;

    await this.storage.saveGlobal('history', history);
  }
}

