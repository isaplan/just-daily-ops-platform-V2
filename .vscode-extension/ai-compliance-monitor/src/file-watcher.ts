/**
 * File Watcher
 * Monitors file changes to detect AI agent activity
 */

import * as vscode from 'vscode';

export class FileWatcher {
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private textDocumentWatcher: vscode.Disposable[] = [];
  private modifiedFiles: Set<string> = new Set();
  private changeDebounceTimer: NodeJS.Timeout | undefined;
  private lastChangeTime: number = 0;
  private isAIWorking: boolean = false;
  private aiActivityTimeout: NodeJS.Timeout | undefined;

  constructor(
    private onAIStartWork: () => void,
    private onAIFinishWork: (files: string[]) => void,
    private debounceMs: number = 2000
  ) {
    this.setupWatchers();
  }

  /**
   * Setup file system watchers
   */
  private setupWatchers(): void {
    // Watch for document changes (in-memory edits)
    this.textDocumentWatcher.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        this.handleDocumentChange(event.document);
      })
    );

    // Watch for document saves
    this.textDocumentWatcher.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        this.handleDocumentSave(document);
      })
    );

    // Watch for file system changes
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const pattern = new vscode.RelativePattern(
        workspaceFolders[0],
        '**/*.{ts,tsx,js,jsx,json}'
      );
      
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
      
      this.fileWatcher.onDidChange(uri => {
        this.handleFileChange(uri);
      });

      this.fileWatcher.onDidCreate(uri => {
        this.handleFileChange(uri);
      });
    }
  }

  /**
   * Handle document change (in-memory)
   */
  private handleDocumentChange(document: vscode.TextDocument): void {
    if (!this.isRelevantFile(document.fileName)) {
      return;
    }

    // Detect if AI is working based on rapid changes
    const now = Date.now();
    const timeSinceLastChange = now - this.lastChangeTime;
    
    // If changes are happening rapidly (< 500ms apart), assume AI is working
    if (timeSinceLastChange < 500 && !this.isAIWorking) {
      this.isAIWorking = true;
      this.onAIStartWork();
    }

    this.lastChangeTime = now;
    this.addModifiedFile(document.fileName);
    
    // Reset the activity timeout
    this.resetAIActivityTimeout();
  }

  /**
   * Handle document save
   */
  private handleDocumentSave(document: vscode.TextDocument): void {
    if (!this.isRelevantFile(document.fileName)) {
      return;
    }

    this.addModifiedFile(document.fileName);
    this.resetAIActivityTimeout();
  }

  /**
   * Handle file system change
   */
  private handleFileChange(uri: vscode.Uri): void {
    if (!this.isRelevantFile(uri.fsPath)) {
      return;
    }

    this.addModifiedFile(uri.fsPath);
    this.resetAIActivityTimeout();
  }

  /**
   * Add modified file to tracking set
   */
  private addModifiedFile(filePath: string): void {
    // Convert to relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const relativePath = filePath.replace(workspaceRoot + '/', '');
      this.modifiedFiles.add(relativePath);
    }
  }

  /**
   * Reset AI activity timeout
   * If no changes happen for debounceMs, assume AI is done
   */
  private resetAIActivityTimeout(): void {
    if (this.aiActivityTimeout) {
      clearTimeout(this.aiActivityTimeout);
    }

    this.aiActivityTimeout = setTimeout(() => {
      if (this.isAIWorking && this.modifiedFiles.size > 0) {
        this.isAIWorking = false;
        const files = Array.from(this.modifiedFiles);
        this.modifiedFiles.clear();
        this.onAIFinishWork(files);
      }
    }, this.debounceMs);
  }

  /**
   * Check if file is relevant for compliance checking
   */
  private isRelevantFile(filePath: string): boolean {
    // Skip non-code files
    if (!filePath.match(/\.(ts|tsx|js|jsx|json)$/)) {
      return false;
    }

    // Skip excluded paths
    const excludedPaths = ['node_modules', '.git', '.next', 'dist', 'build', 'out'];
    if (excludedPaths.some(excluded => filePath.includes(excluded))) {
      return false;
    }

    // Skip the extension's own files
    if (filePath.includes('.vscode-extension')) {
      return false;
    }

    return true;
  }

  /**
   * Manually trigger AI start work (for external triggers)
   */
  triggerAIStartWork(): void {
    if (!this.isAIWorking) {
      this.isAIWorking = true;
      this.onAIStartWork();
    }
  }

  /**
   * Manually trigger AI finish work (for external triggers)
   */
  triggerAIFinishWork(files?: string[]): void {
    if (this.isAIWorking) {
      this.isAIWorking = false;
      const modifiedFiles = files || Array.from(this.modifiedFiles);
      this.modifiedFiles.clear();
      this.onAIFinishWork(modifiedFiles);
    }
  }

  /**
   * Get currently modified files
   */
  getModifiedFiles(): string[] {
    return Array.from(this.modifiedFiles);
  }

  /**
   * Check if AI is currently working
   */
  getIsAIWorking(): boolean {
    return this.isAIWorking;
  }

  /**
   * Update debounce time
   */
  updateDebounceMs(debounceMs: number): void {
    this.debounceMs = debounceMs;
  }

  /**
   * Dispose watchers
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    this.textDocumentWatcher.forEach(disposable => {
      disposable.dispose();
    });

    if (this.aiActivityTimeout) {
      clearTimeout(this.aiActivityTimeout);
    }

    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
    }
  }
}







