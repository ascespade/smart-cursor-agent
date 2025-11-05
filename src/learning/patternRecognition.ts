/**
 * Pattern recognition for learning from code
 */

import { UserHistory } from '../types';

export class PatternRecognition {
  /**
   * Detect patterns in successful fixes
   */
  detectPatterns(history: UserHistory): Record<string, string> {
    const patterns: Record<string, string> = {};

    const successfulSessions = history.projects.filter(p => p.success);

    if (successfulSessions.length === 0) {
      return patterns;
    }

    // Analyze common strategies
    const agentCountPattern = this.detectAgentCountPattern(successfulSessions);
    if (agentCountPattern) {
      patterns['agentCount'] = agentCountPattern;
    }

    // Analyze model preferences
    const modelPattern = this.detectModelPattern(successfulSessions);
    if (modelPattern) {
      patterns['models'] = modelPattern;
    }

    // Analyze error reduction patterns
    const errorReductionPattern = this.detectErrorReductionPattern(successfulSessions);
    if (errorReductionPattern) {
      patterns['errorReduction'] = errorReductionPattern;
    }

    return patterns;
  }

  /**
   * Detect agent count pattern
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detectAgentCountPattern(sessions: any[]): string | null {
    const counts = sessions.map(s => s.strategy.total);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const median = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)];

    if (Math.abs(avg - median) < 1) {
      return `optimal_agent_count: ${Math.round(avg)}`;
    }

    return null;
  }

  /**
   * Detect model pattern
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detectModelPattern(sessions: any[]): string | null {
    const modelCounts: Record<string, number> = {};

    sessions.forEach(s => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.strategy.models.forEach((m: any) => {
        modelCounts[m.name] = (modelCounts[m.name] || 0) + 1;
      });
    });

    const topModels = Object.keys(modelCounts)
      .sort((a, b) => modelCounts[b] - modelCounts[a])
      .slice(0, 2);

    if (topModels.length > 0) {
      return `preferred_models: ${topModels.join(',')}`;
    }

    return null;
  }

  /**
   * Detect error reduction pattern
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detectErrorReductionPattern(sessions: any[]): string | null {
    const reductions = sessions.map(s => {
      const before = s.errors.before;
      const after = s.errors.after;
      return before > 0 ? (before - after) / before : 0;
    });

    const avgReduction = reductions.reduce((a, b) => a + b, 0) / reductions.length;

    if (avgReduction > 0.8) {
      return 'high_error_reduction: true';
    } else if (avgReduction > 0.5) {
      return 'medium_error_reduction: true';
    }

    return null;
  }
}

