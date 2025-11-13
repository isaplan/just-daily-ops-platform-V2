#!/usr/bin/env node

/**
 * Re-Aggregate All P&L Data
 * 
 * Re-aggregates all P&L data using the updated calculation logic.
 * This ensures all aggregated data matches the corrected calculations.
 * 
 * Usage: node scripts/re-aggregate-all-pnl-data.js [locationId] [year]
 *   - No args: Re-aggregate all locations and years
 *   - locationId only: Re-aggregate all years for that location
 *   - locationId + year: Re-aggregate specific location/year
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Location UUIDs
const LOCATIONS = {
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

// Import the aggregation function
// Since we can't directly import TypeScript, we'll use the API endpoint
async function aggregateViaAPI(locationId, year, month = null) {
  const url = month 
    ? `http://localhost:3000/api/finance/pnl-aggregate?locationId=${locationId}&year=${year}&month=${month}`
    : `http://localhost:3000/api/finance/pnl-aggregate?locationId=${locationId}&year=${year}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId,
        year,
        month,
        aggregateAll: !month
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`API call failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Get all unique location/year/month combinations from raw data
async function getDataCombinations(locationId = null, year = null) {
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
  const combinations = new Map();
  data.forEach(item => {
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

async function aggregateCombination(locationId, year, month, locationName) {
  console.log(`\n🔄 Aggregating: ${locationName} - ${year}-${String(month).padStart(2, '0')}`);
  
  // Use direct database approach since API might not be running
  // Import aggregation service logic
  const { aggregatePnLData } = await import('../src/lib/finance/powerbi/aggregation-service.ts');
  
  try {
    const result = await aggregatePnLData(locationId, year, month);
    console.log(`  ✅ Success: Resultaat = €${(result.resultaat || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    return { success: true, result };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetLocationId = args[0] || null;
  const targetYear = args[1] ? parseInt(args[1]) : null;
  
  console.log('🚀 Starting P&L Data Re-Aggregation');
  console.log('=' .repeat(60));
  
  if (targetLocationId) {
    const location = Object.values(LOCATIONS).find(l => l.id === targetLocationId);
    if (!location && targetLocationId !== 'all') {
      console.error(`Unknown location ID: ${targetLocationId}`);
      console.error('Available:', Object.values(LOCATIONS).map(l => `${l.name}: ${l.id}`).join(', '));
      process.exit(1);
    }
  }
  
  // Get all combinations
  const combinations = await getDataCombinations(targetLocationId, targetYear);
  console.log(`\n📊 Found ${combinations.length} location/year/month combinations to aggregate`);
  
  // Group by location and year
  const grouped = {};
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
    grouped[key].months.push(combo.month);
  });
  
  const groups = Object.values(grouped);
  console.log(`\n📦 Grouped into ${groups.length} location/year groups`);
  
  // Process each group
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (const group of groups) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${group.locationName} - ${group.year}`);
    console.log(`   Months to process: ${group.months.sort((a, b) => a - b).join(', ')}`);
    
    // Aggregate all months for this location/year
    for (const month of group.months.sort((a, b) => a - b)) {
      totalProcessed++;
      
      // Try using API first, fallback to direct import
      const result = await aggregateCombination(
        group.location_id,
        group.year,
        month,
        group.locationName
      );
      
      if (result.success) {
        totalSuccess++;
      } else {
        totalErrors++;
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Aggregation Summary:');
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`\n✨ Re-aggregation complete!`);
}

// Since we can't easily import TypeScript, let's use a simpler approach
// Fetch directly from API or use a node script that can handle it

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

