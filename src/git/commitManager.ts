/**
 * Git commit manager
 */

import { CommandExecutor } from '../core/executor/commandExecutor';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../core/executor/errorHandler';
import { FileChange } from '../types';

export class CommitManager {
  constructor(
    private executor: CommandExecutor,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Create a commit
   */
  async commit(message: string, files?: string[]): Promise<boolean> {
    try {
      // Stage files if specified
      if (files && files.length > 0) {
        const addResult = await this.executor.git(['add', ...files]);
        if (!addResult.success) {
          return false;
        }
      } else {
        // Stage all changes
        const addResult = await this.executor.git(['add', '.']);
        if (!addResult.success) {
          return false;
        }
      }

      // Create commit
      const result = await this.executor.git(['commit', '-m', message]);
      if (result.success) {
        this.logger.info(`Committed: ${message}`);
        return true;
      }
      return false;
    } catch (error) {
      this.errorHandler.handleError(error, `Commit: ${message}`);
      return false;
    }
  }

  /**
   * Push to remote
   */
  async push(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      const currentBranch = branch || await this.getCurrentBranch();
      if (!currentBranch) {
        return false;
      }

      const result = await this.executor.git(['push', remote, currentBranch]);
      return result.success;
    } catch (error) {
      this.errorHandler.handleError(error, 'Push to remote');
      return false;
    }
  }

  /**
   * Generate smart commit message
   */
  async generateCommitMessage(changes: FileChange[]): Promise<string> {
    const errorCount = changes.reduce((sum, c) => sum + c.linesChanged, 0);
    const fileCount = changes.length;

    // Categorize changes
    const added = changes.filter(c => c.type === 'added').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    const deleted = changes.filter(c => c.type === 'deleted').length;

    let message = `fix: resolve ${errorCount} errors in ${fileCount} files`;

    if (added > 0) {
      message += ` (${added} added`;
      if (modified > 0 || deleted > 0) {
        message += `, ${modified} modified`;
        if (deleted > 0) {
          message += `, ${deleted} deleted`;
        }
      }
      message += ')';
    }

    return message;
  }

  /**
   * Get current branch
   */
  private async getCurrentBranch(): Promise<string | null> {
    try {
      const result = await this.executor.git(['branch', '--show-current']);
      if (result.success && result.stdout) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}

