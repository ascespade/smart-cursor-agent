/**
 * Git Integration - Compare errors between branches
 */

import { ProjectAnalysis, BranchComparison } from '../../types';
import { ErrorCounter } from './errorCounter';
import { execa } from 'execa';
import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from '../../utils/helpers';

export class GitIntegration {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const result = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });

      if (result.exitCode === 0 && result.stdout.trim()) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all branches
   */
  async getBranches(): Promise<string[]> {
    try {
      const result = await execa('git', ['branch', '--list'], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });

      if (result.exitCode === 0 && result.stdout) {
        return result.stdout
          .split('\n')
          .map(b => b.trim().replace(/^\*\s*/, ''))
          .filter(b => b.length > 0);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Compare errors between current branch and target branch
   */
  async compareBranches(targetBranch: string): Promise<BranchComparison> {
    const currentBranch = await this.getCurrentBranch();
    if (!currentBranch) {
      throw new Error('Could not determine current branch');
    }

    // Analyze current branch
    const currentAnalysis = await this.analyzeCurrentBranch();

    // Analyze target branch
    const targetAnalysis = await this.analyzeBranch(targetBranch);

    // Calculate differences
    const diff = {
      typescript: currentAnalysis.errors.typescript - targetAnalysis.errors.typescript,
      eslint: currentAnalysis.errors.eslint - targetAnalysis.errors.eslint,
      warnings: currentAnalysis.errors.warnings - targetAnalysis.errors.warnings,
      total: currentAnalysis.errors.total - targetAnalysis.errors.total
    };

    // Determine if improved
    const improved = diff.total < 0; // Negative means fewer errors (improved)

    return {
      current: {
        typescript: currentAnalysis.errors.typescript,
        eslint: currentAnalysis.errors.eslint,
        warnings: currentAnalysis.errors.warnings,
        total: currentAnalysis.errors.total
      },
      target: {
        typescript: targetAnalysis.errors.typescript,
        eslint: targetAnalysis.errors.eslint,
        warnings: targetAnalysis.errors.warnings,
        total: targetAnalysis.errors.total
      },
      diff,
      improved
    };
  }

  /**
   * Analyze current branch
   */
  private async analyzeCurrentBranch(): Promise<ProjectAnalysis> {
    const { ProjectAnalyzer } = await import('./projectAnalyzer');
    const analyzer = new ProjectAnalyzer();
    return analyzer.analyze();
  }

  /**
   * Analyze specific branch (by checking it out temporarily)
   */
  private async analyzeBranch(branch: string): Promise<ProjectAnalysis> {
    // Save current branch
    const currentBranch = await this.getCurrentBranch();
    if (!currentBranch) {
      throw new Error('Could not determine current branch');
    }

    try {
      // Checkout target branch
      await execa('git', ['checkout', branch], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });

      // Analyze
      const { ProjectAnalyzer } = await import('./projectAnalyzer');
      const analyzer = new ProjectAnalyzer();
      const analysis = await analyzer.analyze();

      // Checkout back to original branch
      await execa('git', ['checkout', currentBranch], {
        cwd: this.workspaceRoot,
        reject: false,
        shell: process.platform === 'win32'
      });

      return analysis;
    } catch (error) {
      // Try to checkout back to original branch even if analysis failed
      try {
        await execa('git', ['checkout', currentBranch], {
          cwd: this.workspaceRoot,
          reject: false,
          shell: process.platform === 'win32'
        });
      } catch {
        // Ignore checkout errors
      }
      throw error;
    }
  }

  /**
   * Check if errors increased before commit
   */
  async preCommitCheck(): Promise<{ allowed: boolean; message: string }> {
    const currentAnalysis = await this.analyzeCurrentBranch();
    const previousAnalysis = await this.getPreviousAnalysis();

    if (!previousAnalysis) {
      // No previous analysis, allow commit
      await this.saveCurrentAnalysis(currentAnalysis);
      return { allowed: true, message: 'No previous analysis found' };
    }

    const errorIncrease = currentAnalysis.errors.total - previousAnalysis.errors.total;

    if (errorIncrease > 0) {
      const message = `عدد الأخطاء زاد من ${previousAnalysis.errors.total} إلى ${currentAnalysis.errors.total} (+${errorIncrease}). هل تريد المتابعة؟`;
      
      const choice = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        'نعم، متابعة',
        'لا، إلغاء'
      );

      if (choice === 'نعم، متابعة') {
        await this.saveCurrentAnalysis(currentAnalysis);
        return { allowed: true, message: 'User allowed commit despite error increase' };
      } else {
        return { allowed: false, message: 'User cancelled commit due to error increase' };
      }
    }

    // Errors decreased or stayed same, allow commit
    await this.saveCurrentAnalysis(currentAnalysis);
    return { allowed: true, message: 'Errors did not increase' };
  }

  /**
   * Get previous analysis
   */
  private async getPreviousAnalysis(): Promise<ProjectAnalysis | null> {
    const { StorageManager } = await import('../../utils/storage');
    const context = vscode.extensions.getExtension('cursor-smart-agent')?.extensionContext;
    if (!context) {
      return null;
    }
    const storage = new StorageManager(context);
    return storage.getAnalysis() || null;
  }

  /**
   * Save current analysis
   */
  private async saveCurrentAnalysis(analysis: ProjectAnalysis): Promise<void> {
    const { StorageManager } = await import('../../utils/storage');
    const context = vscode.extensions.getExtension('cursor-smart-agent')?.extensionContext;
    if (!context) {
      return;
    }
    const storage = new StorageManager(context);
    await storage.saveAnalysis(analysis);
  }
}
