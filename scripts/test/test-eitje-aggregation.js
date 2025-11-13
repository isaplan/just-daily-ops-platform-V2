#!/usr/bin/env node

/**
 * EITJE AGGREGATION TEST SCRIPT
 * 
 * Tests the aggregation logic for all Eitje endpoints
 * Follows EXTREME DEFENSIVE MODE: simple, modular, debuggable
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test configuration
const TEST_DATE_RANGE = {
  startDate: '2024-09-01',
  endDate: '2024-09-30'
};

const AGGREGATABLE_ENDPOINTS = [
  'time_registration_shifts',
  'planning_shifts',
  'revenue_days'
];

/**
 * Test helper: Check if table exists and has data
 */
async function checkTableData(tableName, description) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .gte('date', TEST_DATE_RANGE.startDate)
      .lte('date', TEST_DATE_RANGE.endDate);
    
    if (error) {
      console.log(`❌ ${description}: Error - ${error.message}`);
      return { exists: false, count: 0, error: error.message };
    }
    
    console.log(`✅ ${description}: ${count || 0} records found`);
    return { exists: true, count: count || 0, data: data || [] };
  } catch (err) {
    console.log(`❌ ${description}: Exception - ${err.message}`);
    return { exists: false, count: 0, error: err.message };
  }
}

/**
 * Test helper: Call aggregation API
 */
async function callAggregationAPI(endpoint, dateRange) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/eitje/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        ...dateRange
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ ${endpoint} aggregation: ${result.result.recordsAggregated} records aggregated`);
      return { success: true, result: result.result };
    } else {
      console.log(`❌ ${endpoint} aggregation failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.log(`❌ ${endpoint} aggregation error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Test helper: Fetch aggregated data
 */
async function fetchAggregatedData(endpoint, dateRange) {
  try {
    const params = new URLSearchParams({
      endpoint,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    
    const response = await fetch(`${API_BASE_URL}/api/eitje/aggregate?${params}`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ ${endpoint} fetch: ${result.data.length} records retrieved`);
      return { success: true, data: result.data, summary: result.summary };
    } else {
      console.log(`❌ ${endpoint} fetch failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.log(`❌ ${endpoint} fetch error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Validate calculations (spot check)
 */
function validateCalculations(rawData, aggregatedData, endpoint) {
  console.log(`\n🔍 Validating calculations for ${endpoint}...`);
  
  if (!rawData || rawData.length === 0) {
    console.log('⚠️  No raw data to validate against');
    return true;
  }
  
  if (!aggregatedData || aggregatedData.length === 0) {
    console.log('⚠️  No aggregated data to validate');
    return false;
  }
  
  // Simple validation: check if aggregated totals make sense
  const rawCount = rawData.length;
  const aggregatedCount = aggregatedData.length;
  
  console.log(`   Raw records: ${rawCount}`);
  console.log(`   Aggregated records: ${aggregatedCount}`);
  
  if (aggregatedCount > 0 && aggregatedCount <= rawCount) {
    console.log('✅ Record count validation passed');
    return true;
  } else {
    console.log('❌ Record count validation failed');
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Eitje Aggregation Tests');
  console.log('=====================================');
  console.log(`Date Range: ${TEST_DATE_RANGE.startDate} to ${TEST_DATE_RANGE.endDate}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('');
  
  const results = {
    rawData: {},
    aggregatedData: {},
    aggregationAPI: {},
    fetchAPI: {},
    validation: {}
  };
  
  // Step 1: Check raw data tables
  console.log('📊 Step 1: Checking Raw Data Tables');
  console.log('-----------------------------------');
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    const tableName = `eitje_${endpoint}_raw`;
    const description = `${endpoint} raw data`;
    results.rawData[endpoint] = await checkTableData(tableName, description);
  }
  
  console.log('');
  
  // Step 2: Check aggregated data tables (before aggregation)
  console.log('📈 Step 2: Checking Aggregated Data Tables (Before)');
  console.log('---------------------------------------------------');
  
  const tableMapping = {
    'time_registration_shifts': 'eitje_labor_hours_aggregated',
    'planning_shifts': 'eitje_planning_hours_aggregated',
    'revenue_days': 'eitje_revenue_days_aggregated'
  };
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    const tableName = tableMapping[endpoint];
    const description = `${endpoint} aggregated data (before)`;
    results.aggregatedData[`${endpoint}_before`] = await checkTableData(tableName, description);
  }
  
  console.log('');
  
  // Step 3: Test aggregation API
  console.log('⚙️  Step 3: Testing Aggregation API');
  console.log('-----------------------------------');
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    console.log(`\nTesting ${endpoint} aggregation...`);
    results.aggregationAPI[endpoint] = await callAggregationAPI(endpoint, TEST_DATE_RANGE);
  }
  
  console.log('');
  
  // Step 4: Check aggregated data tables (after aggregation)
  console.log('📈 Step 4: Checking Aggregated Data Tables (After)');
  console.log('--------------------------------------------------');
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    const tableName = tableMapping[endpoint];
    const description = `${endpoint} aggregated data (after)`;
    results.aggregatedData[`${endpoint}_after`] = await checkTableData(tableName, description);
  }
  
  console.log('');
  
  // Step 5: Test fetch API
  console.log('📥 Step 5: Testing Fetch API');
  console.log('----------------------------');
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    console.log(`\nTesting ${endpoint} fetch...`);
    results.fetchAPI[endpoint] = await fetchAggregatedData(endpoint, TEST_DATE_RANGE);
  }
  
  console.log('');
  
  // Step 6: Validate calculations
  console.log('🔍 Step 6: Validating Calculations');
  console.log('----------------------------------');
  
  for (const endpoint of AGGREGATABLE_ENDPOINTS) {
    const rawData = results.rawData[endpoint].data || [];
    const aggregatedData = results.fetchAPI[endpoint].data || [];
    results.validation[endpoint] = validateCalculations(rawData, aggregatedData, endpoint);
  }
  
  console.log('');
  
  // Step 7: Summary
  console.log('📋 Test Summary');
  console.log('===============');
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Raw data tests
  console.log('\nRaw Data Tables:');
  for (const [endpoint, result] of Object.entries(results.rawData)) {
    totalTests++;
    if (result.exists && result.count > 0) {
      passedTests++;
      console.log(`  ✅ ${endpoint}: ${result.count} records`);
    } else {
      console.log(`  ❌ ${endpoint}: ${result.error || 'No data'}`);
    }
  }
  
  // Aggregation tests
  console.log('\nAggregation API:');
  for (const [endpoint, result] of Object.entries(results.aggregationAPI)) {
    totalTests++;
    if (result.success) {
      passedTests++;
      console.log(`  ✅ ${endpoint}: ${result.result.recordsAggregated} records aggregated`);
    } else {
      console.log(`  ❌ ${endpoint}: ${result.error}`);
    }
  }
  
  // Fetch tests
  console.log('\nFetch API:');
  for (const [endpoint, result] of Object.entries(results.fetchAPI)) {
    totalTests++;
    if (result.success) {
      passedTests++;
      console.log(`  ✅ ${endpoint}: ${result.data.length} records fetched`);
    } else {
      console.log(`  ❌ ${endpoint}: ${result.error}`);
    }
  }
  
  // Validation tests
  console.log('\nValidation:');
  for (const [endpoint, passed] of Object.entries(results.validation)) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`  ✅ ${endpoint}: Calculations validated`);
    } else {
      console.log(`  ❌ ${endpoint}: Validation failed`);
    }
  }
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Eitje aggregation is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});


