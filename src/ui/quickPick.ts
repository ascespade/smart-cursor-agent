/**
 * Quick pick menu for mode selection and actions
 */

import * as vscode from 'vscode';

export interface QuickPickOption {
  label: string;
  description: string;
  detail?: string;
  value: string;
  icon?: string;
}

export class QuickPickManager {
  /**
   * Show mode selection
   */
  static async showModeSelection(): Promise<string | undefined> {
    const modes: QuickPickOption[] = [
      {
        label: '$(brain) Auto Mode',
        description: 'AI chooses best strategy based on history',
        detail: 'Recommended for most users',
        value: 'auto'
      },
      {
        label: '$(sync) Non-Stop Mode',
        description: 'Work continuously without questions',
        detail: 'Perfect for large projects (500+ errors)',
        value: 'non-stop'
      },
      {
        label: '$(light-bulb) Smart Developer',
        description: 'Context-aware suggestions',
        detail: 'Perfect for daily development',
        value: 'smart'
      },
      {
        label: '$(coffee) Lazy Developer',
        description: 'Minimal input, maximum output',
        detail: 'Describe project and let AI build it',
        value: 'lazy'
      },
      {
        label: '$(rocket) Super Developer',
        description: 'Multi-project orchestration',
        detail: 'Perfect for monorepos and teams',
        value: 'super'
      },
      {
        label: '$(shield) Security Mode',
        description: 'Security-first approach',
        detail: 'Perfect for production code',
        value: 'security'
      },
      {
        label: '$(play) Simulation',
        description: 'Preview changes without applying',
        detail: 'Safe testing mode',
        value: 'simulation'
      },
      {
        label: '$(book) Learning Mode',
        description: 'Improves over time',
        detail: 'Gets smarter with each use',
        value: 'learning'
      }
    ];

    const selected = await vscode.window.showQuickPick(modes, {
      placeHolder: 'Select execution mode',
      title: 'Cursor Smart Agent - Mode Selection'
    });

    return selected?.value;
  }

  /**
   * Show action menu
   */
  static async showActionMenu(): Promise<string | undefined> {
    const actions: QuickPickOption[] = [
      {
        label: '$(search) Analyze Project',
        description: 'Count all TypeScript and ESLint errors',
        value: 'analyze'
      },
      {
        label: '$(zap) Quick Fix',
        description: 'Start auto-fix with current mode',
        value: 'quickFix'
      },
      {
        label: '$(dashboard) Open Dashboard',
        description: 'View real-time progress',
        value: 'dashboard'
      },
      {
        label: '$(gear) Switch Mode',
        description: 'Change execution mode',
        value: 'switchMode'
      },
      {
        label: '$(history) View History',
        description: 'See past fix sessions',
        value: 'history'
      },
      {
        label: '$(play) Run Simulation',
        description: 'Preview changes without applying',
        value: 'simulation'
      },
      {
        label: '$(shield) Security Scan',
        description: 'Scan for vulnerabilities',
        value: 'security'
      },
      {
        label: '$(file-text) Generate Report',
        description: 'Export analysis report',
        value: 'report'
      },
      {
        label: '$(question) Help',
        description: 'View documentation',
        value: 'help'
      }
    ];

    const selected = await vscode.window.showQuickPick(actions, {
      placeHolder: 'Select an action',
      title: 'Cursor Smart Agent - Actions'
    });

    return selected?.value;
  }
}

