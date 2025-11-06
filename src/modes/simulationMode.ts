/**
 * Simulation Mode - Preview changes without applying
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { getModeDefinition } from '../types/modes';

export class SimulationMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    // Get mode definition
    const mode = getModeDefinition('simulation');

    // Use AgentCalculator with mode
    const calculator = new AgentCalculator();
    return calculator.calculate(analysis, mode);
  }

  getConfig(): ModeConfig {
    const mode = getModeDefinition('simulation');
    return {
      name: mode.name,
      enabled: true,
      settings: {
        modelCount: mode.modelCount,
        maxAgents: mode.maxAgents,
        cost: mode.cost
      }
    };
  }

  getDescription(): string {
    const mode = getModeDefinition('simulation');
    return mode.description;
  }
}
