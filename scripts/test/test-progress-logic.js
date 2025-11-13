#!/usr/bin/env node

/**
 * Test the progress tracking logic to understand why October 2024 shows 0/31 days
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProgressLogic() {
  console.log('🧪 Testing Progress Tracking Logic');
  console.log('==================================');
  
  try {
    // Test October 2024 for different endpoints
    const year = 2024;
    const month = 10;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    console.log(`\n📅 Testing ${year}-${month.toString().padStart(2, '0')}`);
    console.log(`Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
    
    const endpoints = [
      'environments',
      'teams', 
      'users',
      'shift_types',
      'time_registration_shifts',
      'revenue_days'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing ${endpoint}:`);
      
      const tableName = getTableName(endpoint);
      console.log(`  Table: ${tableName}`);
      
      // Get all records for this endpoint
      const { data: records, error } = await supabase
        .from(tableName)
        .select('id, created_at, updated_at, raw_data, date')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }
      
      console.log(`  📊 Total records: ${records?.length || 0}`);
      
      if (records && records.length > 0) {
        console.log(`  📅 First record: ${records[0].created_at}`);
        console.log(`  📅 Last record: ${records[records.length - 1].created_at}`);
        
        // Check for date field
        const firstRecord = records[0];
        console.log(`  📅 Date field: ${firstRecord.date || 'null'}`);
        console.log(`  📅 Raw data keys:`, Object.keys(firstRecord.raw_data || {}));
        
        if (firstRecord.raw_data && firstRecord.raw_data.date) {
          console.log(`  📅 Raw data date: ${firstRecord.raw_data.date}`);
        }
        
        // Group by date (like the progress tracker does)
        const recordsByDate = new Map();
        records.forEach(record => {
          let dataDate = null;
          if (record.raw_data && record.raw_data.date) {
            dataDate = record.raw_data.date;
          } else if (record.date) {
            dataDate = record.date;
          }
          
          if (dataDate) {
            const dateStr = new Date(dataDate).toISOString().split('T')[0];
            if (!recordsByDate.has(dateStr)) {
              recordsByDate.set(dateStr, []);
            }
            recordsByDate.get(dateStr).push(record);
          }
        });
        
        console.log(`  📅 Unique dates with data: ${recordsByDate.size}`);
        if (recordsByDate.size > 0) {
          const dates = Array.from(recordsByDate.keys()).sort();
          console.log(`  📅 Dates: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}`);
        }
        
        // Check if any records fall within October 2024
        const octoberRecords = records.filter(record => {
          const createdAt = new Date(record.created_at);
          return createdAt >= startOfMonth && createdAt <= endOfMonth;
        });
        
        console.log(`  📅 Records created in October 2024: ${octoberRecords.length}`);
        
        // For master data, we should count it as synced even if no date-specific data
        if (['environments', 'teams', 'users', 'shift_types'].includes(endpoint)) {
          console.log(`  ✅ Master data endpoint - should count as synced`);
        } else {
          console.log(`  📊 Data endpoint - needs date-specific records`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

function getTableName(endpoint) {
  const tableMap = {
    'environments': 'eitje_environments',
    'teams': 'eitje_teams',
    'users': 'eitje_users',
    'shift_types': 'eitje_shift_types',
    'time_registration_shifts': 'eitje_time_registration_shifts_raw',
    'planning_shifts': 'eitje_planning_shifts_raw',
    'revenue_days': 'eitje_revenue_days_raw'
  };
  
  return tableMap[endpoint] || `eitje_${endpoint}_raw`;
}

testProgressLogic();


