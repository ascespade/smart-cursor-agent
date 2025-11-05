/**
 * Lazy Developer Mode - Minimal input, maximum output
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class LazyDevMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Use maximum agents for lazy mode
    const agentCalc = calculator.calculate(analysis);
    const maxAgents = Math.min(12, Math.max(6, agentCalc.total));

    // Select models (prefer cost-effective for bulk)
    const models = modelSelector.selectModels(analysis, maxAgents);

    // Add more tasks per agent
    const enhancedModels = models.map(m => ({
      ...m,
      tasks: [
        ...m.tasks,
        'Code optimization',
        'Documentation improvements',
        'Best practices enforcement',
        'Performance improvements'
      ]
    }));

    // Estimate time and cost
    const estimatedTime = this.estimateTime(analysis.errors.total, maxAgents);
    const estimatedCost = this.estimateCost(estimatedTime, enhancedModels.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: maxAgents,
      perModel: Math.ceil(maxAgents / enhancedModels.length),
      models: enhancedModels,
      strategy: {
        type: 'parallel',
        phases: [],
        conflictResolution: 'auto'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Lazy Dev Mode: Maximum automation with minimal input',
        'Agents handle everything including optimization and improvements',
        'Just describe what you want and let AI build it',
        'Perfect for new projects or rapid prototyping'
      ],
      confidence: 75
    };

    // Apply strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Lazy Developer Mode',
      enabled: true,
      settings: {
        nonStop: true,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 0,
        askQuestions: false,
        autoOptimize: true,
        autoDocument: true
      }
    };
  }

  getDescription(): string {
    return 'Minimal input, maximum output. Describe your project and let AI do everything - from error fixing to optimization and documentation.';
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    // More time for additional tasks
    const minutesPerError = 4;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3;
    return hours * modelCount * costPerHourPerModel;
  }
}

