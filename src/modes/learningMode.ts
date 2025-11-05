/**
 * Learning Mode - Improves over time by learning from fixes
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';
import { StorageManager } from '../utils/storage';

export class LearningMode extends BaseMode {
  protected storage: StorageManager;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(context: any, storage?: any, logger?: any) {
    super(context, storage, logger);
    this.storage = storage || new StorageManager(context);
  }

  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    // Get learning data
    const history = await this.storage.getHistory();
    const learningData = history?.learning || {
      patterns: {},
      weights: {},
      successRates: {}
    };

    // Calculate base recommendation
    const calculator = new AgentCalculator();
    const agentCalc = calculator.calculate(analysis);

    // Apply learning weights
    const adjustedCount = this.applyLearning(agentCalc.total, learningData);

    // Select models with learning preferences
    const modelSelector = new ModelSelector();
    const models = modelSelector.selectModels(analysis, adjustedCount);

    // Estimate time and cost (refined by learning)
    const estimatedTime = this.estimateTimeWithLearning(
      analysis.errors.total,
      adjustedCount,
      learningData
    );
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
        'Learning Mode: Recommendations improved based on past successes',
        `Learning from ${history?.projects.length || 0} past projects`,
        'Adaptive strategy based on historical performance'
      ],
      confidence: this.calculateLearningConfidence(analysis, learningData)
    };

    // Apply strategy
    const decisionEngine = new DecisionEngine();
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Learning Mode',
      enabled: true,
      settings: {
        nonStop: false,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 15,
        askQuestions: true,
        learningEnabled: true,
        adaptiveStrategy: true
      }
    };
  }

  getDescription(): string {
    return 'Continuously improves recommendations by learning from your past fixes and preferences. Gets smarter over time.';
  }

  private applyLearning(calculated: number, learningData: any): number {
    if (!learningData.weights || Object.keys(learningData.weights).length === 0) {
      return calculated;
    }

    // Apply learned weights
    const weight = learningData.weights['agentCount'] || 1.0;
    return Math.round(calculated * weight);
  }

  private estimateTimeWithLearning(
    errorCount: number,
    agentCount: number,
    learningData: any
  ): number {
    const baseMinutesPerError = 3;

    // Adjust based on success rates
    const successRate = learningData.successRates?.['timeEstimate'] || 1.0;
    const adjustedMinutesPerError = baseMinutesPerError * successRate;

    const totalMinutes = (errorCount / agentCount) * adjustedMinutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private calculateLearningConfidence(analysis: ProjectAnalysis, learningData: any): number {
    let confidence = 70;

    // Increase confidence with more learning data
    const patternCount = Object.keys(learningData.patterns || {}).length;
    confidence += Math.min(20, patternCount * 2);

    // Increase if we have success rates
    const hasSuccessRates = Object.keys(learningData.successRates || {}).length > 0;
    if (hasSuccessRates) {
      confidence += 10;
    }

    return Math.max(50, Math.min(100, confidence));
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3;
    return hours * modelCount * costPerHourPerModel;
  }
}

