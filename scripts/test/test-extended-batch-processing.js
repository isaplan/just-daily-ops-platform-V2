#!/usr/bin/env node

/**
 * Test script for extended batch processing (2024-2025)
 * Tests the record-based pagination with full date range
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

async function testExtendedDateRange() {
  console.log('🧪 Testing Extended Date Range (2024-2025)');
  console.log('==========================================');
  
  try {
    const startDate = '2024-01-01';
    const endDate = '2025-01-28';
    
    console.log(`\n📅 Testing date range: ${startDate} to ${endDate}`);
    
    // Test each table for data availability
    const tables = [
      'eitje_time_registration_shifts_raw',
      'eitje_planning_shifts_raw', 
      'eitje_revenue_days_raw'
    ];
    
    for (const table of tables) {
      console.log(`\n🔍 Checking ${table}...`);
      
      // Check total count
      const { data: totalCount, error: countError } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ❌ Error: ${countError.message}`);
        continue;
      }
      
      console.log(`   📊 Total records: ${totalCount?.length || 0}`);
      
      // Check date range count
      const { data: dateRangeCount, error: dateError } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (dateError) {
        console.log(`   ❌ Date range error: ${dateError.message}`);
        continue;
      }
      
      console.log(`   📅 Records in ${startDate} to ${endDate}: ${dateRangeCount?.length || 0}`);
      
      // Check sample records
      const { data: sampleRecords, error: sampleError } = await supabase
        .from(table)
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(3);
      
      if (sampleError) {
        console.log(`   ❌ Sample error: ${sampleError.message}`);
        continue;
      }
      
      if (sampleRecords && sampleRecords.length > 0) {
        console.log(`   ✅ Sample records found: ${sampleRecords.length}`);
        console.log(`   📝 Sample date: ${sampleRecords[0].date}`);
      } else {
        console.log(`   ⚠️  No records found in date range`);
      }
    }
    
    console.log('\n✅ Extended date range test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testBatchProcessingAPI() {
  console.log('\n🧪 Testing Extended Batch Processing API');
  console.log('========================================');
  
  try {
    // Test the batch processing with extended date range
    const response = await fetch('http://localhost:3000/api/eitje/process-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2025-01-28',
        batchSizeRecords: 1000,
        endpoints: ['time_registration_shifts', 'planning_shifts', 'revenue_days']
      }),
    });
    
    if (!response.ok) {
      console.log(`❌ API not available: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Batch processing API response:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Total Batches: ${data.result?.totalBatches || 0}`);
    console.log(`   Completed Batches: ${data.result?.completedBatches || 0}`);
    console.log(`   Records Processed: ${data.result?.totalRecordsProcessed || 0}`);
    console.log(`   Records Aggregated: ${data.result?.totalRecordsAggregated || 0}`);
    console.log(`   Processing Time: ${data.result?.processingTime || 0}ms`);
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    console.log('   Make sure the Next.js server is running on port 3000');
  }
}

async function main() {
  console.log('🚀 Testing Extended Batch Processing (2024-2025)');
  console.log('================================================');
  
  await testExtendedDateRange();
  await testBatchProcessingAPI();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start the Next.js server: npm run dev');
  console.log('2. Go to http://localhost:3000/finance/eitje-api');
  console.log('3. Click "Data Processing" tab');
  console.log('4. Click "Process All Data (Batched)" button');
  console.log('5. Watch the console for progress logs');
}

main().catch(console.error);


