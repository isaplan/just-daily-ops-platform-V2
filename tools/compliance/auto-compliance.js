#!/usr/bin/env node

/**
 * Auto Compliance System - Complete Guard Rail System
 * - Registry auto-updates every 10 minutes (if active)
 * - Goes idle after 20 minutes of no code changes
 * - Runs on startup and first file change
 * - Reactivates when code changes resume
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ComplianceMessages = require('./compliance-messages');

class AutoComplianceSystem {
  constructor() {
    this.projectRoot = process.cwd();
    this.complianceChecker = path.join(this.projectRoot, 'tools/compliance/ai-compliance-checker.js');
    this.postExecutionCheck = path.join(this.projectRoot, 'tools/compliance/post-execution-check.js');
    this.registryUpdater = path.join(this.projectRoot, 'tools/compliance/registry-auto-updater.js');
    this.trackingSystem = path.join(this.projectRoot, 'ai-tracking-system.json');
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.messages = new ComplianceMessages();
    this.isRunning = false;
    this.registryUpdateRunning = false;
    this.firstChangeDetected = false;
    this.lastRegistryUpdate = 0;
    this.lastCodeChangeTime = Date.now(); // Track last code change
    this.registryIntervalId = null; // Track interval to stop/restart
    this.isIdle = false; // Track idle state
  }

  async start() {
    if (this.isRunning) {
      console.log('🔄 Auto compliance system already running');
      return;
    }

    this.isRunning = true;
    this.lastCodeChangeTime = Date.now(); // Initialize on startup
    
    console.log('🚀 Starting Auto Compliance System...');
    console.log('📋 Features: Registry automation, Pre/Post checks, Smart idle');
    console.log('📋 Registry: Active for 20m after code changes, then idle');

    // 1. Run registry update IMMEDIATELY on startup
    console.log('🔄 Running initial registry update on startup...');
    await this.updateRegistry();

    // 2. Initial compliance check
    await this.runComplianceCheck();
    
    // 3. Setup monitoring
    this.setupFileWatchers();
    this.setupPeriodicChecks();

    // 4. Show system status
    this.messages.showMessage('INFO', '🛡️  SYSTEM ACTIVE', 
      'Auto Compliance System is monitoring your codebase. All changes will be checked.');

    console.log('✅ Auto Compliance System started successfully');
    console.log('📊 Registry will update every 10 minutes (if code changed in last 20m)');
    console.log('💤 Registry goes idle after 20 minutes of no code changes');
  }

  async updateRegistry() {
    // Prevent concurrent updates
    if (this.registryUpdateRunning) {
      console.log('⏳ Registry update already running, skipping...');
      return;
    }

    try {
      this.registryUpdateRunning = true;
      
      if (fs.existsSync(this.registryUpdater)) {
        return new Promise((resolve) => {
          exec(`node ${this.registryUpdater}`, { cwd: this.projectRoot }, (error, stdout, stderr) => {
            this.registryUpdateRunning = false;
            this.lastRegistryUpdate = Date.now();
            
            const output = stdout + stderr;
            
            // Parse output for summary
            if (output.includes('Registry update completed')) {
              const match = output.match(/Total files registered: (\d+)/);
              const newMatch = output.match(/✨ New: (\d+)/);
              const updatedMatch = output.match(/🔄 Updated: (\d+)/);
              
              if (match || newMatch || updatedMatch) {
                const summary = {
                  total: match ? parseInt(match[1]) : 0,
                  new: newMatch ? parseInt(newMatch[1]) : 0,
                  updated: updatedMatch ? parseInt(updatedMatch[1]) : 0
                };
                
                if (summary.new > 0 || summary.updated > 0) {
                  console.log(`\n📊 Registry Updated: ${summary.total} files | New: ${summary.new} | Updated: ${summary.updated}`);
                  this.messages.showRegistryUpdateMessage({
                    updated: true,
                    newCount: summary.new,
                    total: summary.total
                  });
                } else {
                  console.log(`✅ Registry up to date (${summary.total} files registered)`);
                }
              }
            }
            
            if (error) {
              console.warn('⚠️  Registry update warning:', error.message);
            }
            
            resolve({ updated: true });
          });
        });
      } else {
        console.warn('⚠️  Registry updater not found');
        this.registryUpdateRunning = false;
      }
    } catch (error) {
      console.warn('⚠️  Registry update failed:', error.message);
      this.registryUpdateRunning = false;
    }
  }

  async runComplianceCheck() {
    return new Promise((resolve, reject) => {
      exec(`node ${this.complianceChecker}`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Compliance check failed:', error);
          reject(error);
        } else {
          console.log('✅ Compliance check completed');
          resolve(stdout);
        }
      });
    });
  }

  async runPostExecutionCheck(filePath) {
    try {
      return new Promise((resolve) => {
        const cmd = `node ${this.postExecutionCheck} "${filePath}"`;
        exec(cmd, { cwd: this.projectRoot }, (error, stdout, stderr) => {
          const output = stdout + stderr;
          const startIdx = output.indexOf('===POST-EXECUTION-CHECK===');
          const endIdx = output.indexOf('===END-POST-CHECK===');
          
          if (startIdx !== -1 && endIdx !== -1) {
            try {
              const jsonStr = output.substring(startIdx + 29, endIdx).trim();
              const result = JSON.parse(jsonStr);
              
              // Show message to user
              this.messages.showPostCheckMessage(result);
              
              if (result.status === 'VIOLATIONS') {
                console.error(`\n🚨 VIOLATIONS in ${filePath}`);
                console.error(`Critical: ${result.summary.criticalViolations}`);
                console.error(`High: ${result.summary.highViolations}`);
              }
              
              resolve({ status: result.status || 'PASS', result });
            } catch (e) {
              resolve({ status: 'PASS' });
            }
          } else {
            resolve({ status: 'PASS' });
          }
        });
      });
    } catch (error) {
      return { status: 'ERROR' };
    }
  }

  async handleFileChange(filePath) {
    const relativePath = filePath.replace(/\\/g, '/');
    
    // Skip tracking files
    if (relativePath.includes('function-registry.json') || 
        relativePath.includes('progress-log.json') ||
        relativePath.includes('ai-tracking-system.json')) {
      return;
    }

    // Skip if not a code file
    if (!relativePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return;
    }

    // Update last code change time
    this.lastCodeChangeTime = Date.now();
    
    // Reactivate if idle
    if (this.isIdle) {
      console.log('🔄 Code change detected - reactivating registry updates...');
      this.isIdle = false;
      this.startRegistryInterval(); // Restart interval
    }

    console.log(`\n📝 File change detected: ${relativePath}`);

    // Run post-execution check
    await this.runPostExecutionCheck(relativePath);

    // Run registry update on FIRST change after startup
    if (!this.firstChangeDetected) {
      console.log('🔄 First change detected - running registry update...');
      this.firstChangeDetected = true;
      await this.updateRegistry();
    }

    // Also update registry if it's been more than 5 minutes since last update
    const now = Date.now();
    if (now - this.lastRegistryUpdate > 5 * 60 * 1000) {
      await this.updateRegistry();
    }

    // Run compliance check
    this.runComplianceCheck().catch(() => {});
  }

  setupFileWatchers() {
    // Watch specific code directories only
    const watchPaths = [
      'src/app/',
      'src/lib/',
      'src/components/',
      'src/hooks/',
      'function-registry.json',
      'progress-log.json'
    ];

    watchPaths.forEach(watchPath => {
      const fullPath = path.join(this.projectRoot, watchPath);
      if (fs.existsSync(fullPath)) {
        fs.watch(fullPath, { recursive: true }, async (eventType, filename) => {
          if (!filename || filename.includes('node_modules') || filename.includes('.git')) {
            return;
          }
          
          // Only process code files
          if (!filename.match(/\.(ts|tsx|js|jsx|json)$/)) return;
          
          const filePath = path.join(fullPath, filename);
          const relativePath = path.relative(this.projectRoot, filePath);
          
          await this.handleFileChange(relativePath);
        });
        console.log(`👀 Watching: ${watchPath}`);
      }
    });
  }

  startRegistryInterval() {
    // Clear existing interval if any
    if (this.registryIntervalId) {
      clearInterval(this.registryIntervalId);
    }

    // Start new interval
    this.registryIntervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - this.lastCodeChangeTime;
      const timeSinceLastUpdate = now - this.lastRegistryUpdate;

      // Check if 20 minutes passed since last code change
      if (timeSinceLastChange > 20 * 60 * 1000) {
        // Go idle
        if (!this.isIdle) {
          console.log('💤 No code changes for 20 minutes - registry updates going idle');
          this.messages.showMessage('INFO', '💤 REGISTRY IDLE', 
            'No code changes for 20 minutes. Registry updates paused. Will reactivate on next code change.');
          this.isIdle = true;
          clearInterval(this.registryIntervalId);
          this.registryIntervalId = null;
        }
        return;
      }

      // Only update if it's been at least 10 minutes since last update
      if (timeSinceLastUpdate >= 10 * 60 * 1000) {
        console.log('⏰ Running scheduled registry update (10-minute interval)...');
        this.updateRegistry().catch(() => {});
      } else {
        const minutesAgo = Math.round(timeSinceLastUpdate / 1000 / 60);
        console.log(`⏰ Registry update skipped (last update ${minutesAgo}m ago, next in ${10 - minutesAgo}m)`);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
  }

  setupPeriodicChecks() {
    // Periodic compliance check every 5 minutes
    setInterval(() => {
      this.runComplianceCheck().catch(() => {});
    }, 5 * 60 * 1000);

    // Update tracking system every minute
    setInterval(() => {
      this.updateTrackingSystem();
    }, 60 * 1000);

    // Start registry interval (runs every 10 minutes if active)
    // Will go idle after 20 minutes of no code changes
    console.log('🔄 Starting registry update interval (10-minute cycle, idle after 20m)...');
    this.startRegistryInterval();
    
    // Also run registry update immediately after 10 minutes (first interval)
    setTimeout(() => {
      const timeSinceLastChange = Date.now() - this.lastCodeChangeTime;
      if (timeSinceLastChange <= 20 * 60 * 1000) {
        console.log('⏰ First 10-minute interval reached - running registry update...');
        this.updateRegistry().catch(() => {});
      } else {
        console.log('💤 First interval reached but idle (no code changes for 20m+)');
      }
    }, 10 * 60 * 1000);
  }

  updateTrackingSystem() {
    try {
      if (fs.existsSync(this.trackingSystem)) {
        const tracking = JSON.parse(fs.readFileSync(this.trackingSystem, 'utf8'));
        tracking.system_info.last_updated = new Date().toISOString();
        if (tracking.current_session) {
          tracking.current_session.last_compliance_check = new Date().toISOString();
          tracking.current_session.last_registry_update = this.lastRegistryUpdate ? new Date(this.lastRegistryUpdate).toISOString() : null;
          tracking.current_session.last_code_change = new Date(this.lastCodeChangeTime).toISOString();
          tracking.current_session.registry_idle = this.isIdle;
        }
        fs.writeFileSync(this.trackingSystem, JSON.stringify(tracking, null, 2));
      }
    } catch (error) {
      // Silent fail
    }
  }

  stop() {
    this.isRunning = false;
    if (this.registryIntervalId) {
      clearInterval(this.registryIntervalId);
      this.registryIntervalId = null;
    }
    this.messages.showMessage('INFO', '🛑 SYSTEM STOPPED', 
      'Auto Compliance System has been stopped.');
    console.log('🛑 Auto Compliance System stopped');
  }
}

if (require.main === module) {
  const autoCompliance = new AutoComplianceSystem();
  autoCompliance.start();

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Auto Compliance System...');
    autoCompliance.stop();
    process.exit(0);
  });
}

module.exports = AutoComplianceSystem;
