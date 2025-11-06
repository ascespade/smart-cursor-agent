/**
 * Prompt builder for Cursor integration
 */

import { ProjectAnalysis, AgentRecommendation } from '../types';
import { ModeDefinition } from '../types/modes';
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
    mode: ModeDefinition
  ): string {
    // Calculate actual total
    const actualTotal = analysis.errors.typescript + analysis.errors.eslint + analysis.errors.warnings;

    let prompt = '@composer @workspace\n\n';
    prompt += '━'.repeat(80) + '\n';
    prompt += '🎯 CURSOR SMART AGENT - AUTO-GENERATED PROMPT\n';
    prompt += '━'.repeat(80) + '\n\n';

    // Mode information
    prompt += `**Mode:** ${mode.displayName}\n`;
    prompt += `**Models:** ${mode.modelCount} model${mode.modelCount > 1 ? 's' : ''}\n`;
    prompt += `**Cost:** ${mode.cost === 'free' ? 'FREE (Cursor subscription)' : 'PAID (requires API credits)'}\n\n`;

    // Errors
    prompt += '📊 PROJECT ANALYSIS:\n';
    prompt += `- TypeScript Errors: ${analysis.errors.typescript}\n`;
    prompt += `- ESLint Errors: ${analysis.errors.eslint}\n`;
    prompt += `- Warnings: ${analysis.errors.warnings}\n`;
    prompt += `- **Total Issues: ${actualTotal}**\n\n`;

    // Strategy
    prompt += '🎯 STRATEGY:\n';
    prompt += `- Total Agents: ${recommendation.total}\n`;
    prompt += `- Agents per Model: ${recommendation.perModel}\n`;
    prompt += `- Execution: ${recommendation.strategy.type}\n`;
    prompt += `- Estimated Time: ${Math.round(recommendation.estimatedTime)} minutes\n\n`;

    // Model distribution
    if (mode.modelCount > 1) {
      prompt += '🤖 MODEL DISTRIBUTION:\n\n';
      recommendation.models.forEach((model, i) => {
        prompt += `**${i + 1}. ${model.name}** (${model.agents} agents - ${model.priority} priority)\n`;
        prompt += `   Tasks: ${model.tasks.join(', ')}\n`;
        prompt += `   Branch: ${model.branch}\n\n`;
      });
    }

    // Execution rules
    prompt += '⚠️ EXECUTION RULES:\n\n';

    if (mode.name === 'non-stop') {
      prompt += '🚫 **NON-STOP MODE ACTIVE:**\n';
      prompt += '- Do NOT stop or ask questions\n';
      prompt += '- Make best judgment on all decisions\n';
      prompt += '- Continue until 100% complete\n';
      prompt += '- Auto-answer "yes" to continuation prompts\n\n';
    }

    prompt += '✅ REQUIRED ACTIONS:\n';
    prompt += '1. Fix all TypeScript errors\n';
    prompt += '2. Fix all ESLint errors\n';
    prompt += '3. Resolve all warnings\n';
    prompt += '4. Ensure code compiles without errors\n';
    prompt += '5. Maintain code quality and style\n\n';

    if (mode.modelCount > 1) {
      prompt += '🔀 MULTI-MODEL COORDINATION:\n';
      prompt += '- Each model works on assigned tasks\n';
      prompt += '- Coordinate changes to avoid conflicts\n';
      prompt += '- Merge changes systematically\n\n';
    }

    prompt += '📋 PROGRESS REPORTING:\n';
    prompt += '- Report every 10-20 fixes\n';
    prompt += '- Show percentage complete\n';
    prompt += '- List remaining issues\n\n';

    prompt += '━'.repeat(80) + '\n';
    prompt += '🚀 BEGIN EXECUTION NOW\n';
    prompt += '━'.repeat(80) + '\n';

    return prompt;
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

