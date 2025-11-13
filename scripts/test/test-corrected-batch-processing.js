#!/usr/bin/env node

/**
 * Test script for corrected batch processing
 * Tests the record-based pagination approach
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRecordBasedPagination() {
  console.log('🧪 Testing Record-Based Pagination Logic');
  console.log('=====================================');
  
  try {
    // Test 1: Check if raw tables exist
    console.log('\n1. Checking raw tables...');
    
    const tables = [
      'eitje_time_registration_shifts_raw',
      'eitje_planning_shifts_raw', 
      'eitje_revenue_days_raw'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} records`);
      }
    }
    
    // Test 2: Test pagination logic
    console.log('\n2. Testing pagination logic...');
    
    const tableName = 'eitje_time_registration_shifts_raw';
    const batchSize = 1000;
    let offset = 0;
    let hasMoreRecords = true;
    let batchNumber = 0;
    
    while (hasMoreRecords && batchNumber < 3) { // Limit to 3 batches for testing
      batchNumber++;
      
      console.log(`\n   Batch ${batchNumber}: offset ${offset}, limit ${batchSize}`);
      
      const { data: records, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        break;
      }
      
      if (!records || records.length === 0) {
        console.log(`   ✅ No more records found`);
        hasMoreRecords = false;
        break;
      }
      
      console.log(`   ✅ Fetched ${records.length} records`);
      
      // Move to next batch
      offset += batchSize;
    }
    
    console.log(`\n   Total batches processed: ${batchNumber}`);
    
    // Test 3: Test date filtering
    console.log('\n3. Testing date filtering...');
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const { data: dateFilteredRecords, error: dateError } = await supabase
      .from(tableName)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(5);
    
    if (dateError) {
      console.log(`❌ Date filtering error: ${dateError.message}`);
    } else {
      console.log(`✅ Date filtering works: found ${dateFilteredRecords?.length || 0} records in ${startDate} to ${endDate}`);
    }
    
    console.log('\n✅ Record-based pagination test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testBatchProcessingAPI() {
  console.log('\n🧪 Testing Batch Processing API');
  console.log('===============================');
  
  try {
    // Test the endpoints API
    const response = await fetch('http://localhost:3000/api/eitje/process-all?action=endpoints');
    
    if (!response.ok) {
      console.log(`❌ API not available: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Endpoints API response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    console.log('   Make sure the Next.js server is running on port 3000');
  }
}

async function main() {
  console.log('🚀 Testing Corrected Batch Processing System');
  console.log('============================================');
  
  await testRecordBasedPagination();
  await testBatchProcessingAPI();
  
  console.log('\n🎉 All tests completed!');
}

main().catch(console.error);


