#!/usr/bin/env node

/**
 * Debug script to check raw data structure and date fields
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

async function debugRawData() {
  console.log('🔍 Debugging Raw Data Structure');
  console.log('================================');
  
  const tables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw',
    'eitje_revenue_days_raw'
  ];
  
  for (const table of tables) {
    console.log(`\n📊 Checking ${table}:`);
    
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ❌ Count error: ${countError.message}`);
        continue;
      }
      
      console.log(`   📈 Total records: ${count || 0}`);
      
      if (count > 0) {
        // Get sample records to check structure
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
          const record = sample[0];
          console.log(`   🔑 Available fields: ${Object.keys(record).join(', ')}`);
          
          // Check date field specifically
          if (record.date) {
            console.log(`   📅 Date field: ${record.date} (type: ${typeof record.date})`);
          } else {
            console.log(`   ⚠️  No 'date' field found`);
          }
          
          // Check if date is in raw_data
          if (record.raw_data && typeof record.raw_data === 'object') {
            console.log(`   📦 Raw data fields: ${Object.keys(record.raw_data).join(', ')}`);
            if (record.raw_data.date) {
              console.log(`   📅 Raw data date: ${record.raw_data.date}`);
            }
            if (record.raw_data.start) {
              console.log(`   📅 Raw data start: ${record.raw_data.start}`);
            }
            if (record.raw_data.end) {
              console.log(`   📅 Raw data end: ${record.raw_data.end}`);
            }
          }
          
          // Check created_at for date range
          if (record.created_at) {
            console.log(`   🕒 Created at: ${record.created_at}`);
          }
        }
        
        // Check date range queries
        console.log(`   🔍 Testing date range queries:`);
        
        // Test 2024 range
        const { data: data2024, error: error2024 } = await supabase
          .from(table)
          .select('date')
          .gte('date', '2024-01-01')
          .lte('date', '2024-12-31')
          .limit(5);
        
        if (error2024) {
          console.log(`     2024 range: ❌ ${error2024.message}`);
        } else {
          console.log(`     2024 range: ${data2024?.length || 0} records`);
          if (data2024 && data2024.length > 0) {
            console.log(`     Sample 2024 dates: ${data2024.map(r => r.date).join(', ')}`);
          }
        }
        
        // Test 2025 range
        const { data: data2025, error: error2025 } = await supabase
          .from(table)
          .select('date')
          .gte('date', '2025-01-01')
          .lte('date', '2025-12-31')
          .limit(5);
        
        if (error2025) {
          console.log(`     2025 range: ❌ ${error2025.message}`);
        } else {
          console.log(`     2025 range: ${data2025?.length || 0} records`);
          if (data2025 && data2025.length > 0) {
            console.log(`     Sample 2025 dates: ${data2025.map(r => r.date).join(', ')}`);
          }
        }
        
        // Test without date filter (all records)
        const { data: allData, error: allError } = await supabase
          .from(table)
          .select('date')
          .limit(5);
        
        if (allError) {
          console.log(`     All records: ❌ ${allError.message}`);
        } else {
          console.log(`     All records: ${allData?.length || 0} records`);
          if (allData && allData.length > 0) {
            console.log(`     Sample dates: ${allData.map(r => r.date).join(', ')}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

async function main() {
  await debugRawData();
  console.log('\n🎉 Debug completed!');
}

main().catch(console.error);


