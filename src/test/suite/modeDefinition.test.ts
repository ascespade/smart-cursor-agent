/**
 * Tests for ModeDefinition
 */

import * as assert from 'assert';
import { MODE_DEFINITIONS, getModeDefinition } from '../../types/modes';

suite('ModeDefinition Tests', () => {
  test('should have all 8 modes defined', () => {
    const expectedModes = ['auto', 'smart', 'security', 'super', 'lazy', 'non-stop', 'learning', 'simulation'];

    expectedModes.forEach(modeName => {
      assert.ok(MODE_DEFINITIONS[modeName], `Mode ${modeName} should be defined`);
      const mode = MODE_DEFINITIONS[modeName];

      assert.ok(mode.name);
      assert.ok(mode.displayName);
      assert.ok(mode.description);
      assert.strictEqual(typeof mode.modelCount, 'number');
      assert.strictEqual(typeof mode.maxAgents, 'number');
      assert.ok(['free', 'paid'].includes(mode.cost));
      assert.ok(Array.isArray(mode.features));
    });
  });

  test('should validate mode properties', () => {
    Object.values(MODE_DEFINITIONS).forEach(mode => {
      assert.ok(mode.modelCount >= 1 && mode.modelCount <= 4, 'modelCount should be between 1 and 4');
      assert.ok(mode.maxAgents > 0, 'maxAgents should be positive');
      assert.strictEqual(mode.maxAgents, mode.modelCount * 4, 'maxAgents should equal modelCount * 4');
      assert.ok(mode.features.length > 0, 'Each mode should have at least one feature');
    });
  });

  test('getModeDefinition should return correct mode', () => {
    const autoMode = getModeDefinition('auto');
    assert.strictEqual(autoMode.name, 'auto');
    assert.strictEqual(autoMode.modelCount, 1);
    assert.strictEqual(autoMode.maxAgents, 4);
    assert.strictEqual(autoMode.cost, 'free');
  });

  test('getModeDefinition should return auto mode for invalid mode', () => {
    const invalidMode = getModeDefinition('invalid-mode-name');
    assert.strictEqual(invalidMode.name, 'auto');
  });

  test('should have correct model counts', () => {
    assert.strictEqual(MODE_DEFINITIONS.auto.modelCount, 1);
    assert.strictEqual(MODE_DEFINITIONS.smart.modelCount, 2);
    assert.strictEqual(MODE_DEFINITIONS.super.modelCount, 4);
  });

  test('should have correct cost assignments', () => {
    const freeModes = ['auto', 'lazy'];
    const paidModes = ['smart', 'security', 'super', 'non-stop', 'learning', 'simulation'];

    freeModes.forEach(modeName => {
      assert.strictEqual(MODE_DEFINITIONS[modeName].cost, 'free', `${modeName} should be free`);
    });

    paidModes.forEach(modeName => {
      assert.strictEqual(MODE_DEFINITIONS[modeName].cost, 'paid', `${modeName} should be paid`);
    });
  });
});

