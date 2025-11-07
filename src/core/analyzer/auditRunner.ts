/**
 * Audit Runner - Runs comprehensive audit and generates report
 */

import { ComprehensiveAuditor, AuditReport } from './comprehensiveAuditor';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from '../../utils/helpers';

export class AuditRunner {
  private workspaceRoot: string;
  private outputChannel: vscode.OutputChannel;

  constructor(context?: vscode.ExtensionContext) {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = path.normalize(root);
    
    if (context) {
      this.outputChannel = vscode.window.createOutputChannel('Comprehensive Code Audit');
    } else {
      this.outputChannel = vscode.window.createOutputChannel('Comprehensive Code Audit');
    }
  }

  /**
   * Run comprehensive audit
   */
  async runAudit(): Promise<AuditReport> {
    this.outputChannel.clear();
    this.outputChannel.appendLine('🔍 Starting Comprehensive Code Audit...');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.show();

    const auditor = new ComprehensiveAuditor();
    const report = await auditor.audit();

    this.generateReport(report);
    return report;
  }

  /**
   * Generate audit report
   */
  private generateReport(report: AuditReport): void {
    this.outputChannel.appendLine('\n📊 AUDIT REPORT');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
    this.outputChannel.appendLine(`Total Files: ${report.totalFiles}`);
    this.outputChannel.appendLine(`Total Errors: ${report.totalErrors}`);
    this.outputChannel.appendLine(`Total Warnings: ${report.totalWarnings}`);
    this.outputChannel.appendLine(`Total Suppressions: ${report.totalSuppressions}`);
    this.outputChannel.appendLine(`Code Quality Score: ${report.codeQualityScore}/100`);
    this.outputChannel.appendLine('='.repeat(80));

    // Summary
    this.outputChannel.appendLine('\n📋 SUMMARY');
    this.outputChannel.appendLine('-'.repeat(80));
    this.outputChannel.appendLine(`TypeScript: ${report.summary.typescript.errors} errors, ${report.summary.typescript.warnings} warnings`);
    this.outputChannel.appendLine(`ESLint: ${report.summary.eslint.errors} errors, ${report.summary.eslint.warnings} warnings`);
    this.outputChannel.appendLine(`Build: ${report.summary.build.errors} errors, ${report.summary.build.warnings} warnings`);
    this.outputChannel.appendLine(`Syntax: ${report.summary.syntax.errors} errors, ${report.summary.syntax.warnings} warnings`);
    this.outputChannel.appendLine(`Dependencies: ${report.summary.dependencies.errors} errors, ${report.summary.dependencies.warnings} warnings`);
    this.outputChannel.appendLine(`Suppressions: ${report.summary.suppressions}`);

    // Errors
    if (report.errors.length > 0) {
      this.outputChannel.appendLine('\n❌ ERRORS FOUND (MUST FIX)');
      this.outputChannel.appendLine('-'.repeat(80));
      for (const error of report.errors) {
        this.outputChannel.appendLine(`\nFile: ${error.file}`);
        this.outputChannel.appendLine(`Line: ${error.line}${error.column ? `:${error.column}` : ''}`);
        this.outputChannel.appendLine(`Type: ${error.type}`);
        this.outputChannel.appendLine(`Severity: ${error.severity}`);
        this.outputChannel.appendLine(`Issue: ${error.issue}`);
        this.outputChannel.appendLine(`Fix: ${error.fix}`);
        if (error.code) {
          this.outputChannel.appendLine(`Code: ${error.code}`);
        }
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      this.outputChannel.appendLine('\n⚠️ WARNINGS');
      this.outputChannel.appendLine('-'.repeat(80));
      for (const warning of report.warnings) {
        this.outputChannel.appendLine(`\nFile: ${warning.file}`);
        this.outputChannel.appendLine(`Line: ${warning.line}${warning.column ? `:${warning.column}` : ''}`);
        this.outputChannel.appendLine(`Type: ${warning.type}`);
        this.outputChannel.appendLine(`Severity: ${warning.severity}`);
        this.outputChannel.appendLine(`Issue: ${warning.issue}`);
        this.outputChannel.appendLine(`Fix: ${warning.fix}`);
      }
    }

    // Suppressions
    if (report.suppressions.length > 0) {
      this.outputChannel.appendLine('\n🚫 SUPPRESSIONS FOUND');
      this.outputChannel.appendLine('-'.repeat(80));
      for (const suppression of report.suppressions) {
        this.outputChannel.appendLine(`\nFile: ${suppression.file}`);
        this.outputChannel.appendLine(`Line: ${suppression.line}`);
        this.outputChannel.appendLine(`Type: ${suppression.type}`);
        if (suppression.rule) {
          this.outputChannel.appendLine(`Rule: ${suppression.rule}`);
        }
        this.outputChannel.appendLine(`Reason: ${suppression.reason || 'Unknown'}`);
        this.outputChannel.appendLine(`Should Remove: ${suppression.shouldRemove ? 'YES' : 'NO'}`);
      }
    }

    // Business Logic Concerns
    if (report.businessLogicConcerns.length > 0) {
      this.outputChannel.appendLine('\n🎯 BUSINESS LOGIC CONCERNS');
      this.outputChannel.appendLine('-'.repeat(80));
      for (const concern of report.businessLogicConcerns) {
        this.outputChannel.appendLine(`- ${concern}`);
      }
    }

    // Final verdict
    this.outputChannel.appendLine('\n' + '='.repeat(80));
    this.outputChannel.appendLine(`FINAL VERDICT: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
    this.outputChannel.appendLine(`Code Quality Score: ${report.codeQualityScore}/100`);
    this.outputChannel.appendLine('='.repeat(80));

    // Export report to file
    this.exportReportToFile(report);
  }

  /**
   * Export report to file
   */
  private async exportReportToFile(report: AuditReport): Promise<void> {
    try {
      const reportPath = path.join(this.workspaceRoot, 'audit-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      this.outputChannel.appendLine(`\n📄 Report exported to: ${reportPath}`);
    } catch (error) {
      this.outputChannel.appendLine(`\n❌ Failed to export report: ${error}`);
    }
  }

  /**
   * Get audit report as formatted string
   */
  getFormattedReport(report: AuditReport): string {
    let output = '';

    output += '🔍 COMPREHENSIVE CODE AUDIT REPORT\n';
    output += '='.repeat(80) + '\n';
    output += `Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    output += `Total Files: ${report.totalFiles}\n`;
    output += `Total Errors: ${report.totalErrors}\n`;
    output += `Total Warnings: ${report.totalWarnings}\n`;
    output += `Total Suppressions: ${report.totalSuppressions}\n`;
    output += `Code Quality Score: ${report.codeQualityScore}/100\n`;
    output += '='.repeat(80) + '\n\n';

    // Summary
    output += '📋 SUMMARY\n';
    output += '-'.repeat(80) + '\n';
    output += `TypeScript: ${report.summary.typescript.errors} errors, ${report.summary.typescript.warnings} warnings\n`;
    output += `ESLint: ${report.summary.eslint.errors} errors, ${report.summary.eslint.warnings} warnings\n`;
    output += `Build: ${report.summary.build.errors} errors, ${report.summary.build.warnings} warnings\n`;
    output += `Syntax: ${report.summary.syntax.errors} errors, ${report.summary.syntax.warnings} warnings\n`;
    output += `Dependencies: ${report.summary.dependencies.errors} errors, ${report.summary.dependencies.warnings} warnings\n`;
    output += `Suppressions: ${report.summary.suppressions}\n\n`;

    // Errors
    if (report.errors.length > 0) {
      output += '❌ ERRORS FOUND (MUST FIX)\n';
      output += '-'.repeat(80) + '\n';
      for (const error of report.errors) {
        output += `\nFile: ${error.file}\n`;
        output += `Line: ${error.line}${error.column ? `:${error.column}` : ''}\n`;
        output += `Type: ${error.type}\n`;
        output += `Severity: ${error.severity}\n`;
        output += `Issue: ${error.issue}\n`;
        output += `Fix: ${error.fix}\n`;
        if (error.code) {
          output += `Code: ${error.code}\n`;
        }
      }
      output += '\n';
    }

    // Warnings
    if (report.warnings.length > 0) {
      output += '⚠️ WARNINGS\n';
      output += '-'.repeat(80) + '\n';
      for (const warning of report.warnings) {
        output += `\nFile: ${warning.file}\n`;
        output += `Line: ${warning.line}${warning.column ? `:${warning.column}` : ''}\n`;
        output += `Type: ${warning.type}\n`;
        output += `Severity: ${warning.severity}\n`;
        output += `Issue: ${warning.issue}\n`;
        output += `Fix: ${warning.fix}\n`;
      }
      output += '\n';
    }

    // Suppressions
    if (report.suppressions.length > 0) {
      output += '🚫 SUPPRESSIONS FOUND\n';
      output += '-'.repeat(80) + '\n';
      for (const suppression of report.suppressions) {
        output += `\nFile: ${suppression.file}\n`;
        output += `Line: ${suppression.line}\n`;
        output += `Type: ${suppression.type}\n`;
        if (suppression.rule) {
          output += `Rule: ${suppression.rule}\n`;
        }
        output += `Reason: ${suppression.reason || 'Unknown'}\n`;
        output += `Should Remove: ${suppression.shouldRemove ? 'YES' : 'NO'}\n`;
      }
      output += '\n';
    }

    // Business Logic Concerns
    if (report.businessLogicConcerns.length > 0) {
      output += '🎯 BUSINESS LOGIC CONCERNS\n';
      output += '-'.repeat(80) + '\n';
      for (const concern of report.businessLogicConcerns) {
        output += `- ${concern}\n`;
      }
      output += '\n';
    }

    // Final verdict
    output += '='.repeat(80) + '\n';
    output += `FINAL VERDICT: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    output += `Code Quality Score: ${report.codeQualityScore}/100\n`;
    output += '='.repeat(80) + '\n';

    return output;
  }
}
