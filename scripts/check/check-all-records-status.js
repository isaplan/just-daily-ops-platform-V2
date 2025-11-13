#!/usr/bin/env node

/**
 * Comprehensive check of all Eitje records and processing status
 * Verifies raw data exists and aggregation is working
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

async function checkRawTables() {
  console.log('🔍 Checking Raw Tables');
  console.log('====================');
  
  const rawTables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw',
    'eitje_revenue_days_raw',
    'eitje_availability_shifts_raw',
    'eitje_leave_requests_raw',
    'eitje_events_raw'
  ];
  
  for (const table of rawTables) {
    try {
      console.log(`\n📊 Checking ${table}...`);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ❌ Error: ${countError.message}`);
        continue;
      }
      
      console.log(`   📈 Total records: ${count || 0}`);
      
      if (count > 0) {
        // Get sample records
        const { data: sample, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(3);
        
        if (sampleError) {
          console.log(`   ❌ Sample error: ${sampleError.message}`);
          continue;
        }
        
        console.log(`   📝 Sample records: ${sample.length}`);
        if (sample.length > 0) {
          console.log(`   📅 Sample date: ${sample[0].date || 'No date field'}`);
          console.log(`   🏢 Sample environment: ${sample[0].environment_id || 'No env field'}`);
          console.log(`   👥 Sample team: ${sample[0].team_id || 'No team field'}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

async function checkAggregatedTables() {
  console.log('\n🔍 Checking Aggregated Tables');
  console.log('==============================');
  
  const aggregatedTables = [
    'eitje_labor_hours_aggregated',
    'eitje_planning_hours_aggregated',
    'eitje_revenue_days_aggregated'
  ];
  
  for (const table of aggregatedTables) {
    try {
      console.log(`\n📊 Checking ${table}...`);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ❌ Error: ${countError.message}`);
        continue;
      }
      
      console.log(`   📈 Total records: ${count || 0}`);
      
      if (count > 0) {
        // Get sample records
        const { data: sample, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(3);
        
        if (sampleError) {
          console.log(`   ❌ Sample error: ${sampleError.message}`);
          continue;
        }
        
        console.log(`   📝 Sample records: ${sample.length}`);
        if (sample.length > 0) {
          console.log(`   📅 Sample date: ${sample[0].date || 'No date field'}`);
          console.log(`   🏢 Sample environment: ${sample[0].environment_id || 'No env field'}`);
          console.log(`   👥 Sample team: ${sample[0].team_id || 'No team field'}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

async function checkDateRanges() {
  console.log('\n🔍 Checking Date Ranges');
  console.log('=======================');
  
  const tables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw',
    'eitje_revenue_days_raw'
  ];
  
  for (const table of tables) {
    try {
      console.log(`\n📊 Checking ${table} date range...`);
      
      // Get min and max dates
      const { data: minDate, error: minError } = await supabase
        .from(table)
        .select('date')
        .order('date', { ascending: true })
        .limit(1);
      
      const { data: maxDate, error: maxError } = await supabase
        .from(table)
        .select('date')
        .order('date', { ascending: false })
        .limit(1);
      
      if (minError || maxError) {
        console.log(`   ❌ Error: ${minError?.message || maxError?.message}`);
        continue;
      }
      
      if (minDate && minDate.length > 0 && maxDate && maxDate.length > 0) {
        console.log(`   📅 Date range: ${minDate[0].date} to ${maxDate[0].date}`);
        
        // Count records by year
        const { data: byYear, error: yearError } = await supabase
          .from(table)
          .select('date')
          .gte('date', '2024-01-01')
          .lte('date', '2024-12-31');
        
        const { data: byYear2025, error: year2025Error } = await supabase
          .from(table)
          .select('date')
          .gte('date', '2025-01-01')
          .lte('date', '2025-12-31');
        
        if (!yearError && !year2025Error) {
          console.log(`   📊 2024 records: ${byYear?.length || 0}`);
          console.log(`   📊 2025 records: ${byYear2025?.length || 0}`);
        }
      } else {
        console.log(`   ⚠️  No date data found`);
      }
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

async function testBatchProcessing() {
  console.log('\n🧪 Testing Batch Processing');
  console.log('============================');
  
  try {
    // Test the batch processing API
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
    
    if (data.result?.totalRecordsProcessed === 0) {
      console.log('   ⚠️  No records were processed - this suggests no raw data exists');
    }
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    console.log('   Make sure the Next.js server is running');
  }
}

async function checkTableStructure() {
  console.log('\n🔍 Checking Table Structure');
  console.log('============================');
  
  try {
    // Check if tables exist by trying to get column info
    const { data: columns, error } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Table structure error: ${error.message}`);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Table structure looks good');
      console.log(`   Sample record keys: ${Object.keys(columns[0]).join(', ')}`);
    } else {
      console.log('⚠️  Table exists but no records found');
    }
    
  } catch (error) {
    console.log(`❌ Structure check failed: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Comprehensive Eitje Records Check');
  console.log('====================================');
  
  await checkRawTables();
  await checkAggregatedTables();
  await checkDateRanges();
  await checkTableStructure();
  await testBatchProcessing();
  
  console.log('\n🎉 All checks completed!');
  console.log('\n📋 Summary:');
  console.log('- Check raw tables for data existence');
  console.log('- Check aggregated tables for processed data');
  console.log('- Verify date ranges cover 2024-2025');
  console.log('- Test batch processing API');
  console.log('- Verify table structure');
}

main().catch(console.error);


