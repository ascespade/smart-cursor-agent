/**
 * Tests for AgentCalculator
 */

import * as assert from 'assert';
import { AgentCalculator } from '../../core/strategy/agentCalculator';
import { ProjectAnalysis } from '../../types';
import { getModeDefinition } from '../../types/modes';

suite('AgentCalculator Tests', () => {
  let calculator: AgentCalculator;

  setup(() => {
    calculator = new AgentCalculator();
  });

  test('should calculate agents for auto mode', () => {
    const analysis: ProjectAnalysis = {
      errors: {
        typescript: 10,
        eslint: 5,
        warnings: 3,
        total: 18,
        breakdown: []
      },
      size: {
        files: 50,
        linesOfCode: 5000,
        testFiles: 10
      },
      dependencies: {
        total: 20,
        dev: 10,
        prod: 10,
        outdated: 2
      },
      complexity: 'medium',
      errorDensity: 3.6,
      timestamp: new Date(),
      projectType: 'development'
    };

    const mode = getModeDefinition('auto');
    const recommendation = calculator.calculate(analysis, mode);

    assert.ok(recommendation);
    assert.strictEqual(typeof recommendation.total, 'number');
    assert.strictEqual(typeof recommendation.perModel, 'number');
    assert.ok(Array.isArray(recommendation.models));
    assert.strictEqual(typeof recommendation.estimatedTime, 'number');
    assert.strictEqual(typeof recommendation.estimatedCost, 'number');
    assert.ok(Array.isArray(recommendation.reasoning));
    assert.strictEqual(typeof recommendation.confidence, 'number');

    // Auto mode should have 1 model, max 4 agents
    assert.ok(recommendation.perModel <= 4, 'Should not exceed 4 agents per model');
    assert.strictEqual(recommendation.total, recommendation.perModel * mode.modelCount);
  });

  test('should calculate agents for smart mode', () => {
    const analysis: ProjectAnalysis = {
      errors: {
        typescript: 50,
        eslint: 20,
        warnings: 10,
        total: 80,
        breakdown: []
      },
      size: {
        files: 100,
        linesOfCode: 10000,
        testFiles: 20
      },
      dependencies: {
        total: 30,
        dev: 15,
        prod: 15,
        outdated: 3
      },
      complexity: 'high',
      errorDensity: 8.0,
      timestamp: new Date(),
      projectType: 'production'
    };

    const mode = getModeDefinition('smart');
    const recommendation = calculator.calculate(analysis, mode);

    assert.ok(recommendation);
    assert.ok(recommendation.perModel <= 4, 'Should not exceed 4 agents per model');
    assert.strictEqual(recommendation.total, recommendation.perModel * mode.modelCount);
    assert.ok(recommendation.total <= mode.maxAgents, 'Should not exceed mode maxAgents');
  });

  test('should limit agents to 4 per model', () => {
    const analysis: ProjectAnalysis = {
      errors: {
        typescript: 1000,
        eslint: 500,
        warnings: 200,
        total: 1700,
        breakdown: []
      },
      size: {
        files: 500,
        linesOfCode: 50000,
        testFiles: 100
      },
      dependencies: {
        total: 50,
        dev: 25,
        prod: 25,
        outdated: 5
      },
      complexity: 'very-high',
      errorDensity: 34.0,
      timestamp: new Date(),
      projectType: 'production'
    };

    const mode = getModeDefinition('auto');
    const recommendation = calculator.calculate(analysis, mode);

    assert.ok(recommendation.perModel <= 4, 'Should not exceed 4 agents per model even for large projects');
  });

  test('should calculate total agents correctly', () => {
    const analysis: ProjectAnalysis = {
      errors: {
        typescript: 20,
        eslint: 10,
        warnings: 5,
        total: 35,
        breakdown: []
      },
      size: {
        files: 30,
        linesOfCode: 3000,
        testFiles: 5
      },
      dependencies: {
        total: 15,
        dev: 7,
        prod: 8,
        outdated: 1
      },
      complexity: 'low',
      errorDensity: 11.67,
      timestamp: new Date(),
      projectType: 'development'
    };

    const mode = getModeDefinition('super');
    const recommendation = calculator.calculate(analysis, mode);

    // Super mode has 4 models
    assert.strictEqual(mode.modelCount, 4);
    assert.strictEqual(recommendation.total, recommendation.perModel * 4);
    assert.ok(recommendation.total <= mode.maxAgents);
  });
});

