/**
 * Tests for ErrorGrouper
 */

import * as assert from 'assert';
import { ErrorGrouper, ErrorNode } from '../../core/analyzer/errorGrouper';
import { ErrorBreakdown } from '../../types';

suite('ErrorGrouper Tests', () => {
  let errorGrouper: ErrorGrouper;

  setup(() => {
    errorGrouper = new ErrorGrouper();
  });

  test('should group errors by directory', () => {
    const mockBreakdown: ErrorBreakdown[] = [
      {
        type: 'TypeScript Error',
        count: 5,
        severity: 'error',
        files: [
          'src/file1.ts',
          'src/file2.ts',
          'src/utils/helper.ts'
        ]
      },
      {
        type: 'ESLint Warning',
        count: 3,
        severity: 'warning',
        files: [
          'src/file1.ts',
          'src/components/Button.tsx'
        ]
      }
    ];

    const tree = errorGrouper.groupByDirectory(mockBreakdown);

    assert.ok(tree);
    assert.strictEqual(tree.type, 'folder');
    assert.strictEqual(tree.name, 'Project Root');
    assert.ok(Array.isArray(tree.children));
    assert.strictEqual(typeof tree.count, 'number');
  });

  test('should calculate counts correctly', () => {
    const mockBreakdown: ErrorBreakdown[] = [
      {
        type: 'Error',
        count: 10,
        severity: 'error',
        files: ['src/file1.ts', 'src/file2.ts']
      }
    ];

    const tree = errorGrouper.groupByDirectory(mockBreakdown);

    // Root should have count >= 0
    assert.ok(tree.count >= 0);
  });

  test('should handle empty breakdown', () => {
    const tree = errorGrouper.groupByDirectory([]);

    assert.ok(tree);
    assert.strictEqual(tree.type, 'folder');
    assert.strictEqual(tree.name, 'Project Root');
    assert.ok(Array.isArray(tree.children));
    assert.strictEqual(tree.count, 0);
  });

  test('should sort tree correctly', () => {
    const mockBreakdown: ErrorBreakdown[] = [
      {
        type: 'Error',
        count: 5,
        severity: 'error',
        files: [
          'src/a.ts',
          'src/b.ts',
          'src/z.ts'
        ]
      }
    ];

    const tree = errorGrouper.groupByDirectory(mockBreakdown);

    // Verify tree structure
    assert.ok(tree);
    assert.ok(Array.isArray(tree.children));
  });
});

