/**
 * Logger utility for Cursor Smart Agent
 */

import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Cursor Smart Agent');
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[INFO ${timestamp}] ${message}`;
    this.outputChannel.appendLine(formatted);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[WARN ${timestamp}] ${message}`;
    this.outputChannel.appendLine(formatted);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[ERROR ${timestamp}] ${message}`;
    this.outputChannel.appendLine(formatted);

    if (error instanceof Error) {
      this.outputChannel.appendLine(`Error: ${error.message}`);
      this.outputChannel.appendLine(`Stack: ${error.stack}`);
    } else if (error) {
      this.outputChannel.appendLine(String(error));
    }

    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  /**
   * Log a success message
   */
  success(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[SUCCESS ${timestamp}] ${message}`;
    this.outputChannel.appendLine(formatted);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, ...args: any[]): void {
    const config = vscode.workspace.getConfiguration('smartAgent');
    if (config.get('debug', false)) {
      const timestamp = new Date().toISOString();
      const formatted = `[DEBUG ${timestamp}] ${message}`;
      this.outputChannel.appendLine(formatted);
      if (args.length > 0) {
        this.outputChannel.appendLine(JSON.stringify(args, null, 2));
      }
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose the logger
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

