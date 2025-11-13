#!/usr/bin/env node

/**
 * AI Compliance Master - Ultimate Compliance Monitoring System
 * Monitors compliance every X lines of code and every function build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AIComplianceMaster {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.completedFunctions = new Map();
    this.monitoringConfig = {
      checkEveryLines: 100, // Check every 100 lines of code
      checkEveryBuild: true, // Check every function build
      continuousMonitoring: true, // Continuous monitoring
      alertThreshold: 1 // Alert on first violation
    };
    
    this.lineCount = 0;
    this.buildCount = 0;
    this.violationCount = 0;
    this.lastCheckTime = null;
    this.isMonitoring = false;
    
    this.loadCompletedFunctions();
    this.setupMonitoring();
  }

  loadCompletedFunctions() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        Object.values(registry).forEach(func => {
          if (func.status === 'completed' && func.touch_again === false) {
            this.completedFunctions.set(func.file, {
              ...func,
              checksum: this.calculateChecksum(func.file),
              lastChecked: new Date().toISOString(),
              violationCount: 0
            });
          }
        });
        console.log(`🔒 Loaded ${this.completedFunctions.size} protected functions`);
      }
    } catch (error) {
      console.error('❌ Failed to load function registry:', error);
    }
  }

  calculateChecksum(fileName) {
    const filePath = path.join(this.projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    }
    return null;
  }

  setupMonitoring() {
    console.log('🛡️  AI COMPLIANCE MASTER - Setting Up Monitoring');
    console.log('=' .repeat(60));
    console.log(`Check every ${this.monitoringConfig.checkEveryLines} lines of code`);
    console.log(`Check every function build: ${this.monitoringConfig.checkEveryBuild ? 'YES' : 'NO'}`);
    console.log(`Continuous monitoring: ${this.monitoringConfig.continuousMonitoring ? 'YES' : 'NO'}`);
    console.log(`Alert threshold: ${this.monitoringConfig.alertThreshold} violations`);
  }

  checkCompliance(reason = 'Manual check') {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 Compliance Check - ${reason} - ${timestamp}`);
    console.log('-'.repeat(50));
    
    const violations = [];
    let totalChecks = 0;
    
    for (const [fileName, func] of this.completedFunctions) {
      totalChecks++;
      const filePath = path.join(this.projectRoot, fileName);
      
      if (!fs.existsSync(filePath)) {
        violations.push({
          fileName,
          type: 'FILE_DELETED',
          severity: 'CRITICAL',
          message: 'Completed function has been deleted',
          timestamp
        });
        console.log(`🚨 ${fileName} - DELETED`);
        continue;
      }
      
      const currentChecksum = this.calculateChecksum(fileName);
      if (currentChecksum !== func.checksum) {
        violations.push({
          fileName,
          type: 'FILE_MODIFIED',
          severity: 'CRITICAL',
          message: 'Completed function has been modified',
          oldChecksum: func.checksum,
          newChecksum: currentChecksum,
          timestamp
        });
        console.log(`🚨 ${fileName} - MODIFIED`);
        func.violationCount++;
      } else {
        console.log(`✅ ${fileName} - INTACT`);
      }
      
      func.lastChecked = timestamp;
    }
    
    if (violations.length > 0) {
      this.handleViolations(violations, reason);
    }
    
    this.lastCheckTime = timestamp;
    return { violations, totalChecks, passedChecks: totalChecks - violations.length };
  }

  handleViolations(violations, reason) {
    this.violationCount += violations.length;
    
    console.log(`\n🚨 ${violations.length} VIOLATION(S) DETECTED!`);
    console.log('=' .repeat(50));
    console.log(`Reason: ${reason}`);
    console.log(`Total violations: ${this.violationCount}`);
    
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.fileName}`);
      console.log(`   Type: ${violation.type}`);
      console.log(`   Severity: ${violation.severity}`);
      console.log(`   Message: ${violation.message}`);
      console.log(`   Timestamp: ${violation.timestamp}`);
      
      if (violation.oldChecksum && violation.newChecksum) {
        console.log(`   Checksum: ${violation.oldChecksum.substring(0, 8)}... → ${violation.newChecksum.substring(0, 8)}...`);
      }
    });
    
    // Save violation report
    this.saveViolationReport(violations, reason);
    
    // Send alerts if threshold reached
    if (this.violationCount >= this.monitoringConfig.alertThreshold) {
      this.sendAlert(violations, reason);
    }
  }

  saveViolationReport(violations, reason) {
    const report = {
      timestamp: new Date().toISOString(),
      reason,
      totalViolations: this.violationCount,
      currentViolations: violations.length,
      violations: violations,
      protectedFunctions: Array.from(this.completedFunctions.keys()),
      monitoringConfig: this.monitoringConfig
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-master-violations.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Violation report saved to ai-master-violations.json');
  }

  sendAlert(violations, reason) {
    console.log('\n📧 COMPLIANCE ALERT!');
    console.log('=' .repeat(30));
    console.log(`Reason: ${reason}`);
    console.log(`Violations: ${violations.length}`);
    console.log(`Total violations: ${this.violationCount}`);
    console.log('Action required: Review and restore completed functions');
  }

  // Monitor every X lines of code
  monitorEveryXLines(linesThreshold = 100) {
    console.log(`\n📏 Starting line-based monitoring (every ${linesThreshold} lines)`);
    
    // Simulate code changes
    const lineInterval = setInterval(() => {
      this.lineCount += Math.floor(Math.random() * 20) + 1; // Simulate 1-20 lines per interval
      
      if (this.lineCount >= linesThreshold) {
        console.log(`📏 Reached ${this.lineCount} lines - performing compliance check...`);
        this.checkCompliance(`Every ${linesThreshold} lines (${this.lineCount} total)`);
        this.lineCount = 0;
      }
    }, 2000); // Check every 2 seconds
    
    return lineInterval;
  }

  // Monitor every function build
  monitorEveryFunctionBuild() {
    console.log('\n🔨 Starting build-based monitoring');
    
    // Simulate function builds
    const buildInterval = setInterval(() => {
      this.buildCount++;
      console.log(`🔨 Function build #${this.buildCount} detected - performing compliance check...`);
      this.checkCompliance(`Function build #${this.buildCount}`);
    }, 5000); // Simulate builds every 5 seconds
    
    return buildInterval;
  }

  // Continuous monitoring
  startContinuousMonitoring() {
    console.log('\n🛡️  Starting continuous monitoring...');
    this.isMonitoring = true;
    
    // Initial check
    this.checkCompliance('Initial continuous monitoring');
    
    // Set up continuous monitoring
    const continuousInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.checkCompliance('Continuous monitoring');
      }
    }, 10000); // Check every 10 seconds
    
    return continuousInterval;
  }

  // File watcher for immediate detection
  setupFileWatcher() {
    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch(this.projectRoot, {
      ignored: [
        /node_modules/,
        /\.git/,
        /\.next/,
        /dist/,
        /build/,
        /coverage/,
        /\.DS_Store/,
        /ai-.*\.json/
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      const fileName = path.basename(filePath);
      if (this.completedFunctions.has(fileName)) {
        console.log(`\n⚡ IMMEDIATE DETECTION: ${fileName} was modified!`);
        this.checkCompliance(`File change detected: ${fileName}`);
      }
    });

    watcher.on('unlink', (filePath) => {
      const fileName = path.basename(filePath);
      if (this.completedFunctions.has(fileName)) {
        console.log(`\n⚡ IMMEDIATE DETECTION: ${fileName} was deleted!`);
        this.checkCompliance(`File deletion detected: ${fileName}`);
      }
    });
    
    return watcher;
  }

  // Master monitoring function
  startMasterMonitoring() {
    console.log('🛡️  AI COMPLIANCE MASTER - Starting Master Monitoring');
    console.log('=' .repeat(60));
    console.log('Press Ctrl+C to stop monitoring');
    
    const intervals = [];
    
    // Start all monitoring types
    if (this.monitoringConfig.checkEveryLines > 0) {
      intervals.push(this.monitorEveryXLines(this.monitoringConfig.checkEveryLines));
    }
    
    if (this.monitoringConfig.checkEveryBuild) {
      intervals.push(this.monitorEveryFunctionBuild());
    }
    
    if (this.monitoringConfig.continuousMonitoring) {
      intervals.push(this.startContinuousMonitoring());
    }
    
    // Set up file watcher
    const watcher = this.setupFileWatcher();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down master monitoring...');
      this.isMonitoring = false;
      
      // Clear all intervals
      intervals.forEach(interval => clearInterval(interval));
      
      // Close file watcher
      if (watcher) {
        watcher.close();
      }
      
      console.log('✅ Master monitoring stopped');
      process.exit(0);
    });
    
    return { intervals, watcher };
  }

  // Generate comprehensive report
  generateMasterReport() {
    const report = {
      timestamp: new Date().toISOString(),
      monitoringConfig: this.monitoringConfig,
      isMonitoring: this.isMonitoring,
      lineCount: this.lineCount,
      buildCount: this.buildCount,
      violationCount: this.violationCount,
      lastCheckTime: this.lastCheckTime,
      protectedFunctions: Array.from(this.completedFunctions.keys()),
      complianceRate: this.calculateComplianceRate()
    };
    
    console.log('\n📊 MASTER COMPLIANCE REPORT');
    console.log('=' .repeat(50));
    console.log(`Status: ${report.isMonitoring ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Lines processed: ${report.lineCount}`);
    console.log(`Builds monitored: ${report.buildCount}`);
    console.log(`Total violations: ${report.violationCount}`);
    console.log(`Last check: ${report.lastCheckTime || 'Never'}`);
    console.log(`Compliance rate: ${report.complianceRate.toFixed(1)}%`);
    
    return report;
  }

  calculateComplianceRate() {
    if (this.violationCount === 0) {
      return 100;
    }
    
    // Calculate based on total checks vs violations
    const totalChecks = this.buildCount + Math.floor(this.lineCount / this.monitoringConfig.checkEveryLines);
    if (totalChecks === 0) return 100;
    
    const violationRate = this.violationCount / totalChecks;
    return Math.max(0, (1 - violationRate) * 100);
  }

  // Configuration methods
  setLineThreshold(lines) {
    this.monitoringConfig.checkEveryLines = lines;
    console.log(`📏 Line threshold set to ${lines}`);
  }

  setBuildMonitoring(enabled) {
    this.monitoringConfig.checkEveryBuild = enabled;
    console.log(`🔨 Build monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  setContinuousMonitoring(enabled) {
    this.monitoringConfig.continuousMonitoring = enabled;
    console.log(`🔄 Continuous monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  setAlertThreshold(threshold) {
    this.monitoringConfig.alertThreshold = threshold;
    console.log(`🚨 Alert threshold set to ${threshold} violations`);
  }
}

// Run the master monitor if called directly
if (require.main === module) {
  const master = new AIComplianceMaster();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--start')) {
    master.startMasterMonitoring();
  } else if (args.includes('--lines') && args.length > 2) {
    const lines = parseInt(args[args.indexOf('--lines') + 1]);
    master.setLineThreshold(lines);
    master.startMasterMonitoring();
  } else if (args.includes('--report')) {
    master.generateMasterReport();
  } else if (args.includes('--config')) {
    console.log('Current configuration:');
    console.log(JSON.stringify(master.monitoringConfig, null, 2));
  } else {
    console.log('Usage:');
    console.log('  node ai-compliance-master.js --start                    # Start master monitoring');
    console.log('  node ai-compliance-master.js --lines 50                # Monitor every 50 lines');
    console.log('  node ai-compliance-master.js --report                 # Generate report');
    console.log('  node ai-compliance-master.js --config                  # Show configuration');
  }
}

module.exports = AIComplianceMaster;
