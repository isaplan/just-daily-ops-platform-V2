#!/usr/bin/env node

/**
 * AI Compliance Monitor - Real-time Compliance Enforcement
 * Continuously monitors for rule violations and prevents them
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class AIComplianceMonitor {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.completedFunctions = new Set();
    this.violations = [];
    this.isMonitoring = false;
    
    this.loadCompletedFunctions();
  }

  loadCompletedFunctions() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        Object.values(registry).forEach(func => {
          if (func.status === 'completed' && func.touch_again === false) {
            this.completedFunctions.add(func.file);
          }
        });
        console.log(`🔒 Loaded ${this.completedFunctions.size} protected functions`);
      }
    } catch (error) {
      console.error('❌ Failed to load function registry:', error);
    }
  }

  startMonitoring() {
    console.log('🛡️  AI COMPLIANCE MONITOR - Starting Real-time Protection');
    console.log('=' .repeat(60));
    
    this.isMonitoring = true;
    
    // Monitor all files in the project
    const watcher = chokidar.watch(this.projectRoot, {
      ignored: [
        /node_modules/,
        /\.git/,
        /\.next/,
        /dist/,
        /build/,
        /coverage/,
        /\.DS_Store/
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });

    watcher.on('add', (filePath) => {
      this.handleFileAdd(filePath);
    });

    watcher.on('unlink', (filePath) => {
      this.handleFileDelete(filePath);
    });

    console.log('✅ Monitoring started - Protecting completed functions');
    console.log('🔒 Protected functions:', Array.from(this.completedFunctions));
    
    return watcher;
  }

  handleFileChange(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const fileName = path.basename(filePath);
    
    // Check if this is a completed function
    if (this.completedFunctions.has(fileName)) {
      this.reportViolation('COMPLETED_FUNCTION_MODIFIED', {
        file: fileName,
        path: relativePath,
        timestamp: new Date().toISOString(),
        violation: 'Completed function was modified',
        rule: 'NEVER Touch Completed Functions'
      });
    }
    
    // Check for other potential violations
    this.checkForViolations(filePath);
  }

  handleFileAdd(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const fileName = path.basename(filePath);
    
    // Check if someone is trying to recreate a completed function
    if (this.completedFunctions.has(fileName)) {
      this.reportViolation('COMPLETED_FUNCTION_RECREATED', {
        file: fileName,
        path: relativePath,
        timestamp: new Date().toISOString(),
        violation: 'Attempted to recreate completed function',
        rule: 'NEVER Touch Completed Functions'
      });
    }
  }

  handleFileDelete(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const fileName = path.basename(filePath);
    
    // Check if someone is trying to delete a completed function
    if (this.completedFunctions.has(fileName)) {
      this.reportViolation('COMPLETED_FUNCTION_DELETED', {
        file: fileName,
        path: relativePath,
        timestamp: new Date().toISOString(),
        violation: 'Attempted to delete completed function',
        rule: 'NEVER Touch Completed Functions'
      });
    }
  }

  checkForViolations(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /migrate-database\.js/,
      /check-powerbi-bork-data\.js/,
      /migrate-edge-functions\.js/,
      /create-all-65-tables\.sql/
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(relativePath)) {
        this.reportViolation('SUSPICIOUS_ACTIVITY', {
          file: relativePath,
          pattern: pattern.toString(),
          timestamp: new Date().toISOString(),
          violation: 'Suspicious activity detected on protected file',
          rule: 'NEVER Touch Completed Functions'
        });
      }
    }
  }

  reportViolation(type, details) {
    const violation = {
      type,
      ...details,
      severity: this.getSeverity(type),
      action: this.getRecommendedAction(type)
    };
    
    this.violations.push(violation);
    
    console.log('\n🚨 COMPLIANCE VIOLATION DETECTED!');
    console.log('=' .repeat(50));
    console.log(`Type: ${type}`);
    console.log(`File: ${details.file}`);
    console.log(`Rule: ${details.rule}`);
    console.log(`Violation: ${details.violation}`);
    console.log(`Severity: ${violation.severity}`);
    console.log(`Recommended Action: ${violation.action}`);
    console.log(`Timestamp: ${details.timestamp}`);
    console.log('=' .repeat(50));
    
    // Save violation to file
    this.saveViolationReport();
    
    // Send alert
    this.sendAlert(violation);
  }

  getSeverity(type) {
    const severityMap = {
      'COMPLETED_FUNCTION_MODIFIED': 'CRITICAL',
      'COMPLETED_FUNCTION_RECREATED': 'CRITICAL',
      'COMPLETED_FUNCTION_DELETED': 'CRITICAL',
      'SUSPICIOUS_ACTIVITY': 'HIGH'
    };
    return severityMap[type] || 'MEDIUM';
  }

  getRecommendedAction(type) {
    const actionMap = {
      'COMPLETED_FUNCTION_MODIFIED': 'STOP - Restore from backup immediately',
      'COMPLETED_FUNCTION_RECREATED': 'STOP - Delete the new file and restore original',
      'COMPLETED_FUNCTION_DELETED': 'STOP - Restore from backup immediately',
      'SUSPICIOUS_ACTIVITY': 'INVESTIGATE - Check what changes were made'
    };
    return actionMap[type] || 'INVESTIGATE';
  }

  saveViolationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations: this.violations.length,
      violations: this.violations,
      protectedFunctions: Array.from(this.completedFunctions)
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-violations-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  sendAlert(violation) {
    // In a real implementation, this could send emails, Slack messages, etc.
    console.log(`\n📧 ALERT: ${violation.severity} violation detected!`);
    console.log(`Action required: ${violation.action}`);
  }

  generateComplianceStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      isMonitoring: this.isMonitoring,
      protectedFunctions: Array.from(this.completedFunctions),
      totalViolations: this.violations.length,
      recentViolations: this.violations.slice(-5),
      complianceScore: this.calculateComplianceScore()
    };
    
    console.log('\n📊 COMPLIANCE STATUS');
    console.log('=' .repeat(40));
    console.log(`Monitoring: ${status.isMonitoring ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`Protected Functions: ${status.protectedFunctions.length}`);
    console.log(`Total Violations: ${status.totalViolations}`);
    console.log(`Compliance Score: ${status.complianceScore}%`);
    
    if (status.recentViolations.length > 0) {
      console.log('\n🚨 Recent Violations:');
      status.recentViolations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.type} - ${violation.file}`);
      });
    }
    
    return status;
  }

  calculateComplianceScore() {
    if (this.violations.length === 0) {
      return 100;
    }
    
    // Reduce score based on violations
    const criticalViolations = this.violations.filter(v => v.severity === 'CRITICAL').length;
    const highViolations = this.violations.filter(v => v.severity === 'HIGH').length;
    
    const score = Math.max(0, 100 - (criticalViolations * 25) - (highViolations * 10));
    return score;
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 AI Compliance Monitor stopped');
  }
}

// Run the monitor if called directly
if (require.main === module) {
  const monitor = new AIComplianceMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down AI Compliance Monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  // Start monitoring
  const watcher = monitor.startMonitoring();
  
  // Generate status every 30 seconds
  setInterval(() => {
    monitor.generateComplianceStatus();
  }, 30000);
}

module.exports = AIComplianceMonitor;
