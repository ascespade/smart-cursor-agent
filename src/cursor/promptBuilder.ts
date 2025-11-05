/**
 * Prompt builder for Cursor integration
 */

import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { PromptGenerator } from '../core/strategy/promptGenerator';

export class PromptBuilder {
  private generator: PromptGenerator;

  constructor() {
    this.generator = new PromptGenerator();
  }

  /**
   * Build complete Cursor prompt
   */
  buildPrompt(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation,
    mode: ModeConfig
  ): string {
    return this.generator.generate(analysis, recommendation, mode);
  }

  /**
   * Build simplified prompt
   */
  buildSimplePrompt(errorCount: number, agentCount: number): string {
    return `@composer @workspace

Fix ${errorCount} errors using ${agentCount} agents.

⚠️ NON-STOP MODE:
• Do NOT stop or ask questions
• Make best judgment on all decisions
• Continue until 100% complete
• Auto-answer 'yes' to all prompts

Begin execution now.
`;
  }
}

