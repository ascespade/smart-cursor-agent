/**
 * Clipboard manager for Cursor integration
 */

import * as vscode from 'vscode';
import { NotificationManager } from '../ui/notifications';

export class ClipboardManager {
  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<void> {
    await vscode.env.clipboard.writeText(text);
    await NotificationManager.showPromptCopied();
  }

  /**
   * Read from clipboard
   */
  async readFromClipboard(): Promise<string> {
    return await vscode.env.clipboard.readText();
  }
}

