/**
 * Check V2 Processed Data Date Issue
 * Investigates why dates are showing as future dates (2025)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDateIssue() {
  console.log('🔍 Checking V2 Processed Data Date Issue...\n');

  // Get sample records with date info
  const { data: records, error } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('id, date, start, "end", updated_at, raw_data')
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching records:', error);
    return;
  }

  console.log(`📊 Found ${records?.length || 0} sample records\n`);

  records?.forEach((record, index) => {
    console.log(`\n--- Record ${index + 1} ---`);
    console.log(`ID: ${record.id}`);
    console.log(`Date (DB): ${record.date}`);
    console.log(`Start (DB): ${record.start}`);
    console.log(`End (DB): ${record.end}`);
    console.log(`Updated At (DB): ${record.updated_at}`);
    
    // Check raw_data for date fields
    if (record.raw_data) {
      console.log(`\nRaw Data Date Fields:`);
      console.log(`  - date: ${record.raw_data.date}`);
      console.log(`  - start: ${record.raw_data.start}`);
      console.log(`  - end: ${record.raw_data.end}`);
      console.log(`  - created_at: ${record.raw_data.created_at}`);
      console.log(`  - updated_at: ${record.raw_data.updated_at}`);
    }

    // Check date parsing
    const dbDate = new Date(record.date);
    const startDate = record.start ? new Date(record.start) : null;
    const endDate = record.end ? new Date(record.end) : null;
    
    console.log(`\nParsed Dates:`);
    console.log(`  - DB Date: ${dbDate.toISOString()} (Year: ${dbDate.getFullYear()})`);
    if (startDate) {
      console.log(`  - Start: ${startDate.toISOString()} (Year: ${startDate.getFullYear()})`);
    }
    if (endDate) {
      console.log(`  - End: ${endDate.toISOString()} (Year: ${endDate.getFullYear()})`);
    }
  });

  // Check date distribution
  console.log('\n\n📅 Date Distribution:');
  const { data: dateStats } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('date')
    .order('date', { ascending: false })
    .limit(1000);

  if (dateStats) {
    const years = dateStats.map(r => new Date(r.date).getFullYear());
    const yearCounts = years.reduce((acc, year) => {
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});

    console.log('Year distribution (last 1000 records):');
    Object.entries(yearCounts)
      .sort(([a], [b]) => b - a)
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count} records`);
      });
  }

  // Check raw table dates for comparison
  console.log('\n🔍 Raw Table Date Comparison:');
  const { data: rawRecords } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('id, date, raw_data')
    .order('date', { ascending: false })
    .limit(5);

  if (rawRecords) {
    rawRecords.forEach((record, index) => {
      console.log(`\nRaw Record ${index + 1}:`);
      console.log(`  DB Date: ${record.date}`);
      if (record.raw_data?.date) {
        console.log(`  Raw Data Date: ${record.raw_data.date}`);
      }
    });
  }
}

checkDateIssue()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

