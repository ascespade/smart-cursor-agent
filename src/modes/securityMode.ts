/**
 * Security Mode - Security-first approach with vulnerability scanning
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { getModeDefinition } from '../types/modes';

export class SecurityMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    // Get mode definition
    const mode = getModeDefinition('security');

    // Use AgentCalculator with mode
    const calculator = new AgentCalculator();
    return calculator.calculate(analysis, mode);
  }

  getConfig(): ModeConfig {
    const mode = getModeDefinition('security');
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
    const mode = getModeDefinition('security');
    return mode.description;
  }
}
