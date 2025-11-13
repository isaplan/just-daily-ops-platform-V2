#!/usr/bin/env tsx

/**
 * Re-Aggregate All P&L Data with Batching
 * 
 * Re-aggregates all P&L data using the updated calculation logic.
 * Processes data in batches of 1000 records per month to avoid memory issues.
 * 
 * Usage: tsx scripts/re-aggregate-pnl-batched.ts [locationId] [year]
 *   - No args: Re-aggregate all locations and years
 *   - locationId only: Re-aggregate all years for that location
 *   - locationId + year: Re-aggregate specific location/year
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

// Import aggregation functions directly (we'll recreate them here to avoid Next.js dependencies)
// Since we can't easily import TypeScript functions that use Next.js cookies,
// we'll use the API endpoint instead

// Location UUIDs
const LOCATIONS: Record<string, { id: string; name: string }> = {
  kinsbergen: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Van Kinsbergen'
  },
  barbea: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Bar Bea'
  },
  lamour: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'L\'Amour Toujours'
  }
};

const BATCH_SIZE = 1000;

/**
 * Aggregate data for a location/year/month via API
 * The API endpoint handles batching internally
 */
async function aggregateWithBatching(
  locationId: string,
  year: number,
  month: number,
  locationName: string
): Promise<{ success: boolean; error?: string; recordCount?: number }> {
  try {
    // Check how many records we have for reporting
    const { count, error: countError } = await supabase
      .from('powerbi_pnl_data')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);

    if (countError) {
      throw new Error(`Failed to count records: ${countError.message}`);
    }

    const totalRecords = count || 0;
    
    if (totalRecords === 0) {
      console.log(`  ⚠️  No data found for ${locationName} - ${year}-${String(month).padStart(2, '0')}`);
      return { success: true, recordCount: 0 };
    }

    // Use API endpoint which handles batching internally
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/finance/pnl-aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        year,
        month,
        aggregateAll: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Aggregation failed');
    }
    
    return { success: true, recordCount: totalRecords };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

/**
 * Get all unique location/year/month combinations from raw data
 */
async function getDataCombinations(locationId: string | null = null, year: number | null = null) {
  let query = supabase
    .from('powerbi_pnl_data')
    .select('location_id, year, month')
    .order('location_id')
    .order('year', { ascending: false })
    .order('month');

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get data combinations: ${error.message}`);
  }

  // Get unique combinations
  const combinations = new Map<string, { location_id: string; year: number; month: number }>();
  data?.forEach(item => {
    const key = `${item.location_id}-${item.year}-${item.month}`;
    if (!combinations.has(key)) {
      combinations.set(key, {
        location_id: item.location_id,
        year: item.year,
        month: item.month
      });
    }
  });

  return Array.from(combinations.values());
}

async function main() {
  const args = process.argv.slice(2);
  const targetLocationId = args[0] || null;
  const targetYear = args[1] ? parseInt(args[1]) : null;

  console.log('🚀 Starting P&L Data Re-Aggregation (Batched)');
  console.log('='.repeat(60));
  console.log(`📦 Batch size: ${BATCH_SIZE} records per month\n`);

  if (targetLocationId) {
    const location = Object.values(LOCATIONS).find(l => l.id === targetLocationId);
    if (!location && targetLocationId !== 'all') {
      console.error(`❌ Unknown location ID: ${targetLocationId}`);
      console.error('Available:', Object.values(LOCATIONS).map(l => `${l.name}: ${l.id}`).join(', '));
      process.exit(1);
    }
  }

  // Get all combinations
  const combinations = await getDataCombinations(targetLocationId, targetYear);
  console.log(`📊 Found ${combinations.length} location/year/month combinations to aggregate\n`);

  // Group by location and year
  const grouped: Record<string, {
    location_id: string;
    locationName: string;
    year: number;
    months: number[];
  }> = {};

  combinations.forEach(combo => {
    const locationName = Object.values(LOCATIONS).find(l => l.id === combo.location_id)?.name || 'Unknown';
    const key = `${locationName}-${combo.year}`;
    if (!grouped[key]) {
      grouped[key] = {
        location_id: combo.location_id,
        locationName,
        year: combo.year,
        months: []
      };
    }
    if (!grouped[key].months.includes(combo.month)) {
      grouped[key].months.push(combo.month);
    }
  });

  const groups = Object.values(grouped);
  console.log(`📦 Grouped into ${groups.length} location/year groups\n`);

  // Process each group
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalRecordsProcessed = 0;

  for (const group of groups) {
    console.log(`${'='.repeat(60)}`);
    console.log(`📍 ${group.locationName} - ${group.year}`);
    console.log(`   Months to process: ${group.months.sort((a, b) => a - b).join(', ')}\n`);

    // Aggregate all months for this location/year
    for (const month of group.months.sort((a, b) => a - b)) {
      totalProcessed++;
      
      const result = await aggregateWithBatching(
        group.location_id,
        group.year,
        month,
        group.locationName
      );

      if (result.success) {
        totalSuccess++;
        totalRecordsProcessed += result.recordCount || 0;
        console.log(`  ✅ Success: ${result.recordCount || 0} records processed`);
      } else {
        totalErrors++;
        console.log(`  ❌ Error: ${result.error}`);
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Aggregation Summary:');
  console.log(`   Total months processed: ${totalProcessed}`);
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📦 Total records processed: ${totalRecordsProcessed.toLocaleString()}`);
  console.log(`\n✨ Re-aggregation complete!`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

