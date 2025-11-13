#!/usr/bin/env node

/**
 * PERIODIC TEST MONITOR
 * 
 * Runs pre/post-execution checks every 2 hours for 48 hours (24 test cycles)
 * Records results to track compliance and system effectiveness
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PeriodicTestMonitor {
  constructor() {
    this.projectRoot = process.cwd();
    this.resultsFile = path.join(this.projectRoot, 'tools/compliance/test-results.json');
    this.startTime = new Date();
    this.testInterval = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    this.totalDuration = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    this.testCount = 0;
    this.maxTests = 24; // 48 hours / 2 hours = 24 tests
  }

  async startMonitoring() {
    console.log('🔄 PERIODIC TEST MONITOR - Starting');
    console.log('='.repeat(60));
    console.log(`Start Time: ${this.startTime.toISOString()}`);
    console.log(`Test Interval: Every 2 hours`);
    console.log(`Total Duration: 48 hours (${this.maxTests} tests)`);
    console.log(`Results File: ${this.resultsFile}`);
    console.log('='.repeat(60));
    console.log('');

    // Initialize results file
    this.initializeResultsFile();

    // Run first test immediately
    await this.runTest();

    // Schedule periodic tests
    const interval = setInterval(async () => {
      const elapsed = Date.now() - this.startTime.getTime();
      
      if (elapsed >= this.totalDuration) {
        clearInterval(interval);
        await this.generateFinalReport();
        console.log('\n✅ Monitoring period complete (48 hours)');
        process.exit(0);
      } else {
        await this.runTest();
      }
    }, this.testInterval);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Monitoring stopped by user');
      clearInterval(interval);
      await this.generateFinalReport();
      process.exit(0);
    });

    // Keep process alive
    console.log('\n📊 Monitoring active. Press Ctrl+C to stop early.\n');
  }

  initializeResultsFile() {
    const initialResults = {
      startTime: this.startTime.toISOString(),
      testInterval: '2 hours',
      totalDuration: '48 hours',
      maxTests: this.maxTests,
      tests: [],
      summary: {
        totalTests: 0,
        preCheckPassed: 0,
        preCheckBlocked: 0,
        preCheckWarned: 0,
        postCheckPassed: 0,
        postCheckViolations: 0,
        averagePreCheckTime: 0,
        averagePostCheckTime: 0
      }
    };

    fs.writeFileSync(this.resultsFile, JSON.stringify(initialResults, null, 2));
    console.log(`✅ Initialized results file: ${this.resultsFile}`);
  }

  async runTest() {
    this.testCount++;
    const testStart = Date.now();
    const timestamp = new Date().toISOString();

    console.log(`\n📋 TEST #${this.testCount} - ${timestamp}`);
    console.log('-'.repeat(60));

    const testResult = {
      testNumber: this.testCount,
      timestamp: timestamp,
      elapsedTime: Date.now() - this.startTime.getTime(),
      preCheck: null,
      postCheck: null,
      overallStatus: 'UNKNOWN'
    };

    try {
      // Test 1: Pre-execution check
      console.log('🔍 Running pre-execution check...');
      const preCheckResult = await this.runPreCheck();
      testResult.preCheck = preCheckResult;
      
      // Test 2: Post-execution check (simulated - checks current git state)
      console.log('🔍 Running post-execution check...');
      const postCheckResult = await this.runPostCheck();
      testResult.postCheck = postCheckResult;

      // Determine overall status
      if (testResult.preCheck.status === 'BLOCK' || testResult.postCheck.status === 'VIOLATIONS') {
        testResult.overallStatus = 'FAIL';
      } else if (testResult.preCheck.status === 'WARN' || testResult.postCheck.status === 'WARN') {
        testResult.overallStatus = 'WARN';
      } else {
        testResult.overallStatus = 'PASS';
      }

      testResult.duration = Date.now() - testStart;

      console.log(`✅ Test completed in ${testResult.duration}ms`);
      console.log(`   Pre-check: ${testResult.preCheck.status}`);
      console.log(`   Post-check: ${testResult.postCheck.status}`);
      console.log(`   Overall: ${testResult.overallStatus}`);

    } catch (error) {
      testResult.error = error.message;
      testResult.overallStatus = 'ERROR';
      console.error(`❌ Test failed: ${error.message}`);
    }

    // Save result
    this.saveTestResult(testResult);

    // Update summary
    this.updateSummary(testResult);
  }

  async runPreCheck() {
    const startTime = Date.now();
    
    try {
      const testTask = `periodic test #${this.testCount} - validate compliance system`;
      const output = execSync(
        `node tools/compliance/pre-execution-check.js "${testTask}"`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      const duration = Date.now() - startTime;
      
      // Parse JSON from output
      const jsonMatch = output.match(/===PRE-EXECUTION-CHECK===\s*([\s\S]*?)\s*===END-PRE-CHECK===/);
      let parsed = null;
      
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (e) {
          parsed = { status: 'ERROR', message: 'Failed to parse JSON', rawOutput: output };
        }
      } else {
        parsed = { status: 'ERROR', message: 'No JSON output found', rawOutput: output };
      }

      return {
        status: parsed.status || 'UNKNOWN',
        duration: duration,
        message: parsed.message || '',
        violations: parsed.violations || [],
        existingCode: parsed.existingCode || []
      };

    } catch (error) {
      return {
        status: 'ERROR',
        duration: Date.now() - startTime,
        message: error.message,
        error: error.toString()
      };
    }
  }

  async runPostCheck() {
    const startTime = Date.now();
    
    try {
      const output = execSync(
        `node tools/compliance/post-execution-check.js`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      const duration = Date.now() - startTime;
      
      // Parse JSON from output
      const jsonMatch = output.match(/===POST-EXECUTION-CHECK===\s*([\s\S]*?)\s*===END-POST-CHECK===/);
      let parsed = null;
      
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (e) {
          parsed = { status: 'ERROR', message: 'Failed to parse JSON', rawOutput: output };
        }
      } else {
        parsed = { status: 'ERROR', message: 'No JSON output found', rawOutput: output };
      }

      return {
        status: parsed.status || 'UNKNOWN',
        duration: duration,
        message: parsed.message || '',
        violations: parsed.violations || [],
        summary: parsed.summary || {}
      };

    } catch (error) {
      // Post-check might exit with code 1 if violations found - that's OK
      if (error.status === 1) {
        // Try to parse output anyway
        const output = error.stdout || error.stderr || '';
        const jsonMatch = output.match(/===POST-EXECUTION-CHECK===\s*([\s\S]*?)\s*===END-POST-CHECK===/);
        
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            return {
              status: parsed.status || 'VIOLATIONS',
              duration: Date.now() - startTime,
              message: parsed.message || '',
              violations: parsed.violations || [],
              summary: parsed.summary || {}
            };
          } catch (e) {
            // Fall through to error case
          }
        }
      }

      return {
        status: 'ERROR',
        duration: Date.now() - startTime,
        message: error.message,
        error: error.toString()
      };
    }
  }

  saveTestResult(testResult) {
    try {
      const results = JSON.parse(fs.readFileSync(this.resultsFile, 'utf8'));
      results.tests.push(testResult);
      results.summary.totalTests = results.tests.length;
      results.lastUpdate = new Date().toISOString();
      
      fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(`❌ Failed to save test result: ${error.message}`);
    }
  }

  updateSummary(testResult) {
    try {
      const results = JSON.parse(fs.readFileSync(this.resultsFile, 'utf8'));
      const summary = results.summary;

      // Update counts
      if (testResult.preCheck) {
        if (testResult.preCheck.status === 'PASS') summary.preCheckPassed++;
        if (testResult.preCheck.status === 'BLOCK') summary.preCheckBlocked++;
        if (testResult.preCheck.status === 'WARN') summary.preCheckWarned++;
      }

      if (testResult.postCheck) {
        if (testResult.postCheck.status === 'PASS') summary.postCheckPassed++;
        if (testResult.postCheck.status === 'VIOLATIONS') summary.postCheckViolations++;
      }

      // Calculate averages
      const preCheckTimes = results.tests
        .filter(t => t.preCheck && t.preCheck.duration)
        .map(t => t.preCheck.duration);
      
      const postCheckTimes = results.tests
        .filter(t => t.postCheck && t.postCheck.duration)
        .map(t => t.postCheck.duration);

      if (preCheckTimes.length > 0) {
        summary.averagePreCheckTime = Math.round(
          preCheckTimes.reduce((a, b) => a + b, 0) / preCheckTimes.length
        );
      }

      if (postCheckTimes.length > 0) {
        summary.averagePostCheckTime = Math.round(
          postCheckTimes.reduce((a, b) => a + b, 0) / postCheckTimes.length
        );
      }

      fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(`❌ Failed to update summary: ${error.message}`);
    }
  }

  async generateFinalReport() {
    console.log('\n\n📊 FINAL TEST REPORT');
    console.log('='.repeat(60));

    try {
      const results = JSON.parse(fs.readFileSync(this.resultsFile, 'utf8'));
      const summary = results.summary;

      console.log(`Total Tests Run: ${summary.totalTests}`);
      console.log(`Pre-Check Passed: ${summary.preCheckPassed}`);
      console.log(`Pre-Check Blocked: ${summary.preCheckBlocked}`);
      console.log(`Pre-Check Warnings: ${summary.preCheckWarned}`);
      console.log(`Post-Check Passed: ${summary.postCheckPassed}`);
      console.log(`Post-Check Violations: ${summary.postCheckViolations}`);
      console.log(`Avg Pre-Check Time: ${summary.averagePreCheckTime}ms`);
      console.log(`Avg Post-Check Time: ${summary.averagePostCheckTime}ms`);

      // Calculate pass rate
      const totalPreChecks = summary.preCheckPassed + summary.preCheckBlocked + summary.preCheckWarned;
      const totalPostChecks = summary.postCheckPassed + summary.postCheckViolations;
      
      if (totalPreChecks > 0) {
        const preCheckPassRate = ((summary.preCheckPassed / totalPreChecks) * 100).toFixed(1);
        console.log(`Pre-Check Pass Rate: ${preCheckPassRate}%`);
      }

      if (totalPostChecks > 0) {
        const postCheckPassRate = ((summary.postCheckPassed / totalPostChecks) * 100).toFixed(1);
        console.log(`Post-Check Pass Rate: ${postCheckPassRate}%`);
      }

      console.log(`\n📁 Detailed results saved to: ${this.resultsFile}`);
      console.log('='.repeat(60));

    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PeriodicTestMonitor();
  monitor.startMonitoring().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PeriodicTestMonitor;

