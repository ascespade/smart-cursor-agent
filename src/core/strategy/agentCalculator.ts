/**
 * Agent calculator - determines optimal agent count
 */

import { ProjectAnalysis } from '../../types';
import { ConfigManager } from '../../utils/config';

export interface AgentCalculationResult {
  total: number;
  perModel: number;
  reasoning: string[];
}

export class AgentCalculator {
  /**
   * Calculate optimal agent count based on analysis
   */
  calculate(analysis: ProjectAnalysis): AgentCalculationResult {
    const defaultCount = ConfigManager.getDefaultAgentCount();

    if (defaultCount > 0) {
      return {
        total: defaultCount,
        perModel: Math.ceil(defaultCount / 2), // Assume 2 models by default
        reasoning: [`Using configured default agent count: ${defaultCount}`]
      };
    }

    // Calculate based on error count
    const errorBased = this.calculateFromErrors(analysis.errors.total);

    // Calculate based on complexity
    const complexityBased = this.calculateFromComplexity(analysis.complexity);

    // Calculate based on project size
    const sizeBased = this.calculateFromSize(analysis.size.files);

    // Combine factors
    const factors = [errorBased, complexityBased, sizeBased];
    const total = Math.ceil(
      factors.reduce((sum, f) => sum + f, 0) / factors.length
    );

    // Clamp between 2 and 12
    const finalCount = Math.max(2, Math.min(12, total));

    const reasoning = [
      `Error count suggests ${errorBased} agents`,
      `Complexity level (${analysis.complexity}) suggests ${complexityBased} agents`,
      `Project size (${analysis.size.files} files) suggests ${sizeBased} agents`,
      `Calculated optimal: ${finalCount} agents`
    ];

    return {
      total: finalCount,
      perModel: Math.ceil(finalCount / 2),
      reasoning
    };
  }

  /**
   * Calculate agents based on error count
   */
  private calculateFromErrors(errorCount: number): number {
    if (errorCount === 0) return 2;
    if (errorCount < 10) return 2;
    if (errorCount < 50) return 3;
    if (errorCount < 100) return 4;
    if (errorCount < 200) return 6;
    if (errorCount < 500) return 8;
    return 10;
  }

  /**
   * Calculate agents based on complexity
   */
  private calculateFromComplexity(complexity: string): number {
    switch (complexity) {
      case 'low':
        return 2;
      case 'medium':
        return 4;
      case 'high':
        return 6;
      case 'very-high':
        return 8;
      default:
        return 4;
    }
  }

  /**
   * Calculate agents based on project size
   */
  private calculateFromSize(fileCount: number): number {
    if (fileCount < 10) return 2;
    if (fileCount < 50) return 3;
    if (fileCount < 100) return 4;
    if (fileCount < 200) return 6;
    if (fileCount < 500) return 8;
    return 10;
  }
}

