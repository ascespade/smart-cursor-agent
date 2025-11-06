/**
 * Auto-fix Integration - Automatically fix ESLint errors
 */

import { FixResult } from '../../types';
import { execa } from 'execa';
import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from '../../utils/helpers';

export class AutoFix {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
  }

  /**
   * Auto-fix ESLint errors
   */
  async fixESLintErrors(files?: string[]): Promise<FixResult> {
    const startTime = Date.now();
    const fixedFiles: string[] = [];
    const errors: Array<{ file: string; line: number; message: string; fixed: boolean }> = [];

    try {
      // Get current error count
      const { ErrorCounter } = await import('./errorCounter');
      const counter = new ErrorCounter();
      const beforeCount = await counter.countErrors();
      const beforeErrors = beforeCount.eslint;
      const beforeWarnings = beforeCount.warnings;

      // Run ESLint auto-fix
      const targetFiles = files || ['.'];
      const result = await execa('npx', ['eslint', ...targetFiles, '--fix'], {
        cwd: this.workspaceRoot,
        reject: false,
        timeout: 120000, // 2 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          PATH: process.env.PATH
        }
      });

      // Get new error count
      const afterCount = await counter.countErrors();
      const afterErrors = afterCount.eslint;
      const afterWarnings = afterCount.warnings;

      const fixed = beforeErrors - afterErrors;
      const duration = (Date.now() - startTime) / 1000; // seconds

      // Extract fixed files from output
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('fixed') || line.match(/^[^\s]+\.(ts|tsx|js|jsx)$/)) {
            const fileMatch = line.match(/^([^\s]+\.(ts|tsx|js|jsx))/);
            if (fileMatch) {
              fixedFiles.push(fileMatch[1]);
            }
          }
        }
      }

      return {
        fixed: Math.max(0, fixed),
        remaining: afterErrors,
        files: fixedFiles.length > 0 ? fixedFiles : targetFiles,
        errors: errors,
        duration: Math.round(duration * 100) / 100
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      vscode.window.showErrorMessage(`Failed to auto-fix ESLint errors: ${error}`);
      return {
        fixed: 0,
        remaining: 0,
        files: [],
        errors: [],
        duration: Math.round(duration * 100) / 100
      };
    }
  }

  /**
   * Auto-fix TypeScript errors (format only, can't auto-fix type errors)
   */
  async formatTypeScriptFiles(files?: string[]): Promise<FixResult> {
    const startTime = Date.now();
    const fixedFiles: string[] = [];

    try {
      // Use prettier or tsfmt to format files
      const targetFiles = files || ['.'];
      
      // Try prettier first
      try {
        const result = await execa('npx', ['prettier', '--write', ...targetFiles], {
          cwd: this.workspaceRoot,
          reject: false,
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
          shell: process.platform === 'win32',
          env: {
            ...process.env,
            PATH: process.env.PATH
          }
        });

        if (result.exitCode === 0) {
          const duration = (Date.now() - startTime) / 1000;
          return {
            fixed: 0, // Formatting doesn't fix errors, just formats
            remaining: 0,
            files: targetFiles,
            errors: [],
            duration: Math.round(duration * 100) / 100
          };
        }
      } catch {
        // Prettier not available, continue
      }

      const duration = (Date.now() - startTime) / 1000;
      return {
        fixed: 0,
        remaining: 0,
        files: fixedFiles,
        errors: [],
        duration: Math.round(duration * 100) / 100
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      vscode.window.showErrorMessage(`Failed to format TypeScript files: ${error}`);
      return {
        fixed: 0,
        remaining: 0,
        files: [],
        errors: [],
        duration: Math.round(duration * 100) / 100
      };
    }
  }

  /**
   * Fix all auto-fixable errors
   */
  async fixAll(files?: string[]): Promise<FixResult> {
    const eslintResult = await this.fixESLintErrors(files);
    // TypeScript errors can't be auto-fixed, only formatted
    await this.formatTypeScriptFiles(files);

    return eslintResult;
  }
}
