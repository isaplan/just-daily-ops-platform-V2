#!/usr/bin/env node

/**
 * AI Compliance Enforcer - Prevents Rule Violations
 * This system actively prevents violations before they happen
 */

const fs = require('fs');
const path = require('path');

class AIComplianceEnforcer {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.completedFunctions = new Map();
    this.backupDir = path.join(this.projectRoot, '.ai-compliance-backups');
    
    this.loadCompletedFunctions();
    this.ensureBackupDir();
  }

  loadCompletedFunctions() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        Object.values(registry).forEach(func => {
          if (func.status === 'completed' && func.touch_again === false) {
            this.completedFunctions.set(func.file, {
              ...func,
              originalContent: this.readFileContent(func.file),
              lastBackup: null
            });
          }
        });
        console.log(`🔒 Loaded ${this.completedFunctions.size} protected functions`);
      }
    } catch (error) {
      console.error('❌ Failed to load function registry:', error);
    }
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Created backup directory');
    }
  }

  readFileContent(fileName) {
    const filePath = path.join(this.projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }

  createBackup(fileName) {
    const filePath = path.join(this.projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      const backupPath = path.join(this.backupDir, `${fileName}.backup.${Date.now()}`);
      fs.copyFileSync(filePath, backupPath);
      
      const func = this.completedFunctions.get(fileName);
      if (func) {
        func.lastBackup = backupPath;
      }
      
      console.log(`💾 Created backup: ${backupPath}`);
      return backupPath;
    }
    return null;
  }

  restoreFromBackup(fileName) {
    const func = this.completedFunctions.get(fileName);
    if (func && func.lastBackup && fs.existsSync(func.lastBackup)) {
      const filePath = path.join(this.projectRoot, fileName);
      fs.copyFileSync(func.lastBackup, filePath);
      console.log(`🔄 Restored ${fileName} from backup`);
      return true;
    }
    return false;
  }

  checkForViolations() {
    console.log('\n🔍 COMPLIANCE ENFORCEMENT CHECK');
    console.log('=' .repeat(50));
    
    const violations = [];
    
    for (const [fileName, func] of this.completedFunctions) {
      const filePath = path.join(this.projectRoot, fileName);
      
      if (!fs.existsSync(filePath)) {
        violations.push({
          type: 'FILE_DELETED',
          file: fileName,
          severity: 'CRITICAL',
          action: 'RESTORE_FROM_BACKUP'
        });
        continue;
      }
      
      const currentContent = fs.readFileSync(filePath, 'utf8');
      const originalContent = func.originalContent;
      
      if (currentContent !== originalContent) {
        violations.push({
          type: 'FILE_MODIFIED',
          file: fileName,
          severity: 'CRITICAL',
          action: 'RESTORE_FROM_BACKUP',
          changes: this.detectChanges(originalContent, currentContent)
        });
      }
    }
    
    return violations;
  }

  detectChanges(original, current) {
    const originalLines = original.split('\n');
    const currentLines = current.split('\n');
    
    const changes = [];
    
    for (let i = 0; i < Math.max(originalLines.length, currentLines.length); i++) {
      if (originalLines[i] !== currentLines[i]) {
        changes.push({
          line: i + 1,
          original: originalLines[i] || '[DELETED]',
          current: currentLines[i] || '[DELETED]'
        });
      }
    }
    
    return changes.slice(0, 10); // Limit to first 10 changes
  }

  enforceCompliance() {
    console.log('🛡️  AI COMPLIANCE ENFORCER - Checking for Violations');
    console.log('=' .repeat(60));
    
    // Create backups of all completed functions
    console.log('\n📦 Creating backups of completed functions...');
    for (const fileName of this.completedFunctions.keys()) {
      this.createBackup(fileName);
    }
    
    // Check for violations
    const violations = this.checkForViolations();
    
    if (violations.length === 0) {
      console.log('✅ No violations detected - All completed functions are intact');
      return { status: 'CLEAN', violations: [] };
    }
    
    console.log(`\n🚨 VIOLATIONS DETECTED: ${violations.length}`);
    console.log('=' .repeat(50));
    
    // Handle violations
    for (const violation of violations) {
      console.log(`\n🔍 Violation: ${violation.type}`);
      console.log(`File: ${violation.file}`);
      console.log(`Severity: ${violation.severity}`);
      console.log(`Action: ${violation.action}`);
      
      if (violation.action === 'RESTORE_FROM_BACKUP') {
        const restored = this.restoreFromBackup(violation.file);
        if (restored) {
          console.log(`✅ Restored ${violation.file} from backup`);
        } else {
          console.log(`❌ Failed to restore ${violation.file} - No backup available`);
        }
      }
      
      if (violation.changes) {
        console.log('\n📝 Changes detected:');
        violation.changes.forEach(change => {
          console.log(`  Line ${change.line}:`);
          console.log(`    - ${change.original}`);
          console.log(`    + ${change.current}`);
        });
      }
    }
    
    // Generate violation report
    this.generateViolationReport(violations);
    
    return { status: 'VIOLATIONS_FOUND', violations };
  }

  generateViolationReport(violations) {
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations: violations.length,
      violations: violations,
      protectedFunctions: Array.from(this.completedFunctions.keys()),
      enforcementActions: violations.map(v => ({
        file: v.file,
        action: v.action,
        timestamp: new Date().toISOString()
      }))
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-enforcement-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Violation report saved to ai-enforcement-report.json');
  }

  generateComplianceSummary() {
    const violations = this.checkForViolations();
    const totalFunctions = this.completedFunctions.size;
    const violatedFunctions = violations.length;
    const complianceRate = ((totalFunctions - violatedFunctions) / totalFunctions) * 100;
    
    console.log('\n📊 COMPLIANCE SUMMARY');
    console.log('=' .repeat(40));
    console.log(`Total Protected Functions: ${totalFunctions}`);
    console.log(`Violated Functions: ${violatedFunctions}`);
    console.log(`Compliance Rate: ${complianceRate.toFixed(1)}%`);
    
    if (violations.length > 0) {
      console.log('\n🚨 Violated Functions:');
      violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file} - ${violation.type}`);
      });
    } else {
      console.log('✅ All protected functions are intact');
    }
    
    return {
      totalFunctions,
      violatedFunctions,
      complianceRate,
      violations
    };
  }

  // Method to manually restore a function
  restoreFunction(fileName) {
    if (!this.completedFunctions.has(fileName)) {
      console.log(`❌ ${fileName} is not a protected function`);
      return false;
    }
    
    const restored = this.restoreFromBackup(fileName);
    if (restored) {
      console.log(`✅ Successfully restored ${fileName}`);
      return true;
    } else {
      console.log(`❌ Failed to restore ${fileName} - No backup available`);
      return false;
    }
  }

  // Method to add new completed function to protection
  protectFunction(fileName, metadata = {}) {
    const filePath = path.join(this.projectRoot, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File ${fileName} does not exist`);
      return false;
    }
    
    this.completedFunctions.set(fileName, {
      file: fileName,
      status: 'completed',
      touch_again: false,
      protectedAt: new Date().toISOString(),
      ...metadata,
      originalContent: this.readFileContent(fileName),
      lastBackup: null
    });
    
    this.createBackup(fileName);
    console.log(`🔒 Protected function: ${fileName}`);
    return true;
  }
}

// Run the enforcer if called directly
if (require.main === module) {
  const enforcer = new AIComplianceEnforcer();
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--enforce')) {
    enforcer.enforceCompliance();
  } else if (args.includes('--check')) {
    enforcer.generateComplianceSummary();
  } else if (args.includes('--restore') && args.length > 2) {
    const fileName = args[args.indexOf('--restore') + 1];
    enforcer.restoreFunction(fileName);
  } else {
    console.log('Usage:');
    console.log('  node ai-compliance-enforcer.js --enforce    # Enforce compliance');
    console.log('  node ai-compliance-enforcer.js --check     # Check compliance');
    console.log('  node ai-compliance-enforcer.js --restore <file> # Restore specific file');
  }
}

module.exports = AIComplianceEnforcer;
