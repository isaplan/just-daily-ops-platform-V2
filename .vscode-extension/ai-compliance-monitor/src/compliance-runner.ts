/**
 * Compliance Runner
 * Executes pre-execution and post-execution check scripts
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { PreCheckResult, PostCheckResult } from './types';

const execAsync = promisify(exec);

export class ComplianceRunner {
  private workspaceRoot: string;
  private preCheckScript: string;
  private postCheckScript: string;
  private outputChannel: vscode.OutputChannel;

  constructor(workspaceRoot: string, outputChannel: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.preCheckScript = path.join(workspaceRoot, 'tools/compliance/pre-execution-check.js');
    this.postCheckScript = path.join(workspaceRoot, 'tools/compliance/post-execution-check.js');
    this.outputChannel = outputChannel;
  }

  /**
   * Run pre-execution check
   */
  async runPreCheck(taskDescription: string, targetFiles: string[] = []): Promise<PreCheckResult | null> {
    try {
      this.outputChannel.appendLine(`\n🔍 Running pre-execution check...`);
      this.outputChannel.appendLine(`Task: ${taskDescription}`);
      
      // Build command with arguments
      const args = [taskDescription, ...targetFiles].map(arg => `"${arg}"`).join(' ');
      const command = `node "${this.preCheckScript}" ${args}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Parse JSON output between delimiters
      const result = this.parseCheckOutput(stdout, '===PRE-EXECUTION-CHECK===', '===END-PRE-CHECK===');
      
      if (result) {
        this.outputChannel.appendLine(`✅ Pre-check completed: ${result.status}`);
        return result as PreCheckResult;
      }

      this.outputChannel.appendLine(`⚠️ Could not parse pre-check result`);
      return null;

    } catch (error: any) {
      this.outputChannel.appendLine(`❌ Pre-check error: ${error.message}`);
      
      // If exit code is 1, try to parse the output anyway
      if (error.code === 1 && error.stdout) {
        const result = this.parseCheckOutput(error.stdout, '===PRE-EXECUTION-CHECK===', '===END-PRE-CHECK===');
        if (result) {
          return result as PreCheckResult;
        }
      }
      
      return null;
    }
  }

  /**
   * Run post-execution check
   */
  async runPostCheck(targetFiles: string[] = []): Promise<PostCheckResult | null> {
    try {
      this.outputChannel.appendLine(`\n📋 Running post-execution check...`);
      
      // Build command with target files
      const args = targetFiles.map(file => `"${file}"`).join(' ');
      const command = `node "${this.postCheckScript}" ${args}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });

      // Parse JSON output between delimiters
      const result = this.parseCheckOutput(stdout, '===POST-EXECUTION-CHECK===', '===END-POST-CHECK===');
      
      if (result) {
        this.outputChannel.appendLine(`✅ Post-check completed: ${result.status}`);
        return result as PostCheckResult;
      }

      this.outputChannel.appendLine(`⚠️ Could not parse post-check result`);
      return null;

    } catch (error: any) {
      this.outputChannel.appendLine(`❌ Post-check error: ${error.message}`);
      
      // If exit code is 1, try to parse the output anyway
      if (error.code === 1 && error.stdout) {
        const result = this.parseCheckOutput(error.stdout, '===POST-EXECUTION-CHECK===', '===END-POST-CHECK===');
        if (result) {
          return result as PostCheckResult;
        }
      }
      
      return null;
    }
  }

  /**
   * Parse check output between delimiters
   */
  private parseCheckOutput(output: string, startDelimiter: string, endDelimiter: string): any {
    try {
      const startIndex = output.indexOf(startDelimiter);
      const endIndex = output.indexOf(endDelimiter);
      
      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      const jsonStr = output.substring(startIndex + startDelimiter.length, endIndex).trim();
      return JSON.parse(jsonStr);

    } catch (error) {
      return null;
    }
  }

  /**
   * Get modified files from git
   */
  async getModifiedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.workspaceRoot
      });

      const files = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim())
        .filter(file => 
          file.match(/\.(ts|tsx|js|jsx|json)$/) && 
          !file.includes('node_modules')
        );

      return files;

    } catch (error) {
      return [];
    }
  }
}







