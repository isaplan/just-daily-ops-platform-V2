#!/usr/bin/env tsx

/**
 * Clean up duplicate P&L data records
 * Keeps only the first occurrence of each unique record
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

async function cleanupDuplicates(locationId: string, locationName: string, year: number, month?: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧹 Cleaning duplicates: ${locationName} - ${year}${month ? `-${String(month).padStart(2, '0')}` : ''}`);
  
  // Fetch all records
  let query = supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', locationId)
    .eq('year', year)
    .order('created_at', { ascending: true }); // Keep oldest first
  
  if (month) {
    query = query.eq('month', month);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`❌ Error fetching data: ${error.message}`);
    return { deleted: 0, kept: 0 };
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️  No data found`);
    return { deleted: 0, kept: 0 };
  }
  
  console.log(`📊 Total records: ${data.length}`);
  
  // Group by unique key: category|subcategory|gl_account|amount
  const uniqueKeys = new Map<string, string>(); // key -> record id to keep
  const recordsToDelete: string[] = [];
  
  data.forEach(record => {
    const key = `${record.category}|${record.subcategory || ''}|${record.gl_account || ''}|${record.amount || 0}`;
    
    if (!uniqueKeys.has(key)) {
      // First occurrence - keep it
      uniqueKeys.set(key, record.id);
    } else {
      // Duplicate - mark for deletion
      recordsToDelete.push(record.id);
    }
  });
  
  if (recordsToDelete.length === 0) {
    console.log(`✅ No duplicates found`);
    return { deleted: 0, kept: data.length };
  }
  
  console.log(`🗑️  Found ${recordsToDelete.length} duplicate records to delete`);
  console.log(`✅ Will keep ${uniqueKeys.size} unique records`);
  
  // Delete duplicates in batches
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < recordsToDelete.length; i += batchSize) {
    const batch = recordsToDelete.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('powerbi_pnl_data')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error(`❌ Error deleting batch: ${deleteError.message}`);
    } else {
      deleted += batch.length;
      console.log(`  ✅ Deleted ${deleted}/${recordsToDelete.length} records...`);
    }
  }
  
  console.log(`✨ Cleanup complete: Deleted ${deleted} duplicates, kept ${uniqueKeys.size} unique records`);
  
  return { deleted, kept: uniqueKeys.size };
}

async function main() {
  console.log('🧹 Starting duplicate cleanup...\n');
  
  let totalDeleted = 0;
  let totalKept = 0;
  
  // Cleanup Kinsbergen 2025 (all months)
  const kinsbergen2025 = await cleanupDuplicates(
    LOCATIONS.kinsbergen.id,
    LOCATIONS.kinsbergen.name,
    2025
  );
  totalDeleted += kinsbergen2025.deleted;
  totalKept += kinsbergen2025.kept;
  
  // Cleanup L'Amour 2025 (all months)
  const lamour2025 = await cleanupDuplicates(
    LOCATIONS.lamour.id,
    LOCATIONS.lamour.name,
    2025
  );
  totalDeleted += lamour2025.deleted;
  totalKept += lamour2025.kept;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Cleanup Summary:');
  console.log(`   Total deleted: ${totalDeleted}`);
  console.log(`   Total kept: ${totalKept}`);
  console.log(`\n✨ Duplicate cleanup complete!`);
  console.log(`\n⚠️  IMPORTANT: Run re-aggregation after cleanup!`);
  console.log(`   npx tsx scripts/re-aggregate-pnl-batched.ts`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

