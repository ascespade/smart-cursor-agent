/**
 * Prompt generator - creates Cursor prompts
 */

import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../../types';

export class PromptGenerator {
  /**
   * Generate a prompt for Cursor
   */
  generate(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation,
    mode: ModeConfig
  ): string {
    let prompt = '@composer @workspace\n\n';

    // Add mode-specific instructions
    if (mode.settings.nonStop) {
      prompt += this.addNonStopInstructions();
    }

    // Add project analysis
    prompt += this.addAnalysisSummary(analysis);

    // Add strategy
    prompt += this.addStrategy(recommendation);

    // Add execution rules
    prompt += this.addExecutionRules(mode);

    // Add objectives
    prompt += this.addObjectives(analysis);

    return prompt;
  }

  /**
   * Add non-stop instructions
   */
  private addNonStopInstructions(): string {
    return `⚠️ CRITICAL: NON-STOP MODE ENABLED

• Do NOT stop or ask questions
• Make best judgment on all decisions
• Continue until 100% complete
• Auto-answer 'yes' to all continuation prompts
• Report progress but don't wait for approval

`;
  }

  /**
   * Add analysis summary
   */
  private addAnalysisSummary(analysis: ProjectAnalysis): string {
    return `📊 PROJECT ANALYSIS:

• Errors: ${analysis.errors.total} total
  - TypeScript: ${analysis.errors.typescript}
  - ESLint: ${analysis.errors.eslint}
  - Warnings: ${analysis.errors.warnings}

• Project Size:
  - Files: ${analysis.size.files}
  - Lines of Code: ${analysis.size.linesOfCode.toLocaleString()}
  - Test Files: ${analysis.size.testFiles}

• Complexity: ${analysis.complexity}
• Error Density: ${analysis.errorDensity} errors per 1000 LOC
• Project Type: ${analysis.projectType}

`;
  }

  /**
   * Add strategy
   */
  private addStrategy(recommendation: AgentRecommendation): string {
    let strategy = `🎯 EXECUTION STRATEGY:

• Total Agents: ${recommendation.total}
• Models: ${recommendation.models.length}
• Estimated Time: ${recommendation.estimatedTime} hours
• Estimated Cost: $${recommendation.estimatedCost.toFixed(2)}
• Confidence: ${recommendation.confidence}%

🤖 AGENT DISTRIBUTION:

`;

    recommendation.models.forEach((model, index) => {
      strategy += `${index + 1}. ${model.name} (${model.agents} agents) - ${model.priority} priority
   Branch: ${model.branch}
   Tasks: ${model.tasks.join(', ')}

`;
    });

    strategy += `\n📋 EXECUTION PHASES:\n\n`;
    recommendation.strategy.phases.forEach((phase, index) => {
      strategy += `Phase ${index + 1}: ${phase.name}
   Models: ${phase.models.join(', ')}
   Agents: ${phase.agents}
   Time: ${phase.estimatedTime} hours
   Dependencies: ${phase.dependencies.length > 0 ? phase.dependencies.join(', ') : 'None'}

`;
    });

    return strategy;
  }

  /**
   * Add execution rules
   */
  private addExecutionRules(mode: ModeConfig): string {
    let rules = `⚙️ EXECUTION RULES:

• Mode: ${mode.name}
• Conflict Resolution: ${mode.settings.conflictResolution || 'auto'}

`;

    if (mode.settings.nonStop) {
      rules += `• Non-Stop: Enabled (no interruptions)
`;
    }

    if (mode.settings.autoCommit) {
      rules += `• Auto-Commit: Enabled
`;
    }

    if (mode.settings.securityScan) {
      rules += `• Security Scan: Enabled
`;
    }

    return rules + '\n';
  }

  /**
   * Add objectives
   */
  private addObjectives(analysis: ProjectAnalysis): string {
    return `🎯 OBJECTIVES:

1. Fix all ${analysis.errors.typescript} TypeScript errors
2. Fix all ${analysis.errors.eslint} ESLint errors
3. Address ${analysis.errors.warnings} warnings where appropriate
4. Maintain code quality and best practices
5. Preserve existing functionality
6. Add appropriate error handling
7. Improve code readability where possible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEGIN EXECUTION NOW. Work systematically through all errors.
Report progress every 20-30 minutes.

`;
  }
}

