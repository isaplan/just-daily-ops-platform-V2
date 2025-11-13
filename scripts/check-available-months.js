/**
 * Check what months are available in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';

async function checkMonths() {
  console.log('\n=== Checking Available Months ===\n');

  for (const year of [2024, 2025]) {
    // Fetch ALL records with pagination
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('powerbi_pnl_data')
        .select('month, year', { count: 'exact' })
        .eq('location_id', VAN_KINSBERGEN_ID)
        .eq('year', year)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(`Error for ${year}:`, error);
        break;
      }

      if (data) {
        allData = allData.concat(data);
      }

      hasMore = data && data.length === pageSize;
      from += pageSize;
    }

    const months = [...new Set(allData.map(d => d.month))].sort((a, b) => a - b);
    const monthNames = months.map(m => {
      const date = new Date(year, m - 1);
      return date.toLocaleString('en-US', { month: 'short' });
    });

    console.log(`${year}: ${months.length} months`);
    console.log(`  Months: ${months.join(', ')} (${monthNames.join(', ')})`);
    console.log(`  Total records: ${allData.length}\n`);
  }
}

checkMonths().catch(console.error);

