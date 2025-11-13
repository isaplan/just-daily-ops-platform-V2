#!/usr/bin/env tsx

/**
 * Check for duplicate records in powerbi_pnl_data
 * Identifies exact duplicates and potential double-counting issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS: Record<string, { id: string; name: string }> = {
  kinsbergen: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Van Kinsbergen'
  },
  lamour: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'L\'Amour Toujours'
  }
};

async function checkDuplicates(locationId: string, locationName: string, year: number, month?: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Checking duplicates: ${locationName} - ${year}${month ? `-${String(month).padStart(2, '0')}` : ''}`);
  
  let query = supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', locationId)
    .eq('year', year);
  
  if (month) {
    query = query.eq('month', month);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`❌ Error fetching data: ${error.message}`);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️  No data found`);
    return;
  }
  
  console.log(`📊 Total records: ${data.length}`);
  
  // Check for exact duplicates (same location, year, month, category, subcategory, gl_account, amount)
  const duplicateMap = new Map<string, number>();
  const duplicateDetails: Array<{
    key: string;
    count: number;
    records: any[];
  }> = [];
  
  data.forEach(record => {
    const key = `${record.category}|${record.subcategory}|${record.gl_account}|${record.amount}`;
    const count = duplicateMap.get(key) || 0;
    duplicateMap.set(key, count + 1);
  });
  
  // Find actual duplicates
  duplicateMap.forEach((count, key) => {
    if (count > 1) {
      const [category, subcategory, glAccount, amount] = key.split('|');
      const matchingRecords = data.filter(r => 
        r.category === category &&
        r.subcategory === subcategory &&
        r.gl_account === glAccount &&
        r.amount === parseFloat(amount)
      );
      
      duplicateDetails.push({
        key,
        count,
        records: matchingRecords
      });
    }
  });
  
  if (duplicateDetails.length > 0) {
    console.log(`\n❌ Found ${duplicateDetails.length} duplicate groups (${duplicateDetails.reduce((sum, d) => sum + d.count - 1, 0)} extra records)`);
    
    // Show first 10 duplicates
    duplicateDetails.slice(0, 10).forEach((dup, idx) => {
      const [category, subcategory, glAccount, amount] = dup.key.split('|');
      console.log(`\n  ${idx + 1}. ${category} / ${subcategory} / ${glAccount}`);
      console.log(`     Amount: €${parseFloat(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
      console.log(`     Count: ${dup.count} times`);
      console.log(`     Import IDs: ${dup.records.map(r => r.import_id).join(', ')}`);
    });
    
    if (duplicateDetails.length > 10) {
      console.log(`\n  ... and ${duplicateDetails.length - 10} more duplicate groups`);
    }
  } else {
    console.log(`✅ No exact duplicates found`);
  }
  
  // Check for potential double-counting (same category/subcategory/gl_account but different amounts)
  const similarMap = new Map<string, number>();
  data.forEach(record => {
    const key = `${record.category}|${record.subcategory}|${record.gl_account}`;
    const count = similarMap.get(key) || 0;
    similarMap.set(key, count + 1);
  });
  
  const similarDuplicates = Array.from(similarMap.entries())
    .filter(([_, count]) => count > 1)
    .slice(0, 10);
  
  if (similarDuplicates.length > 0) {
    console.log(`\n⚠️  Found ${similarDuplicates.length} groups with same category/subcategory/gl_account but potentially different amounts:`);
    similarDuplicates.forEach(([key, count], idx) => {
      const [category, subcategory, glAccount] = key.split('|');
      const matchingRecords = data.filter(r => 
        r.category === category &&
        r.subcategory === subcategory &&
        r.gl_account === glAccount
      );
      const amounts = matchingRecords.map(r => r.amount);
      const uniqueAmounts = new Set(amounts);
      
      if (uniqueAmounts.size > 1) {
        console.log(`\n  ${idx + 1}. ${category} / ${subcategory} / ${glAccount}`);
        console.log(`     Records: ${count}, Unique amounts: ${uniqueAmounts.size}`);
        console.log(`     Amounts: ${Array.from(uniqueAmounts).map(a => `€${a.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`).join(', ')}`);
      }
    });
  }
  
  // Summary by month
  if (!month) {
    const monthGroups = new Map<number, number>();
    data.forEach(r => {
      const count = monthGroups.get(r.month) || 0;
      monthGroups.set(r.month, count + 1);
    });
    
    console.log(`\n📅 Records per month:`);
    Array.from(monthGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([month, count]) => {
        console.log(`   Month ${month}: ${count} records`);
      });
  }
}

async function main() {
  console.log('🔍 Checking for duplicate P&L data...\n');
  
  // Check Kinsbergen September 2025
  await checkDuplicates(
    LOCATIONS.kinsbergen.id,
    LOCATIONS.kinsbergen.name,
    2025,
    9
  );
  
  // Check L'Amour all months 2025
  await checkDuplicates(
    LOCATIONS.lamour.id,
    LOCATIONS.lamour.name,
    2025
  );
  
  // Check Kinsbergen all months 2025
  await checkDuplicates(
    LOCATIONS.kinsbergen.id,
    LOCATIONS.kinsbergen.name,
    2025
  );
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ Duplicate check complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

