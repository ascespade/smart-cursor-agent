# Extension API Documentation

This extension exposes an API that can be used by external agents (like Cursor AI) to call extension functions and get results.

## Usage

### Method 1: Using VS Code Commands

You can call API methods through VS Code commands:

```typescript
// In VS Code extension or Cursor AI context
const result = await vscode.commands.executeCommand('smartAgent.api.analyze');
console.log(result); // { success: true, data: {...}, timestamp: ... }
```

### Method 2: Using the API Module Directly

```typescript
import { extensionAPI } from 'cursor-smart-agent/api';

// Initialize (done automatically by extension)
extensionAPI.initialize(context, storage, logger);

// Call methods
const result = await extensionAPI.analyzeProject();
```

### Method 3: Generic API Call

```typescript
import { callExtensionAPI } from 'cursor-smart-agent/api';

const result = await callExtensionAPI('analyzeProject');
const stats = await callExtensionAPI('getProjectStats', { forceRefresh: true });
```

## Available API Methods

### 1. `analyzeProject()`

Analyzes the current project and returns analysis results.

**Returns:** `ApiResponse<ProjectAnalysis>`

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.analyze');
if (result.success) {
  console.log('Files:', result.data.metrics.files);
  console.log('Errors:', result.data.errors.total);
}
```

### 2. `calculateAgents(analysis?)`

Calculates agent recommendation based on project analysis.

**Parameters:**
- `analysis` (optional): ProjectAnalysis object. If not provided, will analyze first.

**Returns:** `ApiResponse<AgentRecommendation>`

```typescript
const result = await vscode.commands.executeCommand(
  'smartAgent.api.calculateAgents',
  analysis // optional
);
```

### 3. `getAnalysis(forceRefresh?)`

Gets cached project analysis or performs fresh analysis.

**Parameters:**
- `forceRefresh` (optional, default: false): Force fresh analysis

**Returns:** `ApiResponse<ProjectAnalysis | null>`

```typescript
// Get cached
const result = await vscode.commands.executeCommand('smartAgent.api.getAnalysis');

// Force refresh
const fresh = await vscode.commands.executeCommand(
  'smartAgent.api.getAnalysis',
  true
);
```

### 4. `getRecommendation(forceRefresh?)`

Gets cached agent recommendation or calculates fresh one.

**Parameters:**
- `forceRefresh` (optional, default: false): Force fresh calculation

**Returns:** `ApiResponse<AgentRecommendation | null>`

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.getRecommendation');
```

### 5. `securityScan()`

Runs security scan on the project.

**Returns:** `ApiResponse<{ vulnerabilities: number, secrets: number, issues: string[] }>`

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.securityScan');
if (result.success) {
  console.log('Vulnerabilities:', result.data.vulnerabilities);
  console.log('Secrets found:', result.data.secrets);
}
```

### 6. `getProjectStats()`

Gets project statistics (files, lines, errors, etc.).

**Returns:** `ApiResponse<{ files, lines, errors, warnings, complexity }>`

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.getProjectStats');
if (result.success) {
  console.log('Project Stats:', result.data);
}
```

### 7. `getWorkspaceInfo()`

Gets workspace information.

**Returns:** `ApiResponse<{ name, path, files }>`

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.getWorkspaceInfo');
```

## Response Format

All API methods return an `ApiResponse<T>` object:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;           // Result data if success
  error?: string;     // Error message if failed
  timestamp: Date;    // When the response was generated
}
```

## Example: Using in Cursor AI Prompt

You can use these functions in Cursor AI prompts:

```
@cursor-smart-agent analyzeProject
@cursor-smart-agent getProjectStats
@cursor-smart-agent calculateAgents
```

Or in code:

```typescript
// In your Cursor AI context
const analysis = await vscode.commands.executeCommand('smartAgent.api.analyze');
const recommendation = await vscode.commands.executeCommand('smartAgent.api.calculateAgents', analysis.data);
```

## Error Handling

Always check the `success` field:

```typescript
const result = await vscode.commands.executeCommand('smartAgent.api.analyze');

if (!result.success) {
  console.error('Error:', result.error);
  return;
}

// Use result.data safely
console.log('Analysis:', result.data);
```

## Notes

- All API methods are async and return Promises
- Results are cached by default (use `forceRefresh: true` to bypass cache)
- API automatically initializes when extension activates
- All methods handle errors gracefully and return error responses

