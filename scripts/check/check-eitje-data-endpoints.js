#!/usr/bin/env node

/**
 * Check Eitje Data Endpoints
 * Checks labor data (time_registration_shifts) and revenue data (revenue_days, events)
 */

const { createClient } = require('@supabase/supabase-js');

// DEFENSIVE: Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data endpoints to check (excluding planning_shifts per user request)
const DATA_ENDPOINTS = [
  { name: 'time_registration_shifts', table: 'eitje_time_registration_shifts', type: 'labor' },
  { name: 'revenue_days', table: 'eitje_revenue_days', type: 'revenue' },
  { name: 'events', table: 'eitje_shifts', type: 'revenue' }
];

async function checkTableData(endpoint) {
  try {
    console.log(`🔍 Checking ${endpoint.name} (${endpoint.type})...`);
    
    // Get count
    const { count, error } = await supabase
      .from(endpoint.table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
      return { ...endpoint, count: 0, hasData: false, error: error.message };
    }
    
    const hasData = count > 0;
    const status = hasData ? '✅' : '❌';
    
    console.log(`${status} ${endpoint.name}: ${count} records`);
    
    // If has data, get date range
    let dateRange = null;
    if (hasData && endpoint.table !== 'eitje_shifts') {
      try {
        const { data: minDate } = await supabase
          .from(endpoint.table)
          .select('date')
          .order('date', { ascending: true })
          .limit(1);
        
        const { data: maxDate } = await supabase
          .from(endpoint.table)
          .select('date')
          .order('date', { ascending: false })
          .limit(1);
        
        if (minDate && maxDate && minDate[0] && maxDate[0]) {
          dateRange = {
            start: minDate[0].date,
            end: maxDate[0].date
          };
        }
      } catch (dateError) {
        console.log(`   ⚠️  Could not get date range: ${dateError.message}`);
      }
    }
    
    return { ...endpoint, count, hasData, error: null, dateRange };
    
  } catch (error) {
    console.log(`❌ ${endpoint.name}: Exception - ${error.message}`);
    return { ...endpoint, count: 0, hasData: false, error: error.message };
  }
}

async function checkDataEndpoints() {
  console.log('📊 EITJE DATA ENDPOINTS CHECK');
  console.log('='.repeat(60));
  console.log('Checking labor and revenue data endpoints...');
  console.log('(planning_shifts excluded per user request)');
  console.log('='.repeat(60));
  
  const results = [];
  let totalRecords = 0;
  let tablesWithData = 0;
  
  for (const endpoint of DATA_ENDPOINTS) {
    const result = await checkTableData(endpoint);
    results.push(result);
    
    if (result.hasData) {
      totalRecords += result.count;
      tablesWithData++;
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Total Endpoints: ${DATA_ENDPOINTS.length}`);
  console.log(`Endpoints with Data: ${tablesWithData}`);
  console.log(`Endpoints Empty: ${DATA_ENDPOINTS.length - tablesWithData}`);
  console.log(`Total Records: ${totalRecords}`);
  
  // Show date ranges for tables with data
  console.log('\n📅 DATE RANGES:');
  console.log('='.repeat(60));
  for (const result of results) {
    if (result.hasData && result.dateRange) {
      console.log(`${result.name}: ${result.dateRange.start} to ${result.dateRange.end}`);
    } else if (result.hasData) {
      console.log(`${result.name}: Data exists (no date range available)`);
    } else {
      console.log(`${result.name}: No data`);
    }
  }
  
  if (tablesWithData === DATA_ENDPOINTS.length) {
    console.log('\n🎉 ALL DATA ENDPOINTS HAVE DATA!');
  } else if (tablesWithData > 0) {
    console.log('\n⚠️  SOME DATA ENDPOINTS HAVE DATA');
  } else {
    console.log('\n❌ NO DATA ENDPOINTS HAVE DATA');
  }
  
  return results;
}

// Main execution
if (require.main === module) {
  checkDataEndpoints()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDataEndpoints };
