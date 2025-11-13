/**
 * Script to process raw hours data into processed table
 * This will unpack JSONB data from eitje_time_registration_shifts_raw 
 * into eitje_time_registration_shifts_processed
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDataStatus() {
  console.log('🔍 Checking data status...\n');
  
  // Check raw data
  const { data: rawData, error: rawError, count: rawCount } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('*', { count: 'exact', head: true });
  
  if (rawError) {
    console.error('❌ Error checking raw data:', rawError.message);
    return false;
  }
  
  console.log(`📊 Raw data records: ${rawCount || 0}`);
  
  // Check date range
  const { data: dateRange, error: dateError } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);
  
  if (!dateError && dateRange && dateRange.length > 0) {
    const { data: minDate } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('date')
      .order('date', { ascending: true })
      .limit(1);
    
    console.log(`📅 Date range: ${minDate?.[0]?.date || 'N/A'} to ${dateRange[0].date}`);
  }
  
  // Check processed data
  const { data: processedData, error: processedError, count: processedCount } = await supabase
    .from('eitje_time_registration_shifts_processed')
    .select('*', { count: 'exact', head: true });
  
  if (processedError) {
    console.error('❌ Error checking processed data:', processedError.message);
    return false;
  }
  
  console.log(`✅ Processed data records: ${processedCount || 0}\n`);
  
  return {
    rawCount: rawCount || 0,
    processedCount: processedCount || 0,
    needsProcessing: (rawCount || 0) > (processedCount || 0)
  };
}

async function processHoursData(startDate = '2020-01-01', endDate = null) {
  const end = endDate || new Date().toISOString().split('T')[0];
  
  console.log(`\n🔄 Processing hours data from ${startDate} to ${end}...\n`);
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/eitje/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'time_registration_shifts',
        startDate,
        endDate: end
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
      return true;
    } else {
      console.error(`❌ Processing failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error calling process API:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Processing Hours Data\n');
  console.log('='.repeat(50));
  
  // Check current status
  const status = await checkDataStatus();
  
  if (!status) {
    console.error('❌ Failed to check data status');
    process.exit(1);
  }
  
  if (status.rawCount === 0) {
    console.log('⚠️  No raw data found. Please sync data first.');
    process.exit(0);
  }
  
  if (status.processedCount === status.rawCount && !status.needsProcessing) {
    console.log('✅ Data is already processed!');
    process.exit(0);
  }
  
  // Process all available data
  const success = await processHoursData('2020-01-01');
  
  if (success) {
    console.log('\n✅ Processing completed!');
    
    // Verify
    const newStatus = await checkDataStatus();
    if (newStatus) {
      console.log(`\n📊 Final status: ${newStatus.processedCount} processed records`);
    }
  } else {
    console.error('\n❌ Processing failed');
    process.exit(1);
  }
}

main().catch(console.error);


