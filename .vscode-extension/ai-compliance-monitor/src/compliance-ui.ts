/**
 * Compliance UI
 * Manages status bar, notifications, and output channel
 */

import * as vscode from 'vscode';
import { ComplianceState, ComplianceConfig, PreCheckResult, PostCheckResult, AISession } from './types';

export class ComplianceUI {
  private statusBar: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private config: ComplianceConfig;

  constructor(outputChannel: vscode.OutputChannel, config: ComplianceConfig) {
    this.outputChannel = outputChannel;
    this.config = config;

    // Create status bar item
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBar.command = 'aiCompliance.showStatus';
    this.statusBar.show();
    
    this.updateStatusBar({ status: 'idle', isAIWorking: false, modifiedFiles: new Set(), sessionHistory: [] });
  }

  /**
   * Update status bar based on compliance state
   */
  updateStatusBar(state: ComplianceState): void {
    const { status } = state;

    switch (status) {
      case 'idle':
        this.statusBar.text = '$(check) AI Compliance';
        this.statusBar.backgroundColor = undefined;
        this.statusBar.tooltip = 'AI Compliance Monitor - Idle';
        break;

      case 'checking':
        this.statusBar.text = '$(sync~spin) Checking...';
        this.statusBar.backgroundColor = undefined;
        this.statusBar.tooltip = 'Running compliance checks...';
        break;

      case 'pass':
        this.statusBar.text = '$(check) Compliant';
        this.statusBar.backgroundColor = undefined;
        this.statusBar.tooltip = 'All compliance checks passed';
        break;

      case 'warn':
        this.statusBar.text = '$(warning) Warnings';
        this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBar.tooltip = 'Compliance warnings detected - Click for details';
        break;

      case 'violations':
        this.statusBar.text = '$(error) Violations';
        this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBar.tooltip = 'Compliance violations detected - Click for details';
        break;

      case 'blocked':
        this.statusBar.text = '$(stop) BLOCKED';
        this.statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBar.tooltip = 'Critical compliance violation - Changes blocked';
        break;

      case 'disabled':
        this.statusBar.text = '$(circle-slash) Disabled';
        this.statusBar.backgroundColor = undefined;
        this.statusBar.tooltip = 'AI Compliance Monitor is disabled';
        break;
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Format time only
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Show pre-check result
   */
  showPreCheckResult(result: PreCheckResult, session?: AISession): void {
    this.outputChannel.clear();
    
    if (session) {
      this.outputChannel.appendLine('╔═══════════════════════════════════════════════════════════╗');
      this.outputChannel.appendLine(`║  🎯 AI Task Session - #${session.sessionId.padEnd(47, ' ')}║`);
      this.outputChannel.appendLine('╚═══════════════════════════════════════════════════════════╝');
      this.outputChannel.appendLine(`🕐 Started: ${this.formatTimestamp(session.startTime)}`);
      this.outputChannel.appendLine(`📝 Task: ${session.taskDescription}`);
      this.outputChannel.appendLine('');
    }
    
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    this.outputChannel.appendLine('📋 PRE-EXECUTION CHECK RESULT');
    if (session) {
      this.outputChannel.appendLine(`   Session: #${session.sessionId}`);
    }
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    this.outputChannel.appendLine(`Status: ${result.status}`);
    this.outputChannel.appendLine(`Message: ${result.message}`);
    this.outputChannel.appendLine(`Timestamp: ${result.timestamp}`);
    this.outputChannel.appendLine('');

    // Show existing code found
    if (result.existingCode.length > 0) {
      this.outputChannel.appendLine(`🔍 Existing Code Found (${result.existingCode.length} files):`);
      result.existingCode.forEach(file => {
        this.outputChannel.appendLine(`  • ${file}`);
      });
      this.outputChannel.appendLine('');
    }

    // Show violations
    if (result.violations.length > 0) {
      this.outputChannel.appendLine(`🚨 Violations (${result.violations.length}):`);
      this.outputChannel.appendLine('');

      const critical = result.violations.filter(v => v.severity === 'CRITICAL');
      const high = result.violations.filter(v => v.severity === 'HIGH');
      const medium = result.violations.filter(v => v.severity === 'MEDIUM');
      const low = result.violations.filter(v => v.severity === 'LOW');

      if (critical.length > 0) {
        this.outputChannel.appendLine('🔴 CRITICAL:');
        critical.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
          this.outputChannel.appendLine(`     File: ${v.file || 'N/A'}`);
          this.outputChannel.appendLine(`     Action: ${v.requiredAction}`);
        });
        this.outputChannel.appendLine('');
      }

      if (high.length > 0) {
        this.outputChannel.appendLine('🟠 HIGH:');
        high.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
          this.outputChannel.appendLine(`     File: ${v.file || 'N/A'}`);
        });
        this.outputChannel.appendLine('');
      }

      if (medium.length > 0) {
        this.outputChannel.appendLine('🟡 MEDIUM:');
        medium.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
        });
        this.outputChannel.appendLine('');
      }

      if (low.length > 0) {
        this.outputChannel.appendLine('🔵 LOW:');
        low.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
        });
        this.outputChannel.appendLine('');
      }
    }

    this.outputChannel.appendLine(`💡 Required Action: ${result.requiredAction}`);
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`📚 Protected Files: ${result.registry.completedFunctionsCount}`);
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    
    this.outputChannel.show(true);

    // Show notification
    if (this.config.showNotifications) {
      this.showPreCheckNotification(result);
    }
  }

  /**
   * Show post-check result
   */
  showPostCheckResult(result: PostCheckResult, session?: AISession): void {
    this.outputChannel.appendLine('');
    
    if (session && session.endTime) {
      const duration = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
      this.outputChannel.appendLine('╔═══════════════════════════════════════════════════════════╗');
      this.outputChannel.appendLine(`║  📊 POST-CHECK - Session #${session.sessionId.padEnd(40, ' ')}║`);
      this.outputChannel.appendLine('╚═══════════════════════════════════════════════════════════╝');
      this.outputChannel.appendLine(`🕐 Completed: ${this.formatTimestamp(session.endTime)}`);
      this.outputChannel.appendLine(`⏱️  Duration: ${duration}s (from ${this.formatTime(session.startTime)})`);
      this.outputChannel.appendLine(`📝 Task: ${session.taskDescription}`);
      this.outputChannel.appendLine('');
    }
    
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    this.outputChannel.appendLine('📊 POST-EXECUTION CHECK RESULT');
    if (session) {
      this.outputChannel.appendLine(`   Session: #${session.sessionId}`);
    }
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    this.outputChannel.appendLine(`Status: ${result.status}`);
    this.outputChannel.appendLine(`Message: ${result.message}`);
    this.outputChannel.appendLine(`Timestamp: ${result.timestamp}`);
    this.outputChannel.appendLine('');

    // Show summary
    this.outputChannel.appendLine('📈 Summary:');
    if (session) {
      this.outputChannel.appendLine(`  Session ID: #${session.sessionId}`);
    }
    this.outputChannel.appendLine(`  Files Modified: ${result.summary.totalFilesModified}`);
    this.outputChannel.appendLine(`  Lines Changed: ${result.summary.totalLinesChanged}`);
    this.outputChannel.appendLine(`  Total Violations: ${result.summary.violationsCount}`);
    this.outputChannel.appendLine(`  🔴 Critical: ${result.summary.criticalViolations}`);
    this.outputChannel.appendLine(`  🟠 High: ${result.summary.highViolations}`);
    this.outputChannel.appendLine(`  🟡 Medium: ${result.summary.mediumViolations}`);
    this.outputChannel.appendLine('');

    // Show modified files
    if (result.modifiedFiles.length > 0) {
      this.outputChannel.appendLine(`📝 Modified Files (${result.modifiedFiles.length}):`);
      result.modifiedFiles.forEach(file => {
        this.outputChannel.appendLine(`  • ${file}`);
      });
      this.outputChannel.appendLine('');
    }

    // Show violations
    if (result.violations.length > 0) {
      this.outputChannel.appendLine(`🚨 Violations (${result.violations.length}):`);
      this.outputChannel.appendLine('');

      const critical = result.violations.filter(v => v.severity === 'CRITICAL');
      const high = result.violations.filter(v => v.severity === 'HIGH');
      const medium = result.violations.filter(v => v.severity === 'MEDIUM');
      const low = result.violations.filter(v => v.severity === 'LOW');

      if (critical.length > 0) {
        this.outputChannel.appendLine('🔴 CRITICAL:');
        critical.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
          this.outputChannel.appendLine(`     File: ${v.file || 'N/A'}`);
          this.outputChannel.appendLine(`     Action: ${v.requiredAction}`);
        });
        this.outputChannel.appendLine('');
      }

      if (high.length > 0) {
        this.outputChannel.appendLine('🟠 HIGH:');
        high.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
          this.outputChannel.appendLine(`     File: ${v.file || 'N/A'}`);
        });
        this.outputChannel.appendLine('');
      }

      if (medium.length > 0) {
        this.outputChannel.appendLine('🟡 MEDIUM:');
        medium.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
        });
        this.outputChannel.appendLine('');
      }

      if (low.length > 0) {
        this.outputChannel.appendLine('🔵 LOW:');
        low.forEach((v, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${v.type}: ${v.message}`);
        });
        this.outputChannel.appendLine('');
      }

      // Show fix suggestions
      if (result.fixes && result.fixes.length > 0) {
        this.outputChannel.appendLine('💡 Suggested Fixes:');
        result.fixes.forEach((fix, i) => {
          this.outputChannel.appendLine(`  ${i + 1}. ${fix.action}: ${fix.description}`);
          if (fix.command) {
            this.outputChannel.appendLine(`     Command: ${fix.command}`);
          }
          if (fix.suggestion) {
            this.outputChannel.appendLine(`     Suggestion: ${fix.suggestion}`);
          }
        });
        this.outputChannel.appendLine('');
      }
    }

    this.outputChannel.appendLine(`💡 Required Action: ${result.requiredAction}`);
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    
    this.outputChannel.show(true);

    // Show notification
    if (this.config.showNotifications) {
      this.showPostCheckNotification(result);
    }
  }

  /**
   * Show pre-check notification
   */
  private showPreCheckNotification(result: PreCheckResult): void {
    const level = this.config.notificationLevel;

    if (result.status === 'BLOCK') {
      vscode.window.showErrorMessage(
        `🚫 AI Compliance: ${result.message}`,
        'View Details'
      ).then(selection => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    } else if (result.status === 'WARN' && (level === 'all' || level === 'warnings')) {
      vscode.window.showWarningMessage(
        `⚠️ AI Compliance: ${result.message}`,
        'View Details',
        'Ignore'
      ).then(selection => {
        if (selection === 'View Details') {
          this.outputChannel.show();
        }
      });
    } else if (result.status === 'PASS' && level === 'all') {
      vscode.window.showInformationMessage(
        `✅ AI Compliance: ${result.message}`
      );
    }
  }

  /**
   * Show post-check notification
   */
  private showPostCheckNotification(result: PostCheckResult): void {
    const level = this.config.notificationLevel;

    if (result.status === 'VIOLATIONS') {
      const criticalCount = result.summary.criticalViolations;
      const highCount = result.summary.highViolations;
      
      if (criticalCount > 0 || highCount > 0) {
        vscode.window.showErrorMessage(
          `❌ AI Compliance: ${criticalCount} critical, ${highCount} high violations`,
          'View Details',
          'Ignore'
        ).then(selection => {
          if (selection === 'View Details') {
            this.outputChannel.show();
          }
        });
      } else if (level === 'all' || level === 'warnings') {
        vscode.window.showWarningMessage(
          `⚠️ AI Compliance: ${result.message}`,
          'View Details'
        ).then(selection => {
          if (selection === 'View Details') {
            this.outputChannel.show();
          }
        });
      }
    } else if (result.status === 'WARN' && (level === 'all' || level === 'warnings')) {
      vscode.window.showWarningMessage(
        `⚠️ AI Compliance: ${result.message}`
      );
    } else if (result.status === 'PASS' && level === 'all') {
      vscode.window.showInformationMessage(
        `✅ AI Compliance: All checks passed`
      );
    }
  }

  /**
   * Show session history
   */
  showSessionHistory(sessions: AISession[], stats: any): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('╔═══════════════════════════════════════════════════════════╗');
    this.outputChannel.appendLine('║  📜 AI Compliance Session History                         ║');
    this.outputChannel.appendLine('╚═══════════════════════════════════════════════════════════╝');
    this.outputChannel.appendLine('');
    
    // Show statistics
    this.outputChannel.appendLine('📊 Statistics:');
    this.outputChannel.appendLine(`  Total Sessions: ${stats.totalSessions}`);
    this.outputChannel.appendLine(`  Today's Sessions: ${stats.todaySessions}`);
    this.outputChannel.appendLine(`  Total Violations: ${stats.totalViolations}`);
    this.outputChannel.appendLine(`  🔴 Critical: ${stats.criticalViolations}`);
    this.outputChannel.appendLine(`  🟠 High: ${stats.highViolations}`);
    this.outputChannel.appendLine(`  🟡 Medium: ${stats.mediumViolations}`);
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('═══════════════════════════════════════════════════');
    this.outputChannel.appendLine('');
    
    if (sessions.length === 0) {
      this.outputChannel.appendLine('No sessions recorded yet.');
      this.outputChannel.show(true);
      return;
    }
    
    this.outputChannel.appendLine(`Recent Sessions (Last ${sessions.length}):`);
    this.outputChannel.appendLine('');
    
    sessions.forEach((session, index) => {
      const duration = session.duration || 0;
      const statusIcon = session.status === 'blocked' ? '🛑' : 
                         session.status === 'violations' ? '❌' :
                         session.status === 'warn' ? '⚠️' : '✅';
      
      this.outputChannel.appendLine(`${index + 1}. Session #${session.sessionId} ${statusIcon}`);
      this.outputChannel.appendLine(`   🕐 ${this.formatTimestamp(session.startTime)} → ${session.endTime ? this.formatTimestamp(session.endTime) : 'In Progress'} (${duration}s)`);
      this.outputChannel.appendLine(`   📝 Task: ${session.taskDescription}`);
      this.outputChannel.appendLine(`   📁 Files: ${session.filesModified.length} modified`);
      
      if (session.postCheckResult) {
        const summary = session.postCheckResult.summary;
        this.outputChannel.appendLine(`   🚨 Violations: ${summary.violationsCount} total`);
        if (summary.criticalViolations > 0) {
          this.outputChannel.appendLine(`      🔴 ${summary.criticalViolations} CRITICAL`);
        }
        if (summary.highViolations > 0) {
          this.outputChannel.appendLine(`      🟠 ${summary.highViolations} HIGH`);
        }
        if (summary.mediumViolations > 0) {
          this.outputChannel.appendLine(`      🟡 ${summary.mediumViolations} MEDIUM`);
        }
      }
      
      this.outputChannel.appendLine('');
    });
    
    this.outputChannel.show(true);
  }

  /**
   * Update configuration
   */
  updateConfig(config: ComplianceConfig): void {
    this.config = config;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBar.dispose();
  }
}

