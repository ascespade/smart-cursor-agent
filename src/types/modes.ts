/**
 * Type definitions for execution modes
 */

import { ProjectAnalysis, AgentRecommendation, ModeConfig } from './index';

export interface ModeContext {
  analysis: ProjectAnalysis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any;
}

export interface ModeResult {
  recommendation: AgentRecommendation;
  config: ModeConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

export abstract class BaseMode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected context: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected storage: any | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected logger: any | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(context: any, storage?: any, logger?: any) {
    this.context = context;
    this.storage = storage;
    this.logger = logger;
  }

  abstract execute(analysis: ProjectAnalysis): Promise<AgentRecommendation>;
  abstract getConfig(): ModeConfig;
  abstract getDescription(): string;
}

