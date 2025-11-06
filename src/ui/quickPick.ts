/**
 * Quick pick menu for mode selection and actions
 */

import * as vscode from 'vscode';
import { MODE_DEFINITIONS, getModeDefinition } from '../types/modes';
import { ConfigManager } from '../utils/config';

export interface QuickPickOption {
  label: string;
  description: string;
  detail?: string;
  value: string;
  icon?: string;
  picked?: boolean;
}

export class QuickPickManager {
  /**
   * Show mode selection
   */
  static async showModeSelection(): Promise<string | undefined> {
    const currentMode = ConfigManager.getDefaultMode();

    const modes: QuickPickOption[] = Object.values(MODE_DEFINITIONS).map(mode => ({
      label: mode.displayName + (mode.name === currentMode ? ' ✓' : ''),
      description: mode.description,
      detail: [
        `${mode.modelCount} model${mode.modelCount > 1 ? 's' : ''}`,
        `Up to ${mode.maxAgents} agents`,
        mode.cost === 'free' ? '🆓 FREE' : '💳 PAID'
      ].join(' • '),
      value: mode.name,
      picked: mode.name === currentMode
    }));

    // Sort: Current first, then Free, then Paid
    modes.sort((a, b) => {
      if (a.picked) return -1;
      if (b.picked) return 1;

      const aDef = MODE_DEFINITIONS[a.value];
      const bDef = MODE_DEFINITIONS[b.value];

      if (aDef.cost !== bDef.cost) {
        return aDef.cost === 'free' ? -1 : 1;
      }

      return 0;
    });

    const selected = await vscode.window.showQuickPick(modes, {
      placeHolder: 'Select execution mode',
      title: 'Cursor Smart Agent - Mode Selection',
      matchOnDescription: true,
      matchOnDetail: true
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

