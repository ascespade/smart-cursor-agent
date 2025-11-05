/**
 * Configuration manager for Cursor Smart Agent
 */

import * as vscode from 'vscode';

export class ConfigManager {
  private static readonly CONFIG_SECTION = 'smartAgent';

  /**
   * Get a configuration value
   */
  static get<T>(key: string, defaultValue?: T): T | undefined {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<T>(key, defaultValue as T);
  }

  /**
   * Update a configuration value
   */
  static async update(
    key: string,
    value: any,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(key, value, target);
  }

  /**
   * Get default mode
   */
  static getDefaultMode(): string {
    return this.get<string>('defaultMode', 'auto') || 'auto';
  }

  /**
   * Check if non-stop mode is enabled
   */
  static isNonStopEnabled(): boolean {
    return this.get<boolean>('nonStopMode', true) ?? true;
  }

  /**
   * Get confidence threshold
   */
  static getConfidenceThreshold(): number {
    return this.get<number>('confidenceThreshold', 0) ?? 0;
  }

  /**
   * Get default agent count
   */
  static getDefaultAgentCount(): number {
    return this.get<number>('defaultAgentCount', 4) ?? 4;
  }

  /**
   * Get preferred models
   */
  static getPreferredModels(): string[] {
    return this.get<string[]>('preferredModels', ['ChatGPT', 'Claude']) || ['ChatGPT', 'Claude'];
  }

  /**
   * Check if Git integration is enabled
   */
  static isGitIntegrationEnabled(): boolean {
    return this.get<boolean>('gitIntegration', true) ?? true;
  }

  /**
   * Check if security scanning is enabled
   */
  static isSecurityScanningEnabled(): boolean {
    return this.get<boolean>('securityScanning', true) ?? true;
  }

  /**
   * Check if learning is enabled
   */
  static isLearningEnabled(): boolean {
    return this.get<boolean>('learningEnabled', true) ?? true;
  }

  /**
   * Check if auto-analyze on startup is enabled
   */
  static isAutoAnalyzeOnStartup(): boolean {
    return this.get<boolean>('autoAnalyzeOnStartup', false) ?? false;
  }

  /**
   * Get max cost per session
   */
  static getMaxCostPerSession(): number {
    return this.get<number>('maxCostPerSession', 20) ?? 20;
  }

  /**
   * Get max time per session (minutes)
   */
  static getMaxTimePerSession(): number {
    return this.get<number>('maxTimePerSession', 480) ?? 480;
  }

  /**
   * Get history retention days
   */
  static getHistoryRetentionDays(): number {
    return this.get<number>('historyRetentionDays', 90) ?? 90;
  }
}

