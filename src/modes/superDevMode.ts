/**
 * Super Developer Mode - Multi-project orchestration
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class SuperDevMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Use maximum resources for super mode
    const agentCalc = calculator.calculate(analysis);
    const superCount = Math.min(12, Math.max(8, agentCalc.total + 2));

    // Use all available models
    const models = modelSelector.selectModels(analysis, superCount);

    // Add super tasks
    const superModels = models.map(m => ({
      ...m,
      tasks: [
        ...m.tasks,
        'Multi-project coordination',
        'DevOps integration',
        'CI/CD pipeline improvements',
        'Cross-project refactoring',
        'Architecture improvements'
      ]
    }));

    // Estimate time and cost
    const estimatedTime = this.estimateTime(analysis.errors.total, superCount);
    const estimatedCost = this.estimateCost(estimatedTime, superModels.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: superCount,
      perModel: Math.ceil(superCount / superModels.length),
      models: superModels,
      strategy: {
        type: 'parallel',
        phases: [],
        conflictResolution: 'auto'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Super Dev Mode: Multi-project orchestration enabled',
        'Maximum agents for fastest execution',
        'DevOps and CI/CD integration',
        'Cross-project refactoring capabilities',
        'Perfect for monorepos and large codebases'
      ],
      confidence: 80
    };

    // Apply strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Super Developer Mode',
      enabled: true,
      settings: {
        nonStop: true,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 0,
        askQuestions: false,
        multiProject: true,
        devopsIntegration: true,
        cicdIntegration: true
      }
    };
  }

  getDescription(): string {
    return 'Multi-project orchestration with DevOps integration. Perfect for monorepos, teams, and large-scale codebases. Maximum agents and parallel execution.';
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    // Super mode is fast with many agents
    const minutesPerError = 2;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3.5;
    return hours * modelCount * costPerHourPerModel;
  }
}

