/**
 * Cursor integration
 */

import * as vscode from 'vscode';
import { ClipboardManager } from './clipboardManager';
import { PromptBuilder } from './promptBuilder';
import { ProjectAnalysis, AgentRecommendation } from '../types';
import { ModeDefinition } from '../types/modes';
import { NotificationManager } from '../ui/notifications';

export class CursorIntegration {
  private clipboardManager: ClipboardManager;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.clipboardManager = new ClipboardManager();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Open Cursor with prompt
   */
  async openCursorWithPrompt(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation,
    mode: ModeDefinition
  ): Promise<void> {
    // Build prompt
    const prompt = this.promptBuilder.buildPrompt(analysis, recommendation, mode);

    // Copy to clipboard
    await this.clipboardManager.copyToClipboard(prompt);

    // Show notification
    const action = await NotificationManager.info(
      '📋 Prompt copied! Open Cursor Composer (Cmd+I / Ctrl+I) and paste.',
      'Open Cursor'
    );

    if (action === 'Open Cursor') {
      // Try to focus on Cursor (if available)
      await vscode.commands.executeCommand('workbench.action.terminal.new');
    }
  }

  /**
   * Generate and copy prompt
   */
  async generateAndCopyPrompt(
    analysis: ProjectAnalysis,
    recommendation: AgentRecommendation,
    mode: ModeDefinition
  ): Promise<string> {
    const prompt = this.promptBuilder.buildPrompt(analysis, recommendation, mode);
    await this.clipboardManager.copyToClipboard(prompt);
    return prompt;
  }
}

