/**
 * Re-aggregate Van Kinsbergen 2024 and 2025 data with fixed calculations
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

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEARS = [2024, 2025];

async function reAggregateMonth(year, month) {
  try {
    const response = await fetch('http://localhost:3000/api/finance/pnl-aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: VAN_KINSBERGEN_ID,
        year: year,
        month: month
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${year}-${String(month).padStart(2, '0')}: Aggregated successfully`);
      return true;
    } else {
      console.error(`❌ ${year}-${String(month).padStart(2, '0')}: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${year}-${String(month).padStart(2, '0')}: ${error.message}`);
    return false;
  }
}

async function getAvailableMonths(year) {
  try {
    // Fetch ALL records with pagination
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('powerbi_pnl_data')
        .select('month')
        .eq('location_id', VAN_KINSBERGEN_ID)
        .eq('year', year)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(`Error fetching months for ${year}:`, error);
        return [];
      }

      if (data) {
        allData = allData.concat(data);
      }

      hasMore = data && data.length === pageSize;
      from += pageSize;
    }

    const months = [...new Set(allData.map(d => d.month))].sort((a, b) => a - b);
    return months;
  } catch (error) {
    console.error(`Error fetching months for ${year}:`, error);
    return [];
  }
}

async function main() {
  console.log('\n=== Re-aggregating Van Kinsbergen 2024 & 2025 ===\n');
  console.log('Make sure Next.js server is running on http://localhost:3000\n');

  let totalSuccess = 0;
  let totalAttempted = 0;

  for (const year of YEARS) {
    console.log(`\n📅 Processing year ${year}...`);
    const months = await getAvailableMonths(year);
    
    if (months.length === 0) {
      console.log(`   ⚠️  No data found for ${year}`);
      continue;
    }

    console.log(`   Found ${months.length} months: ${months.join(', ')}\n`);

    for (const month of months) {
      totalAttempted++;
      const success = await reAggregateMonth(year, month);
      if (success) totalSuccess++;
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Successfully re-aggregated ${totalSuccess}/${totalAttempted} month(s)`);
  console.log('\nRefresh the PNL Balance page to see updated values.\n');
}

main().catch(console.error);

