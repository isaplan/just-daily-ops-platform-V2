/**
 * Verify calculations against expected values
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';

const EXPECTED_2025 = {
  1: { revenue: 141481, result: -21849 },
  2: { revenue: 127765, result: -15759 },
  3: { revenue: 172610, result: -39542 },
  4: { revenue: 183713, result: 17157 },
  5: { revenue: 185092, result: -4614 },
  6: { revenue: 173132, result: -16161 },
  7: { revenue: 188347, result: 11091 },
  8: { revenue: 171269, result: -3017 },
  9: { revenue: 138042, result: -11215 }
};

async function verifyMonth(year, month) {
  // Get aggregated data
  const { data: aggregated, error } = await supabase
    .from('powerbi_pnl_aggregated')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error || !aggregated) {
    return { month, error: error?.message || 'No data found' };
  }

  const expected = year === 2025 ? EXPECTED_2025[month] : null;

  return {
    month,
    year,
    aggregated: {
      revenue: aggregated.revenue_total || aggregated.total_revenue || 0,
      result: aggregated.resultaat || 0,
      cost_of_sales: aggregated.cost_of_sales_total || aggregated.inkoopwaarde_handelsgoederen || 0,
      labor: aggregated.labor_total || aggregated.lonen_en_salarissen || 0,
      other_costs: aggregated.other_costs_total || 0
    },
    expected: expected || null,
    differences: expected ? {
      revenue: (aggregated.revenue_total || 0) - expected.revenue,
      result: (aggregated.resultaat || 0) - expected.result
    } : null
  };
}

async function main() {
  console.log('\n=== VERIFYING CALCULATIONS ===\n');

  // Check 2025 months
  console.log('2025 (with expected values):\n');
  for (let month = 1; month <= 9; month++) {
    const result = await verifyMonth(2025, month);
    if (result.error) {
      console.log(`Month ${month}: ${result.error}`);
    } else {
      const exp = result.expected;
      const agg = result.aggregated;
      const diff = result.differences;
      
      console.log(`Month ${month}:`);
      console.log(`  Revenue: ${agg.revenue.toLocaleString('nl-NL')} (expected: ${exp.revenue.toLocaleString('nl-NL')}, diff: ${diff.revenue.toLocaleString('nl-NL')})`);
      console.log(`  Result:  ${agg.result.toLocaleString('nl-NL')} (expected: ${exp.result.toLocaleString('nl-NL')}, diff: ${diff.result.toLocaleString('nl-NL')})`);
      console.log(`  COGS: ${(agg.cost_of_sales + agg.labor + agg.other_costs).toLocaleString('nl-NL')}`);
      console.log(`  Expected COGS: ${(exp.revenue - exp.result).toLocaleString('nl-NL')}`);
      console.log('');
    }
  }

  // Check a few 2024 months
  console.log('\n2024 (sample months):\n');
  for (let month = 1; month <= 3; month++) {
    const result = await verifyMonth(2024, month);
    if (result.error) {
      console.log(`Month ${month}: ${result.error}`);
    } else {
      const agg = result.aggregated;
      console.log(`Month ${month}:`);
      console.log(`  Revenue: ${agg.revenue.toLocaleString('nl-NL')}`);
      console.log(`  Result:  ${agg.result.toLocaleString('nl-NL')}`);
      console.log(`  COGS: ${(agg.cost_of_sales + agg.labor + agg.other_costs).toLocaleString('nl-NL')}`);
      console.log('');
    }
  }
}

main().catch(console.error);



