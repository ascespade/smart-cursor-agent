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

/**
 * Mode definition - describes a mode's capabilities and limits
 */
export interface ModeDefinition {
  name: string;
  displayName: string;
  description: string;
  modelCount: number;
  maxAgents: number;
  cost: 'free' | 'paid';
  features: string[];
}

/**
 * All available mode definitions
 */
export const MODE_DEFINITIONS: Record<string, ModeDefinition> = {
  auto: {
    name: 'auto',
    displayName: '🧠 Auto Mode',
    description: 'Single model, Cursor auto-switches between AI models',
    modelCount: 1,
    maxAgents: 4,
    cost: 'free',
    features: [
      'Free with Cursor subscription',
      'Cursor intelligently switches models',
      '1-4 agents on one model',
      'Best for most projects'
    ]
  },

  smart: {
    name: 'smart',
    displayName: '🎓 Smart Developer',
    description: '2 models for context-aware development',
    modelCount: 2,
    maxAgents: 8,
    cost: 'paid',
    features: [
      'ChatGPT + Claude',
      'Context-aware suggestions',
      'Up to 8 agents (4 per model)',
      'Requires API credits'
    ]
  },

  security: {
    name: 'security',
    displayName: '🔒 Security Mode',
    description: '3 models for comprehensive security scanning',
    modelCount: 3,
    maxAgents: 12,
    cost: 'paid',
    features: [
      'Claude + GPT + DeepSeek',
      'Multi-layer security analysis',
      'Up to 12 agents (4 per model)',
      'Requires API credits'
    ]
  },

  super: {
    name: 'super',
    displayName: '🦸 Super Developer',
    description: '4 models for maximum power',
    modelCount: 4,
    maxAgents: 16,
    cost: 'paid',
    features: [
      'All 4 models simultaneously',
      'Multi-project orchestration',
      'Up to 16 agents (4 per model)',
      'Highest API cost'
    ]
  },

  lazy: {
    name: 'lazy',
    displayName: '😴 Lazy Developer',
    description: 'Minimal input, maximum output',
    modelCount: 2,
    maxAgents: 8,
    cost: 'paid',
    features: [
      '2 models',
      'Builds from description',
      'Up to 8 agents',
      'Requires API credits'
    ]
  },

  'non-stop': {
    name: 'non-stop',
    displayName: '🤖 Non-Stop Mode',
    description: 'Continuous execution without questions',
    modelCount: 2,
    maxAgents: 8,
    cost: 'paid',
    features: [
      '2 models',
      'Zero interruptions',
      'Auto-decision making',
      'Requires API credits'
    ]
  },

  learning: {
    name: 'learning',
    displayName: '📚 Learning Mode',
    description: 'Improves over time',
    modelCount: 1,
    maxAgents: 4,
    cost: 'free',
    features: [
      'Free mode',
      'Pattern recognition',
      'Adapts to your style',
      '1 model with learning'
    ]
  },

  simulation: {
    name: 'simulation',
    displayName: '🎮 Simulation Mode',
    description: 'Preview changes without applying',
    modelCount: 1,
    maxAgents: 4,
    cost: 'free',
    features: [
      'Free mode',
      'Dry-run testing',
      'Safe preview',
      'No actual changes'
    ]
  }
};

/**
 * Get mode definition by name
 */
export function getModeDefinition(modeName: string): ModeDefinition {
  return MODE_DEFINITIONS[modeName] || MODE_DEFINITIONS.auto;
}

