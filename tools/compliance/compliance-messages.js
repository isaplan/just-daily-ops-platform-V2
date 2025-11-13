#!/usr/bin/env node

/**
 * Compliance Message System
 * Provides user notifications, messages, and status updates
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ComplianceMessages {
  constructor() {
    this.projectRoot = process.cwd();
    this.messagesFile = path.join(this.projectRoot, '.ai-compliance-messages.json');
    this.statusFile = path.join(this.projectRoot, '.ai-compliance-status.json');
  }

  // Display prominent message to user
  showMessage(type, title, message, details = {}) {
    const timestamp = new Date().toISOString();
    
    // Console output with formatting
    console.log('\n' + '='.repeat(80));
    console.log(`🚨 ${type}: ${title}`);
    console.log('='.repeat(80));
    console.log(message);
    
    if (details.violations && details.violations.length > 0) {
      console.log('\n⚠️  VIOLATIONS DETECTED:');
      details.violations.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.type}: ${v.message}`);
        console.log(`     File: ${v.file}`);
        console.log(`     Action: ${v.requiredAction}`);
      });
    }
    
    if (details.existingCode && details.existingCode.length > 0) {
      console.log('\n🔍 EXISTING CODE FOUND:');
      details.existingCode.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Save to messages file
    this.saveMessage({
      type,
      title,
      message,
      details,
      timestamp
    });
    
    // Update status file
    this.updateStatus(type, title, message, timestamp);
  }

  // Pre-check message with manual abort option
  async showPreCheckMessage(result) {
    const title = result.status === 'BLOCK' ? '⚠️  PRE-CHECK BLOCKED' : 
                 result.status === 'WARN' ? '⚠️  PRE-CHECK WARNING' : 
                 '✅ PRE-CHECK PASSED';
    
    this.showMessage(result.status, title, result.message, {
      violations: result.violations || [],
      existingCode: result.existingCode || [],
      requiredAction: result.requiredAction
    });
    
    // If blocked, show abort prompt
    if (result.status === 'BLOCK') {
      return await this.promptUser('BLOCKED', result);
    }
    
    // If warning, show continue prompt
    if (result.status === 'WARN') {
      return await this.promptUser('WARNING', result);
    }
    
    return true; // Passed, proceed
  }

  // Post-check message
  showPostCheckMessage(result) {
    const title = result.status === 'VIOLATIONS' ? '🚨 POST-CHECK VIOLATIONS' : 
                 result.status === 'WARN' ? '⚠️  POST-CHECK WARNING' : 
                 '✅ POST-CHECK PASSED';
    
    this.showMessage(result.status, title, result.message, {
      violations: result.violations || [],
      summary: result.summary || {},
      requiredAction: result.requiredAction
    });
  }

  // Registry update message
  showRegistryUpdateMessage(updateResult) {
    if (updateResult.updated) {
      this.showMessage('INFO', '📋 REGISTRY UPDATED', 
        `Registry updated: ${updateResult.newCount} new functions detected`, {
          newFunctions: updateResult.newCount,
          totalFunctions: updateResult.total || 0
        });
    }
  }

  // Prompt user for action (block/warning)
  async promptUser(type, result) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const action = type === 'BLOCKED' ? 'ABORT' : 'CONTINUE';
      const prompt = `\n🔴 ${type} DETECTED\n` +
                    `Required Action: ${result.requiredAction}\n\n` +
                    `Do you want to ${action}? (yes/no): `;
      
      rl.question(prompt, (answer) => {
        rl.close();
        
        const proceed = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
        
        if (type === 'BLOCKED' && !proceed) {
          console.log('\n✅ User ABORTED - Changes will not proceed');
          this.saveMessage({
            type: 'USER_ABORT',
            title: 'User Manual Abort',
            message: 'User manually aborted after pre-check block',
            timestamp: new Date().toISOString()
          });
          resolve(false);
        } else if (type === 'BLOCKED' && proceed) {
          console.log('\n⚠️  User OVERRODE block - Proceeding despite violations');
          this.saveMessage({
            type: 'USER_OVERRIDE',
            title: 'User Override',
            message: 'User manually overrode pre-check block',
            timestamp: new Date().toISOString()
          });
          resolve(true);
        } else {
          resolve(proceed);
        }
      });
    });
  }

  // Save message to file
  saveMessage(message) {
    try {
      let messages = [];
      if (fs.existsSync(this.messagesFile)) {
        messages = JSON.parse(fs.readFileSync(this.messagesFile, 'utf8'));
      }
      
      messages.push(message);
      
      // Keep last 100 messages
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  // Update status file
  updateStatus(type, title, message, timestamp) {
    try {
      const status = {
        lastMessage: { type, title, message, timestamp },
        lastUpdated: timestamp,
        systemActive: true
      };
      
      fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
    } catch (error) {
      // Silent fail
    }
  }

  // Get latest messages
  getLatestMessages(count = 10) {
    try {
      if (fs.existsSync(this.messagesFile)) {
        const messages = JSON.parse(fs.readFileSync(this.messagesFile, 'utf8'));
        return messages.slice(-count);
      }
    } catch (error) {
      return [];
    }
    return [];
  }

  // Get current status
  getStatus() {
    try {
      if (fs.existsSync(this.statusFile)) {
        return JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
      }
    } catch (error) {
      return { systemActive: false };
    }
    return { systemActive: false };
  }
}

module.exports = ComplianceMessages;


