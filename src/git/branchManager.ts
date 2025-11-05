/**
 * Git branch manager
 */

import { CommandExecutor } from '../core/executor/commandExecutor';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../core/executor/errorHandler';

export class BranchManager {
  constructor(
    private executor: CommandExecutor,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Create a new branch
   */
  async createBranch(name: string): Promise<boolean> {
    try {
      const result = await this.executor.git(['checkout', '-b', name]);
      if (result.success) {
        this.logger.info(`Created branch: ${name}`);
        return true;
      }
      return false;
    } catch (error) {
      this.errorHandler.handleError(error, `Create branch: ${name}`);
      return false;
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(name: string): Promise<boolean> {
    try {
      const result = await this.executor.git(['checkout', name]);
      return result.success;
    } catch (error) {
      this.errorHandler.handleError(error, `Switch branch: ${name}`);
      return false;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(name: string, force: boolean = false): Promise<boolean> {
    try {
      const args = force ? ['branch', '-D', name] : ['branch', '-d', name];
      const result = await this.executor.git(args);
      return result.success;
    } catch (error) {
      this.errorHandler.handleError(error, `Delete branch: ${name}`);
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const result = await this.executor.git(['branch', '--show-current']);
      if (result.success && result.stdout) {
        return result.stdout.trim();
      }
      return null;
    } catch (error) {
      this.errorHandler.handleError(error, 'Get current branch');
      return null;
    }
  }

  /**
   * List all branches
   */
  async listBranches(): Promise<string[]> {
    try {
      const result = await this.executor.git(['branch', '--list']);
      if (result.success && result.stdout) {
        return result.stdout
          .split('\n')
          .map(b => b.replace(/^\*?\s+/, '').trim())
          .filter(b => b.length > 0);
      }
      return [];
    } catch (error) {
      this.errorHandler.handleError(error, 'List branches');
      return [];
    }
  }
}

