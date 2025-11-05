/**
 * Command executor for running shell commands
 */

import { execa } from 'execa';
import { getWorkspaceRoot } from '../../utils/helpers';
import { Logger } from '../../utils/logger';
import { ErrorHandler } from './errorHandler';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class CommandExecutor {
  private workspaceRoot: string;

  constructor(
    private logger: Logger,
    private errorHandler: ErrorHandler
  ) {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Execute a command
   */
  async execute(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      cwd?: string;
      env?: Record<string, string>;
    } = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const cwd = options.cwd || this.workspaceRoot;

    this.logger.debug(`Executing: ${command} ${args.join(' ')}`);

    try {
      const result = await execa(command, args, {
        cwd,
        timeout: options.timeout || 30000,
        env: {
          ...process.env,
          ...options.env
        },
        reject: false
      });

      const duration = Date.now() - startTime;

      const commandResult: CommandResult = {
        success: result.exitCode === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0,
        duration
      };

      if (commandResult.success) {
        this.logger.debug(`Command succeeded in ${duration}ms`);
      } else {
        this.logger.warn(`Command failed with exit code ${result.exitCode}`);
      }

      return commandResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.errorHandler.handleError(error, `Command execution: ${command}`);

      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        duration
      };
    }
  }

  /**
   * Execute command with retry
   */
  async executeWithRetry(
    command: string,
    args: string[] = [],
    maxRetries: number = 3,
    options: {
      timeout?: number;
      cwd?: string;
      env?: Record<string, string>;
    } = {}
  ): Promise<CommandResult> {
    return this.errorHandler.retry(
      () => this.execute(command, args, options),
      maxRetries
    );
  }

  /**
   * Check if command exists
   */
  async commandExists(command: string): Promise<boolean> {
    try {
      const result = await this.execute(
        process.platform === 'win32' ? 'where' : 'which',
        [command],
        { timeout: 5000 }
      );
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Execute npm command
   */
  async npm(command: string, args: string[] = []): Promise<CommandResult> {
    return this.execute('npm', [command, ...args]);
  }

  /**
   * Execute npx command
   */
  async npx(command: string, args: string[] = []): Promise<CommandResult> {
    return this.execute('npx', [command, ...args]);
  }

  /**
   * Execute git command
   */
  async git(args: string[]): Promise<CommandResult> {
    return this.execute('git', args);
  }
}

