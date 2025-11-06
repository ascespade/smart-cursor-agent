/**
 * Learning Mode - Improves over time by learning from fixes
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { getModeDefinition } from '../types/modes';
import { StorageManager } from '../utils/storage';

export class LearningMode extends BaseMode {
  protected storage: StorageManager;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(context: any, storage?: any, logger?: any) {
    super(context, storage, logger);
    this.storage = storage || new StorageManager(context);
  }

  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    // Get mode definition
    const mode = getModeDefinition('learning');

    // Use AgentCalculator with mode
    const calculator = new AgentCalculator();
    return calculator.calculate(analysis, mode);
  }

  getConfig(): ModeConfig {
    const mode = getModeDefinition('learning');
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
    const mode = getModeDefinition('learning');
    return mode.description;
  }
}
