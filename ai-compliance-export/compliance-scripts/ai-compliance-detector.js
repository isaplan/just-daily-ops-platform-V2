#!/usr/bin/env node

/**
 * AI Compliance Detector - Advanced Violation Detection
 * Detects even minor changes to completed functions
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AIComplianceDetector {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryPath = path.join(this.projectRoot, 'function-registry.json');
    this.completedFunctions = new Map();
    this.checksums = new Map();
    
    this.loadCompletedFunctions();
  }

  loadCompletedFunctions() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        Object.values(registry).forEach(func => {
          if (func.status === 'completed' && func.touch_again === false) {
            this.completedFunctions.set(func.file, func);
          }
        });
        console.log(`🔒 Loaded ${this.completedFunctions.size} completed functions`);
      }
    } catch (error) {
      console.error('❌ Failed to load function registry:', error);
    }
  }

  calculateChecksum(filePath) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    }
    return null;
  }

  detectChanges(fileName) {
    const filePath = path.join(this.projectRoot, fileName);
    
    if (!fs.existsSync(filePath)) {
      return {
        status: 'FILE_DELETED',
        severity: 'CRITICAL',
        message: 'Completed function has been deleted'
      };
    }
    
    const currentChecksum = this.calculateChecksum(filePath);
    const storedChecksum = this.checksums.get(fileName);
    
    if (!storedChecksum) {
      // First time checking this file, store the checksum
      this.checksums.set(fileName, currentChecksum);
      return {
        status: 'BASELINE_ESTABLISHED',
        message: 'Baseline checksum established'
      };
    }
    
    if (currentChecksum !== storedChecksum) {
      return {
        status: 'FILE_MODIFIED',
        severity: 'CRITICAL',
        message: 'Completed function has been modified',
        checksumChanged: true
      };
    }
    
    return {
      status: 'INTACT',
      message: 'File is unchanged'
    };
  }

  analyzeFileModifications(fileName) {
    const filePath = path.join(this.projectRoot, fileName);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    return {
      fileName,
      size: stats.size,
      lastModified: stats.mtime,
      checksum: this.calculateChecksum(filePath),
      lineCount: content.split('\n').length,
      hasComments: content.includes('//') || content.includes('/*'),
      hasFunctions: content.includes('function ') || content.includes('=>'),
      hasImports: content.includes('import ') || content.includes('require('),
      contentPreview: content.substring(0, 200) + '...'
    };
  }

  runDetailedAnalysis() {
    console.log('🔍 AI COMPLIANCE DETECTOR - Detailed Analysis');
    console.log('=' .repeat(60));
    
    const results = {
      timestamp: new Date().toISOString(),
      totalFunctions: this.completedFunctions.size,
      violations: [],
      analysis: []
    };
    
    console.log('\n📋 Analyzing each completed function...');
    
    for (const [fileName, func] of this.completedFunctions) {
      console.log(`\n🔍 Analyzing: ${fileName}`);
      
      const changeDetection = this.detectChanges(fileName);
      const fileAnalysis = this.analyzeFileModifications(fileName);
      
      results.analysis.push({
        fileName,
        changeDetection,
        fileAnalysis,
        registryInfo: func
      });
      
      if (changeDetection.status === 'FILE_MODIFIED' || changeDetection.status === 'FILE_DELETED') {
        results.violations.push({
          fileName,
          ...changeDetection,
          fileAnalysis
        });
        
        console.log(`🚨 VIOLATION: ${changeDetection.message}`);
      } else {
        console.log(`✅ ${changeDetection.message}`);
      }
    }
    
    // Generate detailed report
    this.generateDetailedReport(results);
    
    return results;
  }

  generateDetailedReport(results) {
    console.log('\n📊 DETAILED COMPLIANCE REPORT');
    console.log('=' .repeat(60));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Functions: ${results.totalFunctions}`);
    console.log(`Violations: ${results.violations.length}`);
    console.log(`Compliance Rate: ${((results.totalFunctions - results.violations.length) / results.totalFunctions * 100).toFixed(1)}%`);
    
    if (results.violations.length > 0) {
      console.log('\n🚨 VIOLATIONS DETECTED:');
      results.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.fileName}`);
        console.log(`   Status: ${violation.status}`);
        console.log(`   Severity: ${violation.severity}`);
        console.log(`   Message: ${violation.message}`);
        
        if (violation.fileAnalysis) {
          console.log(`   File Size: ${violation.fileAnalysis.size} bytes`);
          console.log(`   Last Modified: ${violation.fileAnalysis.lastModified}`);
          console.log(`   Line Count: ${violation.fileAnalysis.lineCount}`);
        }
      });
    } else {
      console.log('\n✅ No violations detected - All completed functions are intact');
    }
    
    // Save detailed report
    fs.writeFileSync(
      path.join(this.projectRoot, 'ai-detailed-compliance-report.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Detailed report saved to ai-detailed-compliance-report.json');
  }

  checkRegistryIntegrity() {
    console.log('\n🔍 REGISTRY INTEGRITY CHECK');
    console.log('=' .repeat(40));
    
    const issues = [];
    
    // Check if registry file exists
    if (!fs.existsSync(this.registryPath)) {
      issues.push('Registry file does not exist');
      return { status: 'CRITICAL', issues };
    }
    
    // Check registry content
    try {
      const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      
      // Check metadata
      if (!registry._metadata) {
        issues.push('Registry missing metadata');
      }
      
      // Check each function
      Object.entries(registry).forEach(([key, func]) => {
        if (key === '_metadata') return;
        
        if (!func.status) {
          issues.push(`Function ${key} missing status`);
        }
        
        if (!func.touch_again && func.status === 'completed') {
          // This is a protected function, check if file exists
          const filePath = path.join(this.projectRoot, func.file);
          if (!fs.existsSync(filePath)) {
            issues.push(`Protected function ${func.file} file not found`);
          }
        }
      });
      
    } catch (error) {
      issues.push(`Registry file corrupted: ${error.message}`);
    }
    
    if (issues.length === 0) {
      console.log('✅ Registry integrity check passed');
      return { status: 'HEALTHY', issues: [] };
    } else {
      console.log('❌ Registry integrity issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      return { status: 'ISSUES_FOUND', issues };
    }
  }

  generateComplianceScore() {
    const analysis = this.runDetailedAnalysis();
    const registryCheck = this.checkRegistryIntegrity();
    
    const totalChecks = 2; // Analysis + Registry
    let passedChecks = 0;
    
    if (analysis.violations.length === 0) passedChecks++;
    if (registryCheck.status === 'HEALTHY') passedChecks++;
    
    const score = (passedChecks / totalChecks) * 100;
    
    console.log('\n🎯 COMPLIANCE SCORE CALCULATION');
    console.log('=' .repeat(40));
    console.log(`Function Analysis: ${analysis.violations.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Registry Integrity: ${registryCheck.status === 'HEALTHY' ? 'PASS' : 'FAIL'}`);
    console.log(`Overall Score: ${score.toFixed(1)}%`);
    
    return {
      score,
      analysis,
      registryCheck,
      passedChecks,
      totalChecks
    };
  }
}

// Run the detector if called directly
if (require.main === module) {
  const detector = new AIComplianceDetector();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--detailed')) {
    detector.runDetailedAnalysis();
  } else if (args.includes('--registry')) {
    detector.checkRegistryIntegrity();
  } else if (args.includes('--score')) {
    detector.generateComplianceScore();
  } else {
    console.log('Usage:');
    console.log('  node ai-compliance-detector.js --detailed  # Run detailed analysis');
    console.log('  node ai-compliance-detector.js --registry  # Check registry integrity');
    console.log('  node ai-compliance-detector.js --score    # Generate compliance score');
  }
}

module.exports = AIComplianceDetector;
