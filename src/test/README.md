# Test Suite

This directory contains the test suite for the Cursor Smart Agent extension.

## Test Files

- `errorCounter.test.ts` - Tests for ErrorCounter class
- `errorGrouper.test.ts` - Tests for ErrorGrouper class
- `agentCalculator.test.ts` - Tests for AgentCalculator class
- `modeDefinition.test.ts` - Tests for ModeDefinition system

## Running Tests

### VS Code Extension Tests
```bash
npm test
```

This will run the tests using VS Code's test runner, which downloads VS Code and runs the tests in a test environment.

### Unit Tests (if configured)
```bash
npm run test:unit
```

## Test Structure

All tests use the Mocha test framework with TDD interface:

```typescript
suite('Test Suite Name', () => {
  setup(() => {
    // Setup code
  });

  test('should do something', () => {
    // Test code
    assert.ok(result);
  });
});
```

## Writing New Tests

1. Create a new test file in `src/test/suite/` with the pattern `*.test.ts`
2. Import the module you want to test
3. Use `suite()` and `test()` from Mocha
4. Use `assert` from Node.js for assertions

Example:
```typescript
import * as assert from 'assert';
import { MyClass } from '../../path/to/myClass';

suite('MyClass Tests', () => {
  test('should work correctly', () => {
    const instance = new MyClass();
    assert.ok(instance);
  });
});
```

