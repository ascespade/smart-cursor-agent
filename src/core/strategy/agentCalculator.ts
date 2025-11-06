/**
 * Agent calculator - determines optimal agent count
 */

import { ProjectAnalysis, AgentRecommendation, ModelConfig } from '../../types';
import { ModeDefinition } from '../../types/modes';

export interface AgentCalculationResult {
  total: number;
  perModel: number;
  reasoning: string[];
}

export class AgentCalculator {
  /**
   * Calculate optimal agent count based on analysis and mode
   */
  calculate(
    analysis: ProjectAnalysis,
    mode: ModeDefinition
  ): AgentRecommendation {
    // Calculate base agents (1-4)
    const baseAgents = this.calculateBaseAgents(analysis.errors.total);

    // Maximum: 4 agents per model
    const agentsPerModel = Math.min(4, baseAgents);

    // Total agents = agents per model × number of models
    const totalAgents = agentsPerModel * mode.modelCount;

    // Select models based on mode
    const models = this.selectModels(mode, agentsPerModel);

    // Calculate time and cost
    const estimatedTime = this.calculateTime(analysis.errors.total, totalAgents);
    const estimatedCost = this.calculateCost(totalAgents, mode);

    // Generate reasoning
    const reasoning = this.generateReasoning(analysis, mode, agentsPerModel);

    return {
      total: totalAgents,
      perModel: agentsPerModel,
      models: models,
      strategy: {
        type: mode.modelCount > 1 ? 'parallel' : 'sequential',
        phases: this.generatePhases(models),
        conflictResolution: 'auto'
      },
      estimatedTime: estimatedTime,
      estimatedCost: estimatedCost,
      reasoning: reasoning,
      confidence: this.calculateConfidence(analysis)
    };
  }

  /**
   * Calculate base agents (1-4) based on error count
   */
  private calculateBaseAgents(errorCount: number): number {
    if (errorCount < 50) return 1;
    if (errorCount < 150) return 2;
    if (errorCount < 400) return 3;
    return 4; // Maximum
  }

  /**
   * Select models based on mode
   */
  private selectModels(mode: ModeDefinition, agentsPerModel: number): ModelConfig[] {
    const allModels: Array<'ChatGPT' | 'Claude' | 'DeepSeek' | 'Gemini'> =
      ['ChatGPT', 'Claude', 'DeepSeek', 'Gemini'];

    const selectedModels = allModels.slice(0, mode.modelCount);

    return selectedModels.map((name, index) => ({
      name: name,
      agents: agentsPerModel,
      tasks: this.assignTasks(name, index, mode.modelCount),
      priority: this.assignPriority(index, mode.modelCount),
      branch: `agent-${name.toLowerCase()}-${Date.now()}`
    }));
  }

  /**
   * Assign tasks to models
   */
  private assignTasks(
    modelName: string,
    index: number,
    totalModels: number
  ): string[] {
    const allTasks = [
      'TypeScript errors',
      'ESLint errors',
      'Warnings',
      'Code formatting',
      'Import fixes',
      'Type definitions',
      'Test fixes',
      'Documentation'
    ];

    if (totalModels === 1) {
      return allTasks.slice(0, 5); // First 5 tasks
    }

    // Distribute tasks evenly
    const tasksPerModel = Math.ceil(allTasks.length / totalModels);
    const start = index * tasksPerModel;
    const end = start + tasksPerModel;

    return allTasks.slice(start, end);
  }

  /**
   * Assign priority
   */
  private assignPriority(
    index: number,
    _totalModels: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (index === 0) return 'critical';
    if (index === 1) return 'high';
    if (index === 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate estimated time (in minutes)
   */
  private calculateTime(errorCount: number, totalAgents: number): number {
    // Base: 2 minutes per error
    const baseTime = errorCount * 2;

    // Reduce time based on parallel processing
    const timeWithParallelism = baseTime / Math.sqrt(totalAgents);

    return Math.max(5, Math.round(timeWithParallelism));
  }

  /**
   * Calculate estimated cost (in USD)
   */
  private calculateCost(totalAgents: number, mode: ModeDefinition): number {
    if (mode.cost === 'free') return 0;

    // Estimate: $0.50 per agent in Multi-Model Mode
    const costPerAgent = 0.5;

    return totalAgents * costPerAgent;
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    analysis: ProjectAnalysis,
    mode: ModeDefinition,
    agentsPerModel: number
  ): string[] {
    const reasons: string[] = [];

    // Agent count reason
    reasons.push(
      `${agentsPerModel} agents per model based on ${analysis.errors.total} total issues`
    );

    // Model count reason
    if (mode.modelCount === 1) {
      reasons.push(
        'Single model (Auto Mode) - Cursor will intelligently switch between AI models'
      );
    } else {
      reasons.push(
        `${mode.modelCount} models for ${mode.modelCount === 2 ? 'balanced' : mode.modelCount === 3 ? 'comprehensive' : 'maximum'} coverage`
      );
    }

    // Cost reason
    if (mode.cost === 'free') {
      reasons.push('Free mode - included in your Cursor subscription');
    } else {
      reasons.push('Multi-Model Mode requires API credits');
    }

    // Complexity reason
    if (analysis.complexity === 'high' || analysis.complexity === 'very-high') {
      reasons.push('High complexity detected - using maximum agents per model');
    }

    // Error density reason
    if (analysis.errorDensity > 0.1) {
      reasons.push(`High error density (${(analysis.errorDensity * 100).toFixed(1)}%) - needs thorough analysis`);
    }

    return reasons;
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(analysis: ProjectAnalysis): number {
    let confidence = 80; // Base confidence

    // Reduce confidence for very complex projects
    if (analysis.complexity === 'very-high') confidence -= 20;
    else if (analysis.complexity === 'high') confidence -= 10;

    // Increase confidence for small projects
    if (analysis.errors.total < 100) confidence += 10;

    return Math.max(50, Math.min(95, confidence));
  }

  /**
   * Generate phases
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generatePhases(models: ModelConfig[]): any[] {
    if (models.length === 1) {
      return [{
        name: 'Single Phase',
        models: [models[0].name],
        agents: models[0].agents,
        estimatedTime: 0,
        dependencies: []
      }];
    }

    return [{
      name: 'Parallel Execution',
      models: models.map(m => m.name),
      agents: models.reduce((sum, m) => sum + m.agents, 0),
      estimatedTime: 0,
      dependencies: []
    }];
  }
}

