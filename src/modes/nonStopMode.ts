/**
 * Non-Stop Mode - Continuous execution without interruptions
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class NonStopMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Calculate agents
    const agentCalc = calculator.calculate(analysis);

    // Select models
    const models = modelSelector.selectModels(analysis, agentCalc.total);

    // Estimate time and cost
    const estimatedTime = this.estimateTime(analysis.errors.total, agentCalc.total);
    const estimatedCost = this.estimateCost(estimatedTime, models.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: agentCalc.total,
      perModel: agentCalc.perModel,
      models,
      strategy: decisionEngine.makeStrategy(analysis, {
        total: agentCalc.total,
        perModel: agentCalc.perModel,
        models,
        strategy: {
          type: 'parallel',
          phases: [],
          conflictResolution: 'auto'
        },
        estimatedTime,
        estimatedCost,
        reasoning: agentCalc.reasoning,
        confidence: 85
      }),
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Non-Stop Mode: Agents will work continuously without asking questions',
        'Auto-merge enabled for conflict resolution',
        'High confidence due to automated decision-making'
      ],
      confidence: 85
    };

    // Update strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Non-Stop Mode',
      enabled: true,
      settings: {
        nonStop: true,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 0,
        askQuestions: false
      }
    };
  }

  getDescription(): string {
    return 'Agents work continuously without stopping to ask questions. Perfect for large projects with many errors. All decisions are made automatically.';
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    const minutesPerError = 2.5;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    // Rough cost estimate: $2-5 per hour per model
    const costPerHourPerModel = 3;
    return hours * modelCount * costPerHourPerModel;
  }
}

