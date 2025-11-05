/**
 * Smart Developer Mode - Context-aware suggestions
 */

import { BaseMode } from '../types/modes';
import { ProjectAnalysis, AgentRecommendation, ModeConfig } from '../types';
import { AgentCalculator } from '../core/strategy/agentCalculator';
import { ModelSelector } from '../core/strategy/modelSelector';
import { DecisionEngine } from '../core/strategy/decisionEngine';

export class SmartDevMode extends BaseMode {
  async execute(analysis: ProjectAnalysis): Promise<AgentRecommendation> {
    const calculator = new AgentCalculator();
    const modelSelector = new ModelSelector();
    const decisionEngine = new DecisionEngine();

    // Calculate agents with smart adjustments
    const agentCalc = calculator.calculate(analysis);
    const smartCount = this.smartAdjustCount(agentCalc.total, analysis);

    // Select models with smart distribution
    const models = modelSelector.selectModels(analysis, smartCount);

    // Add smart tasks
    const smartModels = models.map(m => ({
      ...m,
      tasks: [
        ...m.tasks,
        'Proactive error prevention',
        'Code quality improvements',
        'Pattern recognition and refactoring',
        'Context-aware suggestions'
      ]
    }));

    // Estimate time and cost
    const estimatedTime = this.estimateTime(analysis.errors.total, smartCount);
    const estimatedCost = this.estimateCost(estimatedTime, smartModels.length);

    // Create recommendation
    const recommendation: AgentRecommendation = {
      total: smartCount,
      perModel: Math.ceil(smartCount / smartModels.length),
      models: smartModels,
      strategy: {
        type: 'hybrid',
        phases: [],
        conflictResolution: 'auto'
      },
      estimatedTime,
      estimatedCost,
      reasoning: [
        ...agentCalc.reasoning,
        'Smart Dev Mode: Context-aware suggestions and proactive fixes',
        'Agents understand project context and patterns',
        'Prevents errors before they occur',
        'Adaptive strategy based on codebase patterns'
      ],
      confidence: 85
    };

    // Apply strategy
    recommendation.strategy = decisionEngine.makeStrategy(analysis, recommendation);

    return recommendation;
  }

  getConfig(): ModeConfig {
    return {
      name: 'Smart Developer Mode',
      enabled: true,
      settings: {
        nonStop: false,
        autoCommit: true,
        conflictResolution: 'auto',
        confidenceThreshold: 10,
        askQuestions: true,
        proactiveSuggestions: true,
        contextAware: true,
        patternRecognition: true
      }
    };
  }

  getDescription(): string {
    return 'Context-aware mode with proactive suggestions and error prevention. Perfect for daily development with intelligent assistance.';
  }

  private smartAdjustCount(calculated: number, analysis: ProjectAnalysis): number {
    // Adjust based on project characteristics
    let adjusted = calculated;

    // More agents for complex projects
    if (analysis.complexity === 'very-high') {
      adjusted += 2;
    } else if (analysis.complexity === 'high') {
      adjusted += 1;
    }

    // More agents for large projects
    if (analysis.size.files > 200) {
      adjusted += 1;
    }

    return Math.min(12, Math.max(2, adjusted));
  }

  private estimateTime(errorCount: number, agentCount: number): number {
    const minutesPerError = 3;
    const totalMinutes = (errorCount / agentCount) * minutesPerError;
    return Math.ceil(totalMinutes / 60);
  }

  private estimateCost(hours: number, modelCount: number): number {
    const costPerHourPerModel = 3;
    return hours * modelCount * costPerHourPerModel;
  }
}

