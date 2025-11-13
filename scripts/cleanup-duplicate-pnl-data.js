/**
 * Clean up duplicate PNL data by keeping only the latest import for each location/year/month
 * This removes duplicates that accumulated from imports that didn't properly delete existing data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
  console.log('\n=== Cleaning Up Duplicate PNL Data ===\n');

  // Get all unique location/year/month combinations with pagination
  const uniqueCombos = new Set();
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: combinations, error: comboError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year, month')
      .order('location_id')
      .order('year')
      .order('month')
      .range(from, from + pageSize - 1);

    if (comboError) {
      console.error('Error fetching combinations:', comboError);
      break;
    }

    if (combinations) {
      combinations.forEach(c => {
        uniqueCombos.add(`${c.location_id}|${c.year}|${c.month}`);
      });
    }

    hasMore = combinations && combinations.length === pageSize;
    from += pageSize;
  }

  console.log(`Found ${uniqueCombos.size} unique location/year/month combinations\n`);

  let totalDeleted = 0;
  let totalKept = 0;

  for (const combo of uniqueCombos) {
    const [locationId, year, month] = combo.split('|');
    
    // Fetch ALL records for this combination (with pagination)
    let allRecords = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('powerbi_pnl_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('year', parseInt(year))
        .eq('month', parseInt(month))
        .order('created_at', { ascending: false }) // Latest first
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(`Error fetching records for ${combo}:`, error);
        break;
      }

      if (data) {
        allRecords = allRecords.concat(data);
      }

      hasMore = data && data.length === pageSize;
      from += pageSize;
    }

    if (allRecords.length === 0) continue;

    // Group by unique key: category|subcategory|gl_account|amount
    const uniqueKeys = new Map();
    const recordsToKeep = [];
    const recordsToDelete = [];

    allRecords.forEach(record => {
      const key = `${record.category}|${record.subcategory || ''}|${record.gl_account || ''}|${record.amount || 0}`;
      
      if (!uniqueKeys.has(key)) {
        // First occurrence (latest due to ordering) - keep it
        uniqueKeys.set(key, record.id);
        recordsToKeep.push(record.id);
      } else {
        // Duplicate - mark for deletion
        recordsToDelete.push(record.id);
      }
    });

    if (recordsToDelete.length > 0) {
      console.log(`📍 ${locationId.substring(0, 8)}... ${year}-${String(month).padStart(2, '0')}: ${allRecords.length} records, ${recordsToKeep.length} unique, ${recordsToDelete.length} duplicates`);

      // Delete duplicates in batches
      const BATCH_SIZE = 500;
      for (let i = 0; i < recordsToDelete.length; i += BATCH_SIZE) {
        const batch = recordsToDelete.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('powerbi_pnl_data')
          .delete()
          .in('id', batch);

        if (error) {
          console.error(`Error deleting batch for ${combo}:`, error);
        } else {
          totalDeleted += batch.length;
        }
      }

      totalKept += recordsToKeep.length;
    } else {
      totalKept += allRecords.length;
    }
  }

  console.log(`\n✅ Cleanup Complete:`);
  console.log(`   Kept: ${totalKept.toLocaleString('nl-NL')} unique records`);
  console.log(`   Deleted: ${totalDeleted.toLocaleString('nl-NL')} duplicate records`);
  console.log(`\n⚠️  Next step: Re-aggregate all data using: node scripts/re-aggregate-van-kinsbergen.js\n`);
}

cleanupDuplicates().catch(console.error);

