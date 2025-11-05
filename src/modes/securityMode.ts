/**
 * Security Mode - Security-first approach with vulnerability scanning
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class SecurityMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Calculate agents (slightly more for security)
    const agentCalc = calculator.calculate(analysis);
    const securityAdjustedCount = Math.min(12, agentCalc.total + 1);

    // Select models (prefer Claude for security)
    const models = modelSelector.selectModels(analysis, securityAdjustedCount);

    // Prioritize security-focused models
    const securityModels = models.map(m => {
      if (m.name === 'Claude') {
        m.priority = 'critical';
        m.tasks = [
          ...m.tasks,
          'Security vulnerability scanning',
          'Code security review',
          'Dependency security audit'
        ];
      }
      return m;
    });

    // Estimate time (more time for security checks)
    const estimatedTime = this.estimateTime(analysis.errors.total, securityAdjustedCount);
    const estimatedCost = this.estimateCost(estimatedTime, securityModels.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: securityAdjustedCount,
      perModel: Math.ceil(securityAdjustedCount / securityModels.length),
      models: securityModels,
      strategy: {
        type: 'sequential',
        phases: [],
        conflictResolution: 'manual'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Security Mode: All fixes include security review',
        'Vulnerability scanning enabled',
        'Dependency security audit included',
        'Manual review for critical security issues'
      ],
      confidence: 80
    };

    // Apply strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Security Mode',
      enabled: true,
      settings: {
        nonStop: false,
        autoCommit: false,
        conflictResolution: 'manual',
        confidenceThreshold: 30,
        askQuestions: true,
        securityScan: true,
        securityReview: true
      }
    };
  }

  getDescription(): string {
    return 'Security-first approach with automatic vulnerability scanning and security reviews. Perfect for production code.';
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    // More time for security checks
    const minutesPerError = 4;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3.5; // Slightly higher for security
    return hours * modelCount * costPerHourPerModel;
  }
}

