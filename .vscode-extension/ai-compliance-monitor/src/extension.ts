/**
 * AI Compliance Monitor Extension
 * Main entry point for the VS Code extension
 */

import * as vscode from 'vscode';
import { ComplianceRunner } from './compliance-runner';
import { ComplianceUI } from './compliance-ui';
import { FileWatcher } from './file-watcher';
import { SessionManager } from './session-manager';
import { ComplianceState, ComplianceConfig } from './types';

let complianceRunner: ComplianceRunner;
let complianceUI: ComplianceUI;
let fileWatcher: FileWatcher;
let sessionManager: SessionManager;
let outputChannel: vscode.OutputChannel;
let state: ComplianceState;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('AI Compliance Monitor is now active');

  // Get workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('AI Compliance Monitor requires a workspace to be opened');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  // Initialize output channel
  outputChannel = vscode.window.createOutputChannel('AI Compliance Monitor');

  // Load configuration
  const config = loadConfig();

  // Initialize state
  state = {
    status: config.enabled ? 'idle' : 'disabled',
    isAIWorking: false,
    modifiedFiles: new Set(),
    sessionHistory: []
  };

  // Initialize components
  sessionManager = new SessionManager();
  complianceRunner = new ComplianceRunner(workspaceRoot, outputChannel);
  complianceUI = new ComplianceUI(outputChannel, config);
  
  fileWatcher = new FileWatcher(
    () => handleAIStartWork(),
    (files) => handleAIFinishWork(files),
    config.debounceMs
  );

  // Update initial status
  complianceUI.updateStatusBar(state);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.runPreCheck', async () => {
      await runPreCheckCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.runPostCheck', async () => {
      await runPostCheckCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.showStatus', () => {
      showStatusCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.enable', () => {
      enableMonitoring();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.disable', () => {
      disableMonitoring();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCompliance.showHistory', () => {
      showHistoryCommand();
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('aiCompliance')) {
        const newConfig = loadConfig();
        complianceUI.updateConfig(newConfig);
        fileWatcher.updateDebounceMs(newConfig.debounceMs);
        
        if (newConfig.enabled && !config.enabled) {
          enableMonitoring();
        } else if (!newConfig.enabled && config.enabled) {
          disableMonitoring();
        }
      }
    })
  );

  // Add disposables
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(complianceUI);
  context.subscriptions.push(fileWatcher);

  outputChannel.appendLine('✅ AI Compliance Monitor activated');
  outputChannel.appendLine(`📁 Workspace: ${workspaceRoot}`);
  outputChannel.appendLine(`⚙️  Monitoring: ${config.enabled ? 'Enabled' : 'Disabled'}`);
}

/**
 * Handle AI starting work
 */
async function handleAIStartWork() {
  const config = loadConfig();
  
  if (!config.enabled) {
    return;
  }

  // Start a new session
  const taskDescription = await getTaskDescription();
  const session = sessionManager.startSession(taskDescription);
  state.currentSession = session;

  const timestamp = sessionManager.formatTime(session.startTime);
  outputChannel.appendLine('');
  outputChannel.appendLine('╔═══════════════════════════════════════════════════════════╗');
  outputChannel.appendLine(`║  🎯 AI Task Session Started - #${session.sessionId.padEnd(32, ' ')}║`);
  outputChannel.appendLine('╚═══════════════════════════════════════════════════════════╝');
  outputChannel.appendLine(`🕐 [${timestamp}] 🤖 AI agent detected - Starting work...`);
  outputChannel.appendLine(`📝 Task: ${taskDescription}`);
  
  state.isAIWorking = true;
  state.status = 'checking';
  complianceUI.updateStatusBar(state);

  // Run pre-check if enabled
  if (config.autoRunPreCheck) {
    const modifiedFiles = fileWatcher.getModifiedFiles();
    
    const result = await complianceRunner.runPreCheck(taskDescription, modifiedFiles);
    
    if (result) {
      state.lastPreCheck = result;
      session.preCheckResult = result;
      complianceUI.showPreCheckResult(result, session);
      
      // Update status based on result
      if (result.status === 'BLOCK') {
        state.status = 'blocked';
        session.status = 'blocked';
      } else if (result.status === 'WARN') {
        state.status = 'warn';
        session.status = 'warn';
      } else {
        state.status = 'pass';
        session.status = 'pass';
      }
      
      complianceUI.updateStatusBar(state);
    } else {
      // Pre-check failed (script error)
      outputChannel.appendLine('⚠️  Pre-check failed, but session continues');
      state.status = 'warn';
      session.status = 'warn';
      complianceUI.updateStatusBar(state);
    }
  }
}

/**
 * Handle AI finishing work
 */
async function handleAIFinishWork(files: string[]) {
  const config = loadConfig();
  
  if (!config.enabled) {
    return;
  }

  const timestamp = sessionManager.formatTime(new Date());
  outputChannel.appendLine(`🕐 [${timestamp}] ✅ AI agent finished - Modified ${files.length} file(s)`);
  
  state.isAIWorking = false;
  state.status = 'checking';
  complianceUI.updateStatusBar(state);

  // Determine final status
  let finalStatus: 'violations' | 'blocked' | 'warn' | 'pass' = 'pass';
  
  // Run post-check if enabled
  if (config.autoRunPostCheck) {
    // Small delay to ensure files are saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await complianceRunner.runPostCheck(files);
    
    if (result) {
      state.lastPostCheck = result;
      
      // Update status based on result
      if (result.status === 'VIOLATIONS') {
        if (result.summary.criticalViolations > 0) {
          state.status = 'blocked';
          finalStatus = 'blocked';
        } else {
          state.status = 'violations';
          finalStatus = 'violations';
        }
      } else if (result.status === 'WARN') {
        state.status = 'warn';
        finalStatus = 'warn';
      } else {
        state.status = 'pass';
        finalStatus = 'pass';
      }
      
      // End session with result
      const session = sessionManager.endSession(files, finalStatus);
      if (session) {
        session.postCheckResult = result;
        state.sessionHistory = sessionManager.getHistory();
        complianceUI.showPostCheckResult(result, session);
      } else {
        complianceUI.showPostCheckResult(result);
      }
      
      complianceUI.updateStatusBar(state);
    } else {
      // Post-check failed (script error), but still end the session
      outputChannel.appendLine('⚠️  Post-check failed, but session will be recorded');
      finalStatus = 'violations'; // Mark as violations due to check failure
      state.status = 'warn';
      
      // End session even without result
      const session = sessionManager.endSession(files, finalStatus);
      if (session) {
        state.sessionHistory = sessionManager.getHistory();
        outputChannel.appendLine(`📝 Session #${session.sessionId} saved to history despite check failure`);
      }
      
      complianceUI.updateStatusBar(state);
    }
  } else {
    // Auto post-check disabled, but still end the session
    const session = sessionManager.endSession(files, finalStatus);
    if (session) {
      state.sessionHistory = sessionManager.getHistory();
    }
  }
}

/**
 * Get task description from user or recent activity
 */
async function getTaskDescription(): Promise<string> {
  // Try to get from active editor or recent git commit message
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const fileName = editor.document.fileName;
    return `Modifying ${fileName}`;
  }
  
  return 'AI agent code modification';
}

/**
 * Run pre-check command
 */
async function runPreCheckCommand() {
  outputChannel.show();
  
  const taskDescription = await vscode.window.showInputBox({
    prompt: 'Enter task description for pre-check',
    placeHolder: 'e.g., Adding new user authentication feature'
  });
  
  if (!taskDescription) {
    return;
  }

  state.status = 'checking';
  complianceUI.updateStatusBar(state);

  const modifiedFiles = await complianceRunner.getModifiedFiles();
  const result = await complianceRunner.runPreCheck(taskDescription, modifiedFiles);
  
  if (result) {
    state.lastPreCheck = result;
    complianceUI.showPreCheckResult(result);
    
    if (result.status === 'BLOCK') {
      state.status = 'blocked';
    } else if (result.status === 'WARN') {
      state.status = 'warn';
    } else {
      state.status = 'pass';
    }
  } else {
    state.status = 'idle';
  }
  
  complianceUI.updateStatusBar(state);
}

/**
 * Run post-check command
 */
async function runPostCheckCommand() {
  outputChannel.show();

  state.status = 'checking';
  complianceUI.updateStatusBar(state);

  const modifiedFiles = await complianceRunner.getModifiedFiles();
  const result = await complianceRunner.runPostCheck(modifiedFiles);
  
  if (result) {
    state.lastPostCheck = result;
    complianceUI.showPostCheckResult(result);
    
    if (result.status === 'VIOLATIONS') {
      if (result.summary.criticalViolations > 0) {
        state.status = 'blocked';
      } else {
        state.status = 'violations';
      }
    } else if (result.status === 'WARN') {
      state.status = 'warn';
    } else {
      state.status = 'pass';
    }
  } else {
    state.status = 'idle';
  }
  
  complianceUI.updateStatusBar(state);
}

/**
 * Show status command
 */
function showStatusCommand() {
  outputChannel.show();
  
  const stats = sessionManager.getStatistics();
  const currentSession = sessionManager.getCurrentSession();
  
  outputChannel.appendLine('\n═══════════════════════════════════════════════════');
  outputChannel.appendLine('📊 CURRENT COMPLIANCE STATUS');
  outputChannel.appendLine('═══════════════════════════════════════════════════');
  outputChannel.appendLine(`Status: ${state.status.toUpperCase()}`);
  outputChannel.appendLine(`AI Working: ${state.isAIWorking ? 'Yes' : 'No'}`);
  
  if (currentSession) {
    outputChannel.appendLine(`Current Session: #${currentSession.sessionId}`);
    outputChannel.appendLine(`Session Started: ${sessionManager.formatTimestamp(currentSession.startTime)}`);
  }
  
  outputChannel.appendLine('');
  outputChannel.appendLine('📈 Today\'s Statistics:');
  outputChannel.appendLine(`  Sessions: ${stats.todaySessions}`);
  outputChannel.appendLine(`  Total Violations: ${stats.totalViolations}`);
  outputChannel.appendLine(`  🔴 Critical: ${stats.criticalViolations}`);
  outputChannel.appendLine(`  🟠 High: ${stats.highViolations}`);
  outputChannel.appendLine(`  🟡 Medium: ${stats.mediumViolations}`);
  outputChannel.appendLine('');
  
  if (state.lastPreCheck) {
    outputChannel.appendLine('Last Pre-Check:');
    outputChannel.appendLine(`  Status: ${state.lastPreCheck.status}`);
    outputChannel.appendLine(`  Time: ${state.lastPreCheck.timestamp}`);
    outputChannel.appendLine(`  Violations: ${state.lastPreCheck.violations.length}`);
    outputChannel.appendLine('');
  }
  
  if (state.lastPostCheck) {
    outputChannel.appendLine('Last Post-Check:');
    outputChannel.appendLine(`  Status: ${state.lastPostCheck.status}`);
    outputChannel.appendLine(`  Time: ${state.lastPostCheck.timestamp}`);
    outputChannel.appendLine(`  Files Modified: ${state.lastPostCheck.summary.totalFilesModified}`);
    outputChannel.appendLine(`  Lines Changed: ${state.lastPostCheck.summary.totalLinesChanged}`);
    outputChannel.appendLine(`  Violations: ${state.lastPostCheck.summary.violationsCount}`);
  }
  
  outputChannel.appendLine('═══════════════════════════════════════════════════');
  outputChannel.appendLine('');
  outputChannel.appendLine('💡 Tip: Use "AI Compliance: Show History" to see all sessions');
}

/**
 * Show session history command
 */
function showHistoryCommand() {
  const sessions = sessionManager.getHistory(10); // Show last 10 sessions
  const stats = sessionManager.getStatistics();
  complianceUI.showSessionHistory(sessions, stats);
}

/**
 * Enable monitoring
 */
function enableMonitoring() {
  const config = vscode.workspace.getConfiguration('aiCompliance');
  config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
  
  state.status = 'idle';
  complianceUI.updateStatusBar(state);
  
  vscode.window.showInformationMessage('AI Compliance monitoring enabled');
  outputChannel.appendLine('✅ Monitoring enabled');
}

/**
 * Disable monitoring
 */
function disableMonitoring() {
  const config = vscode.workspace.getConfiguration('aiCompliance');
  config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
  
  state.status = 'disabled';
  complianceUI.updateStatusBar(state);
  
  vscode.window.showInformationMessage('AI Compliance monitoring disabled');
  outputChannel.appendLine('⏸️  Monitoring disabled');
}

/**
 * Load configuration
 */
function loadConfig(): ComplianceConfig {
  const config = vscode.workspace.getConfiguration('aiCompliance');
  
  return {
    enabled: config.get<boolean>('enabled', true),
    autoRunPreCheck: config.get<boolean>('autoRunPreCheck', true),
    autoRunPostCheck: config.get<boolean>('autoRunPostCheck', true),
    showNotifications: config.get<boolean>('showNotifications', true),
    notificationLevel: config.get<'all' | 'warnings' | 'violations'>('notificationLevel', 'warnings'),
    debounceMs: config.get<number>('debounceMs', 2000)
  };
}

/**
 * Extension deactivation
 */
export function deactivate() {
  outputChannel.appendLine('👋 AI Compliance Monitor deactivated');
}

