/**
 * Git Hooks Integration - Integrates protection mode with Git hooks
 */

import * as vscode from 'vscode';
import { execa } from 'execa';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot } from '../../utils/helpers';
import { ProtectionMode } from './protectionMode';

export class GitHooksIntegration {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Install pre-commit hook
   */
  async installPreCommitHook(): Promise<boolean> {
    try {
      const hooksDir = path.join(this.workspaceRoot, '.git', 'hooks');
      
      if (!fs.existsSync(hooksDir)) {
        vscode.window.showErrorMessage('Not a Git repository');
        return false;
      }

      const hookPath = path.join(hooksDir, 'pre-commit');
      const hookScript = this.generatePreCommitHook();

      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
      
      vscode.window.showInformationMessage('✅ Pre-commit hook installed successfully');
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to install pre-commit hook: ${error}`);
      return false;
    }
  }

  /**
   * Generate pre-commit hook script
   */
  private generatePreCommitHook(): string {
    return `#!/bin/sh
# Pre-commit hook for Cursor Smart Agent Protection Mode

# Check if protection mode is enabled
PROTECTION_MODE=$(git config --get cursor-smart-agent.protection-mode 2>/dev/null)
STRICT_MODE=$(git config --get cursor-smart-agent.strict-mode 2>/dev/null)

if [ "$PROTECTION_MODE" != "true" ]; then
  exit 0
fi

# Run TypeScript check
echo "Running TypeScript check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed. Commit aborted."
  if [ "$STRICT_MODE" = "true" ]; then
    exit 1
  fi
fi

# Run ESLint
echo "Running ESLint..."
npx eslint . --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed. Commit aborted."
  if [ "$STRICT_MODE" = "true" ]; then
    exit 1
  fi
fi

# Check for suppressions
echo "Checking for suppressions..."
SUPPRESSIONS=$(git diff --cached | grep -E "@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable" | wc -l)
if [ "$SUPPRESSIONS" -gt 0 ]; then
  echo "⚠️ Found $SUPPRESSIONS suppression(s) in staged files."
  if [ "$STRICT_MODE" = "true" ]; then
    echo "❌ Strict mode: Suppressions not allowed. Commit aborted."
    exit 1
  fi
fi

echo "✅ All checks passed. Proceeding with commit."
exit 0
`;
  }

  /**
   * Install pre-push hook
   */
  async installPrePushHook(): Promise<boolean> {
    try {
      const hooksDir = path.join(this.workspaceRoot, '.git', 'hooks');
      
      if (!fs.existsSync(hooksDir)) {
        vscode.window.showErrorMessage('Not a Git repository');
        return false;
      }

      const hookPath = path.join(hooksDir, 'pre-push');
      const hookScript = this.generatePrePushHook();

      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
      
      vscode.window.showInformationMessage('✅ Pre-push hook installed successfully');
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to install pre-push hook: ${error}`);
      return false;
    }
  }

  /**
   * Generate pre-push hook script
   */
  private generatePrePushHook(): string {
    return `#!/bin/sh
# Pre-push hook for Cursor Smart Agent Protection Mode

# Check if protection mode is enabled
PROTECTION_MODE=$(git config --get cursor-smart-agent.protection-mode 2>/dev/null)
STRICT_MODE=$(git config --get cursor-smart-agent.strict-mode 2>/dev/null)

if [ "$PROTECTION_MODE" != "true" ]; then
  exit 0
fi

# Run comprehensive checks
echo "Running comprehensive checks before push..."

# Type check
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed. Push aborted."
  exit 1
fi

# Lint
npx eslint . --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed. Push aborted."
  if [ "$STRICT_MODE" = "true" ]; then
    exit 1
  fi
fi

# Tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Push aborted."
  if [ "$STRICT_MODE" = "true" ]; then
    exit 1
  fi
fi

echo "✅ All checks passed. Proceeding with push."
exit 0
`;
  }

  /**
   * Configure Git for protection mode
   */
  async configureGit(protectionEnabled: boolean, strictMode: boolean): Promise<void> {
    try {
      await execa('git', ['config', 'cursor-smart-agent.protection-mode', protectionEnabled ? 'true' : 'false'], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });

      await execa('git', ['config', 'cursor-smart-agent.strict-mode', strictMode ? 'true' : 'false'], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });
    } catch (error) {
      vscode.window.showWarningMessage(`Failed to configure Git: ${error}`);
    }
  }

  /**
   * Uninstall hooks
   */
  async uninstallHooks(): Promise<void> {
    try {
      const hooksDir = path.join(this.workspaceRoot, '.git', 'hooks');
      
      if (!fs.existsSync(hooksDir)) {
        return;
      }

      const preCommitPath = path.join(hooksDir, 'pre-commit');
      const prePushPath = path.join(hooksDir, 'pre-push');

      if (fs.existsSync(preCommitPath)) {
        const content = fs.readFileSync(preCommitPath, 'utf-8');
        if (content.includes('Cursor Smart Agent')) {
          fs.unlinkSync(preCommitPath);
        }
      }

      if (fs.existsSync(prePushPath)) {
        const content = fs.readFileSync(prePushPath, 'utf-8');
        if (content.includes('Cursor Smart Agent')) {
          fs.unlinkSync(prePushPath);
        }
      }

      vscode.window.showInformationMessage('✅ Git hooks uninstalled');
    } catch (error) {
      vscode.window.showWarningMessage(`Failed to uninstall hooks: ${error}`);
    }
  }
}
