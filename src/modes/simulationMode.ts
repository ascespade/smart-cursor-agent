/**
 * Simulation Mode - Preview changes without applying
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class SimulationMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Calculate agents
    const agentCalc = calculator.calculate(analysis);

    // Select models
    const models = modelSelector.selectModels(analysis, agentCalc.total);

    // Estimate time and cost (simulation is faster)
    const estimatedTime = this.estimateTime(analysis.errors.total, agentCalc.total);
    const estimatedCost = this.estimateCost(estimatedTime, models.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: agentCalc.total,
      perModel: agentCalc.perModel,
      models: models.map(m => ({
        ...m,
        tasks: m.tasks.map(t => `[SIMULATION] ${t}`)
      })),
      strategy: {
        type: 'sequential',
        phases: [],
        conflictResolution: 'manual'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Simulation Mode: Preview all changes before applying',
        'No actual code changes will be made',
        'Review all recommendations before execution',
        'Safe testing mode'
      ],
      confidence: 90
    };

    // Apply strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Simulation Mode',
      enabled: true,
      settings: {
        nonStop: false,
        autoCommit: false,
        conflictResolution: 'manual',
        confidenceThreshold: 50,
        askQuestions: true,
        simulation: true,
        dryRun: true
      }
    };
  }

  getDescription(): string {
    return 'Preview all changes before applying them. Perfect for testing strategies or first-time use. No actual code changes are made.';
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    // Simulation is faster (no actual execution)
    const minutesPerError = 2;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    // Simulation costs less
    const costPerHourPerModel = 2;
    return hours * modelCount * costPerHourPerModel;
  }
}

