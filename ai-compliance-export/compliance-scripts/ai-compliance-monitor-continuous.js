#!/usr/bin/env node

/**
 * AI Compliance Monitor - Continuous Monitoring System
 * Monitors compliance every X lines of code or every function build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ContinuousComplianceMonitor {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.completedFunctions = new Map();
    this.monitoringInterval = 5000; // Check every 5 seconds
    this.isMonitoring = false;
    this.violationCount = 0;
    this.lastCheckTime = null;
    
    this.loadCompletedFunctions();
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
              lastChecked: new Date().toISOString()
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

  checkFunctionIntegrity(fileName) {
    const func = this.completedFunctions.get(fileName);
    if (!func) return { status: 'NOT_PROTECTED' };
    
    const currentChecksum = this.calculateChecksum(fileName);
    const filePath = path.join(this.projectRoot, fileName);
    
    if (!fs.existsSync(filePath)) {
      return {
        status: 'VIOLATION',
        type: 'FILE_DELETED',
        severity: 'CRITICAL',
        message: 'Completed function has been deleted'
      };
    }
    
    if (currentChecksum !== func.checksum) {
      return {
        status: 'VIOLATION',
        type: 'FILE_MODIFIED',
        severity: 'CRITICAL',
        message: 'Completed function has been modified',
        oldChecksum: func.checksum,
        newChecksum: currentChecksum
      };
    }
    
    return {
      status: 'INTACT',
      message: 'Function is unchanged'
    };
  }

  performComplianceCheck() {
    const timestamp = new Date().toISOString();
    const violations = [];
    
    console.log(`\n🔍 Compliance Check - ${timestamp}`);
    console.log('-'.repeat(50));
    
    for (const [fileName, func] of this.completedFunctions) {
      const checkResult = this.checkFunctionIntegrity(fileName);
      
      if (checkResult.status === 'VIOLATION') {
        violations.push({
          fileName,
          ...checkResult,
          timestamp
        });
        
        console.log(`🚨 VIOLATION: ${fileName} - ${checkResult.message}`);
        this.violationCount++;
      } else {
        console.log(`✅ ${fileName} - ${checkResult.message}`);
      }
      
      // Update last checked time
      func.lastChecked = timestamp;
    }
    
    if (violations.length > 0) {
      this.handleViolations(violations);
    }
    
    this.lastCheckTime = timestamp;
    return violations;
  }

  handleViolations(violations) {
    console.log(`\n🚨 ${violations.length} VIOLATION(S) DETECTED!`);
    console.log('=' .repeat(50));
    
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.fileName}`);
      console.log(`   Type: ${violation.type}`);
      console.log(`   Severity: ${violation.severity}`);
      console.log(`   Message: ${violation.message}`);
      console.log(`   Timestamp: ${violation.timestamp}`);
      
      if (violation.oldChecksum && violation.newChecksum) {
        console.log(`   Checksum changed: ${violation.oldChecksum.substring(0, 8)}... → ${violation.newChecksum.substring(0, 8)}...`);
      }
    });
    
    // Save violation report
    this.saveViolationReport(violations);
    
    // Send alerts
    this.sendViolationAlerts(violations);
  }

  saveViolationReport(violations) {
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations: this.violationCount,
      currentViolations: violations.length,
      violations: violations,
      protectedFunctions: Array.from(this.completedFunctions.keys())
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-continuous-violations.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Violation report saved to ai-continuous-violations.json');
  }

  sendViolationAlerts(violations) {
    console.log('\n📧 SENDING VIOLATION ALERTS:');
    violations.forEach(violation => {
      console.log(`🚨 ALERT: ${violation.fileName} - ${violation.type} - ${violation.severity}`);
    });
  }

  startContinuousMonitoring() {
    console.log('🛡️  AI COMPLIANCE MONITOR - Starting Continuous Monitoring');
    console.log('=' .repeat(60));
    console.log(`Monitoring interval: ${this.monitoringInterval}ms`);
    console.log(`Protected functions: ${this.completedFunctions.size}`);
    console.log('Press Ctrl+C to stop monitoring');
    
    this.isMonitoring = true;
    
    // Initial check
    this.performComplianceCheck();
    
    // Set up continuous monitoring
    this.monitoringTimer = setInterval(() => {
      if (this.isMonitoring) {
        this.performComplianceCheck();
      }
    }, this.monitoringInterval);
    
    // Set up file watcher for immediate detection
    this.setupFileWatcher();
  }

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
        /ai-compliance-.*\.json/
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      const fileName = path.basename(filePath);
      if (this.completedFunctions.has(fileName)) {
        console.log(`\n⚡ IMMEDIATE DETECTION: ${fileName} was modified!`);
        this.performComplianceCheck();
      }
    });

    watcher.on('unlink', (filePath) => {
      const fileName = path.basename(filePath);
      if (this.completedFunctions.has(fileName)) {
        console.log(`\n⚡ IMMEDIATE DETECTION: ${fileName} was deleted!`);
        this.performComplianceCheck();
      }
    });
  }

  stopMonitoring() {
    console.log('\n🛑 Stopping continuous monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    console.log('✅ Monitoring stopped');
  }

  generateMonitoringReport() {
    const report = {
      timestamp: new Date().toISOString(),
      isMonitoring: this.isMonitoring,
      monitoringInterval: this.monitoringInterval,
      totalViolations: this.violationCount,
      lastCheckTime: this.lastCheckTime,
      protectedFunctions: Array.from(this.completedFunctions.keys()),
      complianceRate: this.calculateComplianceRate()
    };
    
    console.log('\n📊 MONITORING REPORT');
    console.log('=' .repeat(40));
    console.log(`Status: ${report.isMonitoring ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Interval: ${report.monitoringInterval}ms`);
    console.log(`Total Violations: ${report.totalViolations}`);
    console.log(`Last Check: ${report.lastCheckTime || 'Never'}`);
    console.log(`Compliance Rate: ${report.complianceRate.toFixed(1)}%`);
    
    return report;
  }

  calculateComplianceRate() {
    if (this.violationCount === 0) {
      return 100;
    }
    
    // Simple calculation - in reality, this would be more sophisticated
    const totalChecks = this.completedFunctions.size * 10; // Assume 10 checks per function
    const violationRate = this.violationCount / totalChecks;
    return Math.max(0, (1 - violationRate) * 100);
  }

  // Method to check compliance every X lines of code
  checkEveryXLines(linesThreshold = 100) {
    console.log(`🔍 Checking compliance every ${linesThreshold} lines of code...`);
    
    // This would integrate with a code editor or build system
    // For now, we'll simulate it
    let lineCount = 0;
    
    const checkInterval = setInterval(() => {
      lineCount += Math.floor(Math.random() * 50); // Simulate code changes
      
      if (lineCount >= linesThreshold) {
        console.log(`📏 Reached ${lineCount} lines - performing compliance check...`);
        this.performComplianceCheck();
        lineCount = 0;
      }
    }, 1000);
    
    return checkInterval;
  }

  // Method to check compliance every function build
  checkEveryFunctionBuild() {
    console.log('🔍 Checking compliance every function build...');
    
    // This would integrate with a build system
    // For now, we'll simulate it
    const buildInterval = setInterval(() => {
      console.log('🔨 Function build detected - performing compliance check...');
      this.performComplianceCheck();
    }, 10000); // Simulate builds every 10 seconds
    
    return buildInterval;
  }
}

// Run the monitor if called directly
if (require.main === module) {
  const monitor = new ContinuousComplianceMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down continuous monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous')) {
    monitor.startContinuousMonitoring();
  } else if (args.includes('--lines') && args.length > 2) {
    const lines = parseInt(args[args.indexOf('--lines') + 1]);
    monitor.checkEveryXLines(lines);
  } else if (args.includes('--build')) {
    monitor.checkEveryFunctionBuild();
  } else if (args.includes('--report')) {
    monitor.generateMonitoringReport();
  } else {
    console.log('Usage:');
    console.log('  node ai-compliance-monitor-continuous.js --continuous  # Start continuous monitoring');
    console.log('  node ai-compliance-monitor-continuous.js --lines 100   # Check every 100 lines');
    console.log('  node ai-compliance-monitor-continuous.js --build       # Check every function build');
    console.log('  node ai-compliance-monitor-continuous.js --report      # Generate monitoring report');
  }
}

module.exports = ContinuousComplianceMonitor;
