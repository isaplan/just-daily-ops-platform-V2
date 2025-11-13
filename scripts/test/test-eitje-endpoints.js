#!/usr/bin/env node

/**
 * EITJE ENDPOINTS COMPREHENSIVE TEST SCRIPT - EXTREME DEFENSIVE MODE
 * 
 * Tests all Eitje API endpoints with various scenarios
 * Run with: node test-eitje-endpoints.js
 */

const BASE_URL = 'http://localhost:3000/api/eitje';

// DEFENSIVE: Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://open-api.eitje.app/open_api',
  credentials: {
    partner_username: 'test_partner',
    partner_password: 'test_password',
    api_username: 'test_api_user',
    api_password: 'test_api_pass'
  },
  testDates: {
    short: { startDate: '2024-10-24', endDate: '2024-10-25' },
    medium: { startDate: '2024-10-24', endDate: '2024-10-30' },
    long: { startDate: '2024-10-01', endDate: '2024-10-31' }
  }
};

// DEFENSIVE: Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Master Data Endpoints',
    description: 'Test all master data endpoints (no date filtering required)',
    endpoints: ['environments', 'teams', 'users', 'shift_types'],
    requiresDates: false
  },
  {
    name: 'Labor Data Endpoints (Short Range)',
    description: 'Test labor endpoints with 1-day range',
    endpoints: ['time_registration_shifts', 'planning_shifts', 'availability_shifts', 'leave_requests'],
    requiresDates: true,
    dateRange: 'short'
  },
  {
    name: 'Labor Data Endpoints (Medium Range)',
    description: 'Test labor endpoints with 6-day range (max safe)',
    endpoints: ['time_registration_shifts', 'planning_shifts', 'availability_shifts', 'leave_requests'],
    requiresDates: true,
    dateRange: 'medium'
  },
  {
    name: 'Revenue Data Endpoints',
    description: 'Test revenue endpoints with various ranges',
    endpoints: ['revenue_days', 'events'],
    requiresDates: true,
    dateRange: 'long'
  }
];

// DEFENSIVE: Utility functions
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(options.body || {}),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[TEST] Request failed for ${url}:`, error.message);
    throw error;
  }
}

async function testEndpoint(endpoint, scenario) {
  console.log(`\n[TEST] Testing ${endpoint} (${scenario.name})...`);
  
  const startTime = Date.now();
  
  try {
    const testData = {
      endpoint,
      ...(scenario.requiresDates && scenario.dateRange ? TEST_CONFIG.testDates[scenario.dateRange] : {})
    };
    
    const result = await makeRequest(`${BASE_URL}/test-endpoint`, {
      body: testData
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`[TEST] ${endpoint} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`[TEST]   Response time: ${responseTime}ms`);
    console.log(`[TEST]   Data count: ${result.dataCount || 'N/A'}`);
    
    if (!result.success) {
      console.log(`[TEST]   Error: ${result.error}`);
    }
    
    return {
      endpoint,
      success: result.success,
      responseTime,
      dataCount: result.dataCount,
      error: result.error,
      scenario: scenario.name
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.log(`[TEST] ${endpoint} - ERROR`);
    console.log(`[TEST]   Response time: ${responseTime}ms`);
    console.log(`[TEST]   Error: ${error.message}`);
    
    return {
      endpoint,
      success: false,
      responseTime,
      dataCount: 0,
      error: error.message,
      scenario: scenario.name
    };
  }
}

async function testBulkEndpoints() {
  console.log('\n[TEST] Testing bulk endpoint operations...');
  
  try {
    // Test bulk test
    console.log('[TEST] Running bulk test...');
    const bulkTestResult = await makeRequest(`${BASE_URL}/test-all-endpoints`, {
      body: {}
    });
    
    console.log(`[TEST] Bulk test result: ${bulkTestResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`[TEST] Summary: ${bulkTestResult.summary?.successful || 0}/${bulkTestResult.summary?.total || 0} endpoints successful`);
    
    // Test status check
    console.log('[TEST] Running status check...');
    const statusResult = await makeRequest(`${BASE_URL}/status`, {
      body: {}
    });
    
    console.log(`[TEST] Status check result: ${statusResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`[TEST] Health rate: ${statusResult.summary?.successRate || 'N/A'}`);
    
    return {
      bulkTest: bulkTestResult,
      status: statusResult
    };
    
  } catch (error) {
    console.error('[TEST] Bulk operations failed:', error.message);
    return {
      bulkTest: { success: false, error: error.message },
      status: { success: false, error: error.message }
    };
  }
}

async function testManagementAPI() {
  console.log('\n[TEST] Testing management API...');
  
  try {
    // Test list endpoints
    console.log('[TEST] Listing available endpoints...');
    const listResult = await makeRequest(`${BASE_URL}/manage`, {
      body: { action: 'list' }
    });
    
    console.log(`[TEST] List result: ${listResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`[TEST] Available endpoints: ${listResult.endpoints?.length || 0}`);
    
    // Test individual endpoint management
    const testEndpoint = 'environments';
    console.log(`[TEST] Testing management for ${testEndpoint}...`);
    
    const manageResult = await makeRequest(`${BASE_URL}/manage`, {
      body: { 
        action: 'test',
        endpoint: testEndpoint
      }
    });
    
    console.log(`[TEST] Management test result: ${manageResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    return {
      list: listResult,
      manage: manageResult
    };
    
  } catch (error) {
    console.error('[TEST] Management API failed:', error.message);
    return {
      list: { success: false, error: error.message },
      manage: { success: false, error: error.message }
    };
  }
}

// DEFENSIVE: Main test execution
async function runTests() {
  console.log('🚀 Starting Eitje API Endpoints Comprehensive Test');
  console.log('=' .repeat(60));
  
  const allResults = [];
  const startTime = Date.now();
  
  try {
    // Test individual scenarios
    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n📋 Running scenario: ${scenario.name}`);
      console.log(`   ${scenario.description}`);
      
      for (const endpoint of scenario.endpoints) {
        const result = await testEndpoint(endpoint, scenario);
        allResults.push(result);
        
        // DEFENSIVE: Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Test bulk operations
    const bulkResults = await testBulkEndpoints();
    
    // Test management API
    const managementResults = await testManagementAPI();
    
    // DEFENSIVE: Analyze results
    const totalTime = Date.now() - startTime;
    const successful = allResults.filter(r => r.success).length;
    const total = allResults.length;
    const failed = total - successful;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    console.log(`Total tests: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${Math.round((successful / total) * 100)}%`);
    console.log(`Total time: ${totalTime}ms`);
    
    // Group results by scenario
    const scenarioResults = {};
    allResults.forEach(result => {
      if (!scenarioResults[result.scenario]) {
        scenarioResults[result.scenario] = { total: 0, successful: 0, failed: 0 };
      }
      scenarioResults[result.scenario].total++;
      if (result.success) {
        scenarioResults[result.scenario].successful++;
      } else {
        scenarioResults[result.scenario].failed++;
      }
    });
    
    console.log('\n📈 Results by scenario:');
    Object.entries(scenarioResults).forEach(([scenario, stats]) => {
      const rate = Math.round((stats.successful / stats.total) * 100);
      console.log(`  ${scenario}: ${stats.successful}/${stats.total} (${rate}%)`);
    });
    
    // Show failed tests
    const failedTests = allResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log('\n❌ Failed tests:');
      failedTests.forEach(result => {
        console.log(`  ${result.endpoint}: ${result.error}`);
      });
    }
    
    // Show bulk operation results
    console.log('\n🔧 Bulk operations:');
    console.log(`  Bulk test: ${bulkResults.bulkTest.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Status check: ${bulkResults.status.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Show management API results
    console.log('\n⚙️  Management API:');
    console.log(`  List endpoints: ${managementResults.list.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Manage test: ${managementResults.manage.success ? 'SUCCESS' : 'FAILED'}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// DEFENSIVE: Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint, testBulkEndpoints, testManagementAPI };
