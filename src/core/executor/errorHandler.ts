/**
 * Error handler for execution errors
 */

import { Logger } from '../../utils/logger';
import * as vscode from 'vscode';

export interface ErrorInfo {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  timestamp: Date;
}

export class ErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * Handle an error
   */
  handleError(error: Error | unknown, context?: string): ErrorInfo {
    const errorInfo = this.parseError(error);

    if (context) {
      errorInfo.message = `[${context}] ${errorInfo.message}`;
    }

    this.logger.error(errorInfo.message, error);

    // Show notification for critical/high severity errors
    if (errorInfo.severity === 'critical' || errorInfo.severity === 'high') {
      vscode.window.showErrorMessage(
        `Smart Agent Error: ${errorInfo.message}`,
        'View Details'
      ).then(selection => {
        if (selection === 'View Details') {
          this.logger.show();
        }
      });
    }

    return errorInfo;
  }

  /**
   * Parse error to extract information
   */
  private parseError(error: Error | unknown): ErrorInfo {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
        severity: this.determineSeverity(error),
        recoverable: this.isRecoverable(error),
        timestamp: new Date()
      };
    } else if (typeof error === 'string') {
      return {
        message: error,
        severity: 'medium',
        recoverable: true,
        timestamp: new Date()
      };
    } else {
      return {
        message: 'Unknown error occurred',
        severity: 'medium',
        recoverable: true,
        timestamp: new Date()
      };
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors
    if (message.includes('workspace') || message.includes('filesystem')) {
      return 'critical';
    }

    // High severity
    if (message.includes('network') || message.includes('timeout') || message.includes('permission')) {
      return 'high';
    }

    // Low severity
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    if (message.includes('workspace') || message.includes('missing')) {
      return false;
    }

    // Most errors are recoverable
    return true;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const backoffDelay = delay * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffDelay}ms...`
          );
          await this.sleep(backoffDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

