/**
 * Diagnostic script to compare expected vs calculated PNL values
 * Run with: node scripts/diagnose-pnl-calculations.js
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
const YEAR = 2025;

// Expected results from accountant (from large.png)
const EXPECTED = {
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

async function diagnoseMonth(month) {
  const expected = EXPECTED[month];
  if (!expected) return null;

  // Fetch raw data
  const { data: rawData, error: rawError } = await supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', YEAR)
    .eq('month', month);

  if (rawError) {
    return { month, error: rawError.message };
  }

  if (!rawData || rawData.length === 0) {
    return { month, error: 'No raw data found' };
  }

  // Calculate revenue (positive amounts)
  let calculatedRevenue = 0;
  const revenueRecords = rawData.filter(r => {
    const amount = r.amount || 0;
    const cat = (r.category || '').toLowerCase();
    const subcat = (r.subcategory || '').toLowerCase();
    
    // Revenue categories
    if (cat.includes('netto-omzet') || 
        cat.includes('omzet') && amount > 0 ||
        (cat.includes('opbrengst') && subcat.includes('vorderingen'))) {
      calculatedRevenue += amount;
      return true;
    }
    return false;
  });

  // Calculate costs (negative amounts, convert to positive)
  let calculatedCosts = 0;
  const costRecords = rawData.filter(r => {
    const amount = r.amount || 0;
    const cat = (r.category || '').toLowerCase();
    
    // Cost categories (should be negative in DB)
    if (amount < 0 || 
        cat.includes('inkoop') ||
        cat.includes('kostprijs') ||
        cat.includes('lonen') ||
        cat.includes('salaris') ||
        cat.includes('arbeid') ||
        cat.includes('personeel') ||
        cat.includes('huisvesting') ||
        cat.includes('exploitatie') ||
        cat.includes('verkoop') ||
        cat.includes('auto') ||
        cat.includes('kantoor') ||
        cat.includes('assurantie') ||
        cat.includes('accountant') ||
        cat.includes('administratief') ||
        cat.includes('andere') ||
        cat.includes('afschrijving') ||
        cat.includes('financieel') ||
        cat.includes('overige bedrijfskosten')) {
      calculatedCosts += Math.abs(amount); // Convert to positive
      return true;
    }
    return false;
  });

  // Special: opbrengst_vorderingen (positive revenue)
  let opbrengstVorderingen = 0;
  rawData.forEach(r => {
    const cat = (r.category || '').toLowerCase();
    if (cat.includes('opbrengst') && cat.includes('vorderingen') && r.amount > 0) {
      opbrengstVorderingen += r.amount;
    }
  });

  // Calculate result: Revenue - COGS + Opbrengst_vorderingen
  const calculatedResult = calculatedRevenue - calculatedCosts + opbrengstVorderingen;
  const calculatedCogs = calculatedCosts;

  // Expected COGS = Revenue - Result
  const expectedCogs = expected.revenue - expected.result;

  // Fetch aggregated data
  const { data: aggregatedData } = await supabase
    .from('powerbi_pnl_aggregated')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', YEAR)
    .eq('month', month)
    .single();

  return {
    month,
    expected: {
      revenue: expected.revenue,
      result: expected.result,
      cogs: expectedCogs
    },
    calculated: {
      revenue: calculatedRevenue,
      cogs: calculatedCogs,
      result: calculatedResult,
      opbrengstVorderingen
    },
    aggregated: aggregatedData ? {
      revenue: aggregatedData.revenue_total || aggregatedData.total_revenue || 0,
      result: aggregatedData.resultaat || 0,
      cogs: (aggregatedData.cost_of_sales_total || 0) + 
            (aggregatedData.labor_total || aggregatedData.lonen_en_salarissen || 0) +
            (aggregatedData.other_costs_total || 0)
    } : null,
    differences: {
      revenue: calculatedRevenue - expected.revenue,
      result: calculatedResult - expected.result,
      cogs: calculatedCogs - expectedCogs
    },
    rawDataCount: rawData.length,
    revenueRecordCount: revenueRecords.length,
    costRecordCount: costRecords.length
  };
}

async function main() {
  console.log('\n=== PNL CALCULATION DIAGNOSTIC ===\n');
  console.log(`Location: Van Kinsbergen (${VAN_KINSBERGEN_ID})`);
  console.log(`Year: ${YEAR}\n`);

  const results = [];
  for (let month = 1; month <= 9; month++) {
    const result = await diagnoseMonth(month);
    if (result) results.push(result);
  }

  // Print table
  console.log('┌───────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
  console.log('│ Month │ Exp Revenue │ Exp Result  │ Calc Revenue│ Calc Result │ Diff Revenue│ Diff Result │');
  console.log('├───────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');
  
  results.forEach(r => {
    if (r.error) {
      console.log(`│   ${r.month}   │ ERROR: ${r.error.padEnd(39)}│`);
    } else {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][r.month - 1];
      const expRev = r.expected.revenue.toLocaleString('nl-NL').padStart(11);
      const expRes = r.expected.result.toLocaleString('nl-NL').padStart(11);
      const calcRev = r.calculated.revenue.toLocaleString('nl-NL').padStart(11);
      const calcRes = r.calculated.result.toLocaleString('nl-NL').padStart(11);
      const diffRev = r.differences.revenue.toLocaleString('nl-NL').padStart(11);
      const diffRes = r.differences.result.toLocaleString('nl-NL').padStart(11);
      console.log(`│ ${monthName.padEnd(5)} │ ${expRev} │ ${expRes} │ ${calcRev} │ ${calcRes} │ ${diffRev} │ ${diffRes} │`);
    }
  });
  
  console.log('└───────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');

  // COGS comparison
  console.log('\n┌───────┬─────────────┬─────────────┬─────────────┬─────────────┐');
  console.log('│ Month │ Exp COGS    │ Calc COGS   │ Diff COGS   │ Raw Records │');
  console.log('├───────┼─────────────┼─────────────┼─────────────┼─────────────┤');
  
  results.forEach(r => {
    if (!r.error) {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][r.month - 1];
      const expCogs = r.expected.cogs.toLocaleString('nl-NL').padStart(11);
      const calcCogs = r.calculated.cogs.toLocaleString('nl-NL').padStart(11);
      const diffCogs = r.differences.cogs.toLocaleString('nl-NL').padStart(11);
      const rawCount = r.rawDataCount.toString().padStart(11);
      console.log(`│ ${monthName.padEnd(5)} │ ${expCogs} │ ${calcCogs} │ ${diffCogs} │ ${rawCount} │`);
    }
  });
  
  console.log('└───────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');

  // Summary
  const totalExpectedRevenue = results.reduce((sum, r) => sum + (r.expected?.revenue || 0), 0);
  const totalCalculatedRevenue = results.reduce((sum, r) => sum + (r.calculated?.revenue || 0), 0);
  const totalExpectedResult = results.reduce((sum, r) => sum + (r.expected?.result || 0), 0);
  const totalCalculatedResult = results.reduce((sum, r) => sum + (r.calculated?.result || 0), 0);

  console.log('\n=== SUMMARY ===');
  console.log(`Total Expected Revenue: ${totalExpectedRevenue.toLocaleString('nl-NL')} €`);
  console.log(`Total Calculated Revenue: ${totalCalculatedRevenue.toLocaleString('nl-NL')} €`);
  console.log(`Revenue Difference: ${(totalCalculatedRevenue - totalExpectedRevenue).toLocaleString('nl-NL')} €`);
  console.log(`\nTotal Expected Result: ${totalExpectedResult.toLocaleString('nl-NL')} €`);
  console.log(`Total Calculated Result: ${totalCalculatedResult.toLocaleString('nl-NL')} €`);
  console.log(`Result Difference: ${(totalCalculatedResult - totalExpectedResult).toLocaleString('nl-NL')} €`);
}

main().catch(console.error);



