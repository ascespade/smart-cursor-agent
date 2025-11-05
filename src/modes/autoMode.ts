/**
 * Auto Mode - AI chooses best strategy based on history
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig, UserHistory } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';
import { StorageManager } from '../utils/storage';

export class AutoMode extends BaseMode {
  protected storage: StorageManager;

  constructor(context: any, storage?: any, logger?: any) {
    super(context, storage, logger);
    this.storage = storage || new StorageManager(context);
  }

  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    // Get history to learn from
    const history = await this.storage.getHistory();

    // Calculate base recommendation
    const calculator = new AgentCalculator();
    const agentCalc = calculator.calculate(analysis);

    // Adjust based on history if available
    const adjustedCount = this.adjustFromHistory(agentCalc.total, history);

    // Select models (prefer user's preferred models from history)
    const modelSelector = new ModelSelector();
    const models = modelSelector.selectModels(analysis, adjustedCount);

    // Estimate time and cost
    const estimatedTime = this.estimateTime(analysis.errors.total, adjustedCount);
    const estimatedCost = this.estimateCost(estimatedTime, models.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: adjustedCount,
      perModel: Math.ceil(adjustedCount / models.length),
      models,
      strategy: {
        type: 'hybrid',
        phases: [],
        conflictResolution: 'auto'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Auto Mode: Strategy optimized based on project analysis',
        history ? 'Learning from past project history' : 'Using default strategy'
      ],
      confidence: this.calculateConfidence(analysis, history)
    };

    // Apply strategy
    const decisionEngine = new DecisionEngine();
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Auto Mode',
      enabled: true,
      settings: {
        nonStop: false,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 20,
        askQuestions: true,
        learningEnabled: true
      }
    };
  }

  getDescription(): string {
    return 'AI automatically chooses the best strategy based on your project history and preferences. Recommended for most users.';
  }

  private adjustFromHistory(calculated: number, history?: UserHistory): number {
    if (!history || history.projects.length === 0) {
      return calculated;
    }

    // Find similar past projects
    const avgAgentCount = history.projects
      .filter(p => p.success)
      .reduce((sum, p) => sum + p.strategy.total, 0) / history.projects.length;

    if (avgAgentCount > 0) {
      // Blend calculated with historical average
      return Math.round((calculated * 0.6) + (avgAgentCount * 0.4));
    }

    return calculated;
  }

  private calculateConfidence(analysis: ProjectAnalysis, history?: UserHistory): number {
    let confidence = 75;

    // Increase confidence if we have history
    if (history && history.projects.length > 0) {
      confidence += 10;
    }

    // Adjust based on error count
    if (analysis.errors.total < 50) {
      confidence += 10;
    } else if (analysis.errors.total > 200) {
      confidence -= 10;
    }

    return Math.max(50, Math.min(100, confidence));
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    const minutesPerError = 3;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3;
    return hours * modelCount * costPerHourPerModel;
  }
}

