/**
 * Git merge helper
 */

import { CommandExecutor } from '../core/executor/commandExecutor';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../core/executor/errorHandler';
import { ConflictInfo } from '../types';

export class MergeHelper {
  constructor(
    private executor: CommandExecutor,
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Merge a branch
   */
  async merge(branch: string, strategy: 'ours' | 'theirs' | 'manual'): Promise<boolean> {
    try {
      let args = ['merge', branch];

      if (strategy === 'ours') {
        args.push('-X', 'ours');
      } else if (strategy === 'theirs') {
        args.push('-X', 'theirs');
      }

      const result = await this.executor.git(args);
      return result.success;
    } catch (error) {
      this.errorHandler.handleError(error, `Merge branch: ${branch}`);
      return false;
    }
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(files: string[]): Promise<boolean> {
    try {
      // Mark files as resolved
      for (const file of files) {
        const result = await this.executor.git(['add', file]);
        if (!result.success) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.errorHandler.handleError(error, 'Resolve conflicts');
      return false;
    }
  }

  /**
   * Detect conflicts
   */
  async detectConflicts(): Promise<ConflictInfo[]> {
    try {
      const result = await this.executor.git(['diff', '--check']);
      const conflicts: ConflictInfo[] = [];

      if (result.stdout) {
        const lines = result.stdout.split('\n');
        lines.forEach(line => {
          if (line.includes('<<<<<<<')) {
            // Extract file name from conflict marker
            const match = line.match(/(.+?):/);
            if (match) {
              conflicts.push({
                file: match[1],
                type: 'merge',
                severity: 'medium'
              });
            }
          }
        });
      }

      return conflicts;
    } catch (error) {
      this.errorHandler.handleError(error, 'Detect conflicts');
      return [];
    }
  }
}

