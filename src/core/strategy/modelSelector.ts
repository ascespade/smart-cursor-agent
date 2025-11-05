/**
 * Model selector - chooses optimal AI models
 */

import { ProjectAnalysis, ModelConfig } from '../../types';
import { ConfigManager } from '../../utils/config';

export class ModelSelector {
  /**
   * Select models based on analysis and preferences
   */
  selectModels(analysis: ProjectAnalysis, agentCount: number): ModelConfig[] {
    const preferredModels = ConfigManager.getPreferredModels();
    const availableModels: Array<'ChatGPT' | 'Claude' | 'DeepSeek' | 'Gemini'> =
      ['ChatGPT', 'Claude', 'DeepSeek', 'Gemini'];

    // Filter to preferred models if specified
    const modelsToUse = preferredModels.length > 0
      ? availableModels.filter(m => preferredModels.includes(m))
      : availableModels;

    // Determine how many models to use
    const modelCount = Math.min(modelsToUse.length, Math.ceil(agentCount / 3));

    // Distribute agents across models
    const agentsPerModel = Math.ceil(agentCount / modelCount);
    const models: ModelConfig[] = [];

    for (let i = 0; i < modelCount; i++) {
      const modelName = modelsToUse[i % modelsToUse.length];
      const agents = i === modelCount - 1
        ? agentCount - (agentsPerModel * (modelCount - 1))
        : agentsPerModel;

      const priority = this.determinePriority(analysis, modelName);
      const tasks = this.assignTasks(analysis, modelName, agents);

      models.push({
        name: modelName,
        agents,
        tasks,
        priority,
        branch: `agent-${modelName.toLowerCase()}-${i + 1}`
      });
    }

    return models;
  }

  /**
   * Determine priority for a model
   */
  private determinePriority(
    analysis: ProjectAnalysis,
    modelName: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    // ChatGPT good for general code fixes
    // Claude good for complex refactoring
    // DeepSeek good for cost-effective bulk fixes
    // Gemini good for diverse perspectives

    if (analysis.errors.total > 200) {
      return 'critical';
    } else if (analysis.errors.total > 100) {
      return 'high';
    } else if (analysis.errors.total > 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Assign tasks to a model
   */
  private assignTasks(
    analysis: ProjectAnalysis,
    modelName: string,
    agentCount: number
  ): string[] {
    const tasks: string[] = [];

    // Distribute errors across agents
    const errorsPerAgent = Math.ceil(analysis.errors.total / agentCount);

    if (modelName === 'ChatGPT') {
      tasks.push(`Fix TypeScript errors (${errorsPerAgent} errors)`);
      tasks.push('Improve code quality');
    } else if (modelName === 'Claude') {
      tasks.push(`Refactor complex code (${errorsPerAgent} errors)`);
      tasks.push('Improve architecture');
    } else if (modelName === 'DeepSeek') {
      tasks.push(`Bulk fix ESLint errors (${errorsPerAgent} errors)`);
      tasks.push('Code cleanup');
    } else if (modelName === 'Gemini') {
      tasks.push(`Fix diverse errors (${errorsPerAgent} errors)`);
      tasks.push('Code review and improvements');
    }

    return tasks;
  }
}

