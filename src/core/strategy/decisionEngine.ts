/**
 * Decision engine - makes automatic decisions
 */

import { ProjectAnalysis, AgentRecommendation, ExecutionStrategy } from '../../types';
import { ConfigManager } from '../../utils/config';

export class DecisionEngine {
  /**
   * Make execution strategy decisions
   */
  makeStrategy(analysis: ProjectAnalysis, recommendation: AgentRecommendation): ExecutionStrategy {
    const nonStopEnabled = ConfigManager.isNonStopEnabled();
    const confidenceThreshold = ConfigManager.getConfidenceThreshold();

    // Determine execution type
    const type = this.determineExecutionType(analysis, recommendation);

    // Create phases
    const phases = this.createPhases(recommendation, analysis);

    // Determine conflict resolution
    const conflictResolution = nonStopEnabled && confidenceThreshold === 0
      ? 'auto'
      : 'manual';

    return {
      type,
      phases,
      conflictResolution
    };
  }

  /**
   * Determine execution type
   */
  private determineExecutionType(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation
  ): 'sequential' | 'parallel' | 'hybrid' {
    // For large projects with many agents, use parallel
    if (recommendation.total >= 6 && analysis.errors.total > 100) {
      return 'parallel';
    }

    // For smaller projects, use sequential
    if (recommendation.total <= 3 && analysis.errors.total < 50) {
      return 'sequential';
    }

    // Default to hybrid
    return 'hybrid';
  }

  /**
   * Create execution phases
   */
  private createPhases(
    recommendation: AgentRecommendation,
    analysis: ProjectAnalysis
  ): Array<{
    name: string;
    models: string[];
    agents: number;
    estimatedTime: number;
    dependencies: string[];
  }> {
    const phases: Array<{
      name: string;
      models: string[];
      agents: number;
      estimatedTime: number;
      dependencies: string[];
    }> = [];

    if (recommendation.strategy.type === 'sequential') {
      // Sequential: one phase per model
      recommendation.models.forEach((model, index) => {
        phases.push({
          name: `Phase ${index + 1}: ${model.name}`,
          models: [model.name],
          agents: model.agents,
          estimatedTime: this.estimateTime(analysis.errors.total, model.agents),
          dependencies: index > 0 ? [`Phase ${index}`] : []
        });
      });
    } else if (recommendation.strategy.type === 'parallel') {
      // Parallel: all models at once
      phases.push({
        name: 'Phase 1: Parallel Execution',
        models: recommendation.models.map(m => m.name),
        agents: recommendation.total,
        estimatedTime: this.estimateTime(analysis.errors.total, recommendation.total),
        dependencies: []
      });
    } else {
      // Hybrid: group by priority
      const critical = recommendation.models.filter(m => m.priority === 'critical');
      const high = recommendation.models.filter(m => m.priority === 'high');
      const others = recommendation.models.filter(m =>
        m.priority !== 'critical' && m.priority !== 'high'
      );

      if (critical.length > 0) {
        phases.push({
          name: 'Phase 1: Critical Fixes',
          models: critical.map(m => m.name),
          agents: critical.reduce((sum, m) => sum + m.agents, 0),
          estimatedTime: this.estimateTime(analysis.errors.total, critical.reduce((sum, m) => sum + m.agents, 0)),
          dependencies: []
        });
      }

      if (high.length > 0) {
        phases.push({
          name: 'Phase 2: High Priority',
          models: high.map(m => m.name),
          agents: high.reduce((sum, m) => sum + m.agents, 0),
          estimatedTime: this.estimateTime(analysis.errors.total, high.reduce((sum, m) => sum + m.agents, 0)),
          dependencies: phases.length > 0 ? [phases[phases.length - 1].name] : []
        });
      }

      if (others.length > 0) {
        phases.push({
          name: 'Phase 3: Standard Fixes',
          models: others.map(m => m.name),
          agents: others.reduce((sum, m) => sum + m.agents, 0),
          estimatedTime: this.estimateTime(analysis.errors.total, others.reduce((sum, m) => sum + m.agents, 0)),
          dependencies: phases.length > 0 ? [phases[phases.length - 1].name] : []
        });
      }
    }

    return phases;
  }

  /**
   * Estimate time for fixing errors
   */
  private estimateTime(errorCount: number, agentCount: number): number {
    // Rough estimate: 2-5 minutes per error per agent
    const minutesPerError = 3;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;

    // Convert to hours
    return Math.ceil(totalMinutes / 60);
  }

  /**
   * Should ask for confirmation?
   */
  shouldAskConfirmation(analysis: ProjectAnalysis, recommendation: AgentRecommendation): boolean {
    const threshold = ConfigManager.getConfidenceThreshold();

    if (threshold === 0) {
      return false; // Never ask
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(analysis, recommendation);

    return confidence < threshold;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation
  ): number {
    // Base confidence on error count, complexity, and recommendation quality
    let confidence = 80; // Start with 80%

    // Adjust based on error count (more errors = lower confidence)
    if (analysis.errors.total > 500) {
      confidence -= 20;
    } else if (analysis.errors.total > 200) {
      confidence -= 10;
    }

    // Adjust based on complexity
    if (analysis.complexity === 'very-high') {
      confidence -= 15;
    } else if (analysis.complexity === 'high') {
      confidence -= 10;
    }

    // Adjust based on agent count (more agents = lower confidence)
    if (recommendation.total > 8) {
      confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }
}

