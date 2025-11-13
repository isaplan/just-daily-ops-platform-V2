#!/usr/bin/env node

/**
 * Comprehensive Eitje data diagnosis
 * Check what data actually exists and why batch processing finds nothing
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

async function diagnoseEitjeData() {
  console.log('🔍 Eitje Data Diagnosis');
  console.log('======================');
  
  // Check all Eitje tables
  const tables = [
    'eitje_environments',
    'eitje_teams', 
    'eitje_users',
    'eitje_shift_types',
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw',
    'eitje_revenue_days_raw',
    'eitje_availability_shifts_raw',
    'eitje_leave_requests_raw',
    'eitje_events_raw'
  ];
  
  console.log('\n📊 Table Status:');
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ${table}: ❌ ${error.message}`);
      } else {
        console.log(`   ${table}: ✅ ${count || 0} records`);
      }
    } catch (err) {
      console.log(`   ${table}: ❌ ${err.message}`);
    }
  }
  
  // Check raw data structure
  console.log('\n🔍 Raw Data Structure:');
  const rawTables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw',
    'eitje_revenue_days_raw'
  ];
  
  for (const table of rawTables) {
    try {
      console.log(`\n📊 ${table}:`);
      
      // Get sample record
      const { data: sample, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        continue;
      }
      
      if (sample && sample.length > 0) {
        const record = sample[0];
        console.log(`   ✅ Sample record found`);
        console.log(`   🔑 Fields: ${Object.keys(record).join(', ')}`);
        
        // Check date field
        if (record.date) {
          console.log(`   📅 Date: ${record.date} (type: ${typeof record.date})`);
        } else {
          console.log(`   ⚠️  No 'date' field`);
        }
        
        // Check raw_data
        if (record.raw_data) {
          console.log(`   📦 Raw data type: ${typeof record.raw_data}`);
          if (typeof record.raw_data === 'object') {
            console.log(`   📦 Raw data keys: ${Object.keys(record.raw_data).join(', ')}`);
            if (record.raw_data.date) {
              console.log(`   📅 Raw data date: ${record.raw_data.date}`);
            }
          }
        }
        
        // Check created_at
        if (record.created_at) {
          console.log(`   🕒 Created: ${record.created_at}`);
        }
      } else {
        console.log(`   ⚠️  No records found`);
      }
      
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }
  
  // Check if data exists in other tables that might be relevant
  console.log('\n🔍 Alternative Data Sources:');
  
  // Check if there's data in eitje_sales_data (from the raw-data API)
  try {
    const { data: salesData, error: salesError } = await supabase
      .from('eitje_sales_data')
      .select('*', { count: 'exact', head: true });
    
    if (salesError) {
      console.log(`   eitje_sales_data: ❌ ${salesError.message}`);
    } else {
      console.log(`   eitje_sales_data: ✅ ${salesData?.length || 0} records`);
    }
  } catch (err) {
    console.log(`   eitje_sales_data: ❌ ${err.message}`);
  }
  
  // Check all tables that start with 'eitje'
  console.log('\n🔍 All Eitje Tables:');
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'eitje%');
    
    if (error) {
      console.log(`   ❌ Error querying tables: ${error.message}`);
    } else {
      console.log(`   📋 Found ${tables?.length || 0} Eitje tables:`);
      tables?.forEach(table => {
        console.log(`      - ${table.table_name}`);
      });
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

async function testBatchProcessingAPI() {
  console.log('\n🧪 Testing Batch Processing API');
  console.log('================================');
  
  try {
    const response = await fetch('http://localhost:3000/api/eitje/process-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2025-01-28',
        batchSizeRecords: 100,
        endpoints: ['time_registration_shifts']
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
  }
}

async function main() {
  await diagnoseEitjeData();
  await testBatchProcessingAPI();
  
  console.log('\n🎉 Diagnosis completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check if raw tables have data');
  console.log('2. If no data, sync some Eitje data first');
  console.log('3. If data exists, check date field format');
  console.log('4. Test batch processing with actual data');
}

main().catch(console.error);


