/**
 * Protection Mode - Prevents errors and warnings
 */

import * as vscode from 'vscode';
import { ErrorCounter } from '../analyzer/errorCounter';
import { ComprehensiveAuditor } from '../analyzer/comprehensiveAuditor';
import { ProjectAnalysis, AuditReport } from '../../types';
import { GitHooksIntegration } from './gitHooksIntegration';

export interface ProtectionResult {
  allowed: boolean;
  reason: string;
  errors: number;
  warnings: number;
  suppressions: number;
  details: {
    typescript: number;
    eslint: number;
    warnings: number;
    suppressions: number;
  };
}

export class ProtectionMode {
  private static instance: ProtectionMode | null = null;
  private isEnabled: boolean = false;
  private strictMode: boolean = false; // Zero tolerance for errors and warnings
  private saveListener: vscode.Disposable | null = null;
  private gitHooks: GitHooksIntegration | null = null;
  private projectType: 'new' | 'old' | 'with-errors' | 'unknown' = 'unknown';

  /**
   * Get singleton instance
   */
  static getInstance(): ProtectionMode {
    if (!ProtectionMode.instance) {
      ProtectionMode.instance = new ProtectionMode();
    }
    return ProtectionMode.instance;
  }

  /**
   * Enable protection mode
   */
  async enable(strict: boolean = false): Promise<void> {
    this.isEnabled = true;
    this.strictMode = strict;
    
    // Detect project type
    await this.detectProjectType();
    
    // Remove existing listener if any
    if (this.saveListener) {
      this.saveListener.dispose();
    }
    
    // Set up save hook
    this.saveListener = vscode.workspace.onWillSaveTextDocument(async (e) => {
      const result = await this.checkBeforeSave(e.document);
      if (!result.allowed) {
        if (this.strictMode) {
          // Strict mode: block save
          e.waitUntil(Promise.reject(new Error('Save cancelled: ' + result.reason)));
        } else {
          // Normal mode: ask user
          const choice = await vscode.window.showWarningMessage(
            result.reason,
            { modal: true },
            'Save Anyway',
            'Cancel'
          );
          
          if (choice === 'Cancel') {
            e.waitUntil(Promise.reject(new Error('Save cancelled due to protection mode')));
          }
        }
      }
    });
    
    // Set up Git hooks if Git integration is enabled
    try {
      this.gitHooks = new GitHooksIntegration();
      await this.gitHooks.configureGit(true, strict);
      await this.gitHooks.installPreCommitHook();
      await this.gitHooks.installPrePushHook();
    } catch (error) {
      // Git hooks are optional
      console.warn('Failed to install Git hooks:', error);
    }
    
    vscode.window.showInformationMessage(
      `🛡️ Protection Mode ${strict ? '(Strict)' : ''} enabled. ${strict ? 'Zero tolerance for errors and warnings.' : 'Warnings allowed.'} Project type: ${this.projectType}`
    );
  }

  /**
   * Disable protection mode
   */
  async disable(): Promise<void> {
    this.isEnabled = false;
    this.strictMode = false;
    
    // Remove save listener
    if (this.saveListener) {
      this.saveListener.dispose();
      this.saveListener = null;
    }
    
    // Uninstall Git hooks
    if (this.gitHooks) {
      await this.gitHooks.configureGit(false, false);
      await this.gitHooks.uninstallHooks();
    }
    
    vscode.window.showInformationMessage('🛡️ Protection Mode disabled.');
  }

  /**
   * Detect project type
   */
  private async detectProjectType(): Promise<void> {
    try {
      // Check if project has errors
      const counter = new ErrorCounter();
      const errorCount = await counter.countErrors();
      
      if (errorCount.total === 0 && errorCount.warnings === 0) {
        // Check if it's a new project (few files)
        const { ProjectAnalyzer } = await import('../analyzer/projectAnalyzer');
        const analyzer = new ProjectAnalyzer();
        const analysis = await analyzer.analyze();
        
        if (analysis.size.files < 10) {
          this.projectType = 'new';
        } else {
          this.projectType = 'old';
        }
      } else {
        this.projectType = 'with-errors';
      }
    } catch (error) {
      this.projectType = 'unknown';
    }
  }

  /**
   * Check if protection mode is enabled
   */
  isProtectionEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if strict mode is enabled
   */
  isStrictMode(): boolean {
    return this.strictMode;
  }

  /**
   * Check before save
   */
  async checkBeforeSave(file: vscode.TextDocument): Promise<ProtectionResult> {
    if (!this.isEnabled) {
      return {
        allowed: true,
        reason: 'Protection mode is disabled',
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }

    // Get diagnostics for the file
    const diagnostics = vscode.languages.getDiagnostics(file.uri);
    const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
    const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);

    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;

    if (this.strictMode) {
      // Zero tolerance: no errors or warnings allowed
      if (hasErrors || hasWarnings) {
        return {
          allowed: false,
          reason: `File contains ${errors.length} error(s) and ${warnings.length} warning(s). Strict mode requires zero errors and warnings.`,
          errors: errors.length,
          warnings: warnings.length,
          suppressions: 0,
          details: {
            typescript: errors.filter(e => e.source === 'ts' || e.source === 'typescript').length,
            eslint: errors.filter(e => e.source === 'eslint').length,
            warnings: warnings.length,
            suppressions: 0
          }
        };
      }
    } else {
      // Normal mode: no errors allowed, warnings allowed
      if (hasErrors) {
        return {
          allowed: false,
          reason: `File contains ${errors.length} error(s). Please fix errors before saving.`,
          errors: errors.length,
          warnings: warnings.length,
          suppressions: 0,
          details: {
            typescript: errors.filter(e => e.source === 'ts' || e.source === 'typescript').length,
            eslint: errors.filter(e => e.source === 'eslint').length,
            warnings: warnings.length,
            suppressions: 0
          }
        };
      }
    }

    return {
      allowed: true,
      reason: 'File passed protection checks',
      errors: 0,
      warnings: warnings.length,
      suppressions: 0,
      details: {
        typescript: 0,
        eslint: 0,
        warnings: warnings.length,
        suppressions: 0
      }
    };
  }

  /**
   * Check before commit
   */
  async checkBeforeCommit(): Promise<ProtectionResult> {
    if (!this.isEnabled) {
      return {
        allowed: true,
        reason: 'Protection mode is disabled',
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }

    // Handle different project types
    if (this.projectType === 'new') {
      return await this.handleNewProject();
    } else if (this.projectType === 'old') {
      return await this.handleOldProject();
    } else if (this.projectType === 'with-errors') {
      return await this.handleProjectWithErrors();
    }

    try {
      // Run comprehensive audit
      const auditor = new ComprehensiveAuditor();
      const auditReport = await auditor.audit();

      const hasErrors = auditReport.totalErrors > 0;
      const hasWarnings = auditReport.totalWarnings > 0;
      const hasSuppressions = auditReport.totalSuppressions > 0;

      if (this.strictMode) {
        // Zero tolerance: no errors, warnings, or suppressions
        if (hasErrors || hasWarnings || hasSuppressions) {
          return {
            allowed: false,
            reason: `Project contains ${auditReport.totalErrors} error(s), ${auditReport.totalWarnings} warning(s), and ${auditReport.totalSuppressions} suppression(s). Strict mode requires zero errors, warnings, and suppressions.`,
            errors: auditReport.totalErrors,
            warnings: auditReport.totalWarnings,
            suppressions: auditReport.totalSuppressions,
            details: {
              typescript: auditReport.summary.typescript.errors,
              eslint: auditReport.summary.eslint.errors,
              warnings: auditReport.totalWarnings,
              suppressions: auditReport.totalSuppressions
            }
          };
        }
      } else {
        // Normal mode: no errors allowed, warnings and suppressions allowed
        if (hasErrors) {
          return {
            allowed: false,
            reason: `Project contains ${auditReport.totalErrors} error(s). Please fix errors before committing.`,
            errors: auditReport.totalErrors,
            warnings: auditReport.totalWarnings,
            suppressions: auditReport.totalSuppressions,
            details: {
              typescript: auditReport.summary.typescript.errors,
              eslint: auditReport.summary.eslint.errors,
              warnings: auditReport.totalWarnings,
              suppressions: auditReport.totalSuppressions
            }
          };
        }
      }

      return {
        allowed: true,
        reason: 'Project passed protection checks',
        errors: 0,
        warnings: auditReport.totalWarnings,
        suppressions: auditReport.totalSuppressions,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: auditReport.totalWarnings,
          suppressions: auditReport.totalSuppressions
        }
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Failed to run protection check: ${error}`,
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }
  }

  /**
   * Check before build
   */
  async checkBeforeBuild(): Promise<ProtectionResult> {
    if (!this.isEnabled) {
      return {
        allowed: true,
        reason: 'Protection mode is disabled',
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }

    try {
      // Count errors
      const counter = new ErrorCounter();
      const errorCount = await counter.countErrors();

      const hasErrors = errorCount.total > 0;
      const hasWarnings = errorCount.warnings > 0;

      if (this.strictMode) {
        // Zero tolerance: no errors or warnings
        if (hasErrors || hasWarnings) {
          return {
            allowed: false,
            reason: `Project contains ${errorCount.total} error(s) and ${errorCount.warnings} warning(s). Strict mode requires zero errors and warnings before build.`,
            errors: errorCount.total,
            warnings: errorCount.warnings,
            suppressions: 0,
            details: {
              typescript: errorCount.typescript,
              eslint: errorCount.eslint,
              warnings: errorCount.warnings,
              suppressions: 0
            }
          };
        }
      } else {
        // Normal mode: no errors allowed, warnings allowed
        if (hasErrors) {
          return {
            allowed: false,
            reason: `Project contains ${errorCount.total} error(s). Please fix errors before building.`,
            errors: errorCount.total,
            warnings: errorCount.warnings,
            suppressions: 0,
            details: {
              typescript: errorCount.typescript,
              eslint: errorCount.eslint,
              warnings: errorCount.warnings,
              suppressions: 0
            }
          };
        }
      }

      return {
        allowed: true,
        reason: 'Project passed protection checks',
        errors: 0,
        warnings: errorCount.warnings,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: errorCount.warnings,
          suppressions: 0
        }
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Failed to run protection check: ${error}`,
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }
  }

  /**
   * Handle new project
   */
  async handleNewProject(): Promise<ProtectionResult> {
    // For new projects, we allow everything initially
    // But we can set up protection rules
    if (this.strictMode) {
      // Strict mode: apply protection from the start
      return await this.checkBeforeCommit();
    } else {
      // Normal mode: allow initially, but warn
      return {
        allowed: true,
        reason: 'New project - protection rules will be applied gradually',
        errors: 0,
        warnings: 0,
        suppressions: 0,
        details: {
          typescript: 0,
          eslint: 0,
          warnings: 0,
          suppressions: 0
        }
      };
    }
  }

  /**
   * Handle old project
   */
  async handleOldProject(): Promise<ProtectionResult> {
    // For old projects, we might have existing errors
    // We can either:
    // 1. Allow existing errors but prevent new ones
    // 2. Require fixing all errors (strict mode)
    
    if (this.strictMode) {
      // Strict mode: require fixing all errors
      return await this.checkBeforeCommit();
    } else {
      // Normal mode: allow existing errors, prevent new ones
      // Check only staged files for new errors
      const result = await this.checkStagedFiles();
      return result;
    }
  }

  /**
   * Handle project with errors
   */
  async handleProjectWithErrors(): Promise<ProtectionResult> {
    // For projects with existing errors, we need to decide:
    // 1. Allow commit/build with errors (normal mode)
    // 2. Block commit/build until errors are fixed (strict mode)
    
    if (this.strictMode) {
      // Strict mode: block until errors are fixed
      return await this.checkBeforeCommit();
    } else {
      // Normal mode: show warning but allow with confirmation
      const result = await this.checkBeforeCommit();
      if (!result.allowed) {
        // Show warning but allow with confirmation
        const choice = await vscode.window.showWarningMessage(
          result.reason,
          { modal: true },
          'Continue Anyway',
          'Cancel'
        );
        
        if (choice === 'Continue Anyway') {
          return {
            ...result,
            allowed: true,
            reason: 'User chose to continue despite errors'
          };
        }
      }
      return result;
    }
  }

  /**
   * Check staged files only
   */
  private async checkStagedFiles(): Promise<ProtectionResult> {
    // This would check only staged files for new errors
    // For now, we'll do a full check
    return await this.checkBeforeCommit();
  }

  /**
   * Get project type
   */
  getProjectType(): 'new' | 'old' | 'with-errors' | 'unknown' {
    return this.projectType;
  }
}
