/**
 * Type definitions for execution modes
 */

import { ProjectAnalysis, AgentRecommendation, ModeConfig } from './index';

export interface ModeContext {
  analysis: ProjectAnalysis;
  storage: any;
  logger: any;
}

export interface ModeResult {
  recommendation: AgentRecommendation;
  config: ModeConfig;
  metadata: Record<string, any>;
}

export abstract class BaseMode {
  protected context: any;
  protected storage: any | undefined;
  protected logger: any | undefined;

  constructor(context: any, storage?: any, logger?: any) {
    this.context = context;
    this.storage = storage;
    this.logger = logger;
  }

  abstract execute(analysis: ProjectAnalysis): Promise<AgentRecommendation>;
  abstract getConfig(): ModeConfig;
  abstract getDescription(): string;
}

