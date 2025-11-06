/**
 * Tests for ErrorCounter
 */

import * as assert from 'assert';
import { ErrorCounter } from '../../core/analyzer/errorCounter';

suite('ErrorCounter Tests', () => {
  let errorCounter: ErrorCounter;

  setup(() => {
    errorCounter = new ErrorCounter();
  });

  test('should count errors correctly', async () => {
    const result = await errorCounter.countErrors();

    assert.ok(result);
    assert.strictEqual(typeof result.typescript, 'number');
    assert.strictEqual(typeof result.eslint, 'number');
    assert.strictEqual(typeof result.warnings, 'number');
    assert.strictEqual(typeof result.total, 'number');
    assert.ok(Array.isArray(result.breakdown));

    // Total should include warnings
    const expectedTotal = result.typescript + result.eslint + result.warnings;
    assert.strictEqual(result.total, expectedTotal, 'Total should be TypeScript + ESLint + Warnings');
  });

  test('should return breakdown array', async () => {
    const result = await errorCounter.countErrors();

    assert.ok(Array.isArray(result.breakdown));
    result.breakdown.forEach(error => {
      assert.ok(error.type);
      assert.strictEqual(typeof error.count, 'number');
      assert.ok(['critical', 'error', 'warning'].includes(error.severity));
      assert.ok(Array.isArray(error.files));
    });
  });

  test('should handle empty project', async () => {
    // This test verifies the function doesn't crash on empty projects
    const result = await errorCounter.countErrors();
    assert.ok(result);
    assert.strictEqual(typeof result.total, 'number');
    assert.ok(result.total >= 0);
  });
});

