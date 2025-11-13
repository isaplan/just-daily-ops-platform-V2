/**
 * Show calculation table with expected vs calculated values
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;

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

async function calculateMonth(month) {
  const expected = EXPECTED[month];
  if (!expected) return null;

  const { data: rawData } = await supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', YEAR)
    .eq('month', month);

  if (!rawData || rawData.length === 0) return null;

  // Calculate revenue - deduplicate by summing unique category+subcategory+GL combinations
  const revenueMap = new Map();
  rawData.forEach(r => {
    if ((r.amount || 0) > 0) {
      const cat = (r.category || '').toLowerCase();
      if (cat.includes('netto-omzet') || (cat.includes('opbrengst') && cat.includes('vorderingen'))) {
        // Exclude "Netto-omzet groepen" if we have detailed categories
        if (cat.includes('netto-omzet groepen')) {
          const hasDetailed = rawData.some(d => 
            (d.category === 'Netto-omzet uit leveringen geproduceerde goederen' || 
             d.category === 'Netto-omzet uit verkoop van handelsgoederen') &&
            (d.amount || 0) > 0
          );
          if (hasDetailed) return; // Skip parent if we have detailed
        }
        
        const key = `${r.category}|${r.subcategory}|${r.gl_account}`;
        // Use max amount for each unique combination (to handle duplicates)
        const current = revenueMap.get(key) || 0;
        revenueMap.set(key, Math.max(current, r.amount));
      }
    }
  });
  
  const calculatedRevenue = Array.from(revenueMap.values()).reduce((sum, val) => sum + val, 0);

  // Calculate costs - sum all negative amounts
  const calculatedCosts = rawData
    .filter(r => {
      const amount = r.amount || 0;
      return amount < 0 || 
        (r.category || '').toLowerCase().includes('inkoop') ||
        (r.category || '').toLowerCase().includes('kostprijs') ||
        (r.category || '').toLowerCase().includes('lonen') ||
        (r.category || '').toLowerCase().includes('salaris') ||
        (r.category || '').toLowerCase().includes('arbeid') ||
        (r.category || '').toLowerCase().includes('personeel') ||
        (r.category || '').toLowerCase().includes('huisvesting') ||
        (r.category || '').toLowerCase().includes('exploitatie') ||
        (r.category || '').toLowerCase().includes('verkoop') ||
        (r.category || '').toLowerCase().includes('auto') ||
        (r.category || '').toLowerCase().includes('kantoor') ||
        (r.category || '').toLowerCase().includes('assurantie') ||
        (r.category || '').toLowerCase().includes('accountant') ||
        (r.category || '').toLowerCase().includes('administratief') ||
        (r.category || '').toLowerCase().includes('andere') ||
        (r.category || '').toLowerCase().includes('afschrijving') ||
        (r.category || '').toLowerCase().includes('financieel') ||
        (r.category || '').toLowerCase().includes('overige bedrijfskosten');
    })
    .reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);

  // Opbrengst vorderingen
  const opbrengstVorderingen = rawData
    .filter(r => {
      const cat = (r.category || '').toLowerCase();
      return cat.includes('opbrengst') && cat.includes('vorderingen') && (r.amount || 0) > 0;
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  // Result = Revenue - COGS + Opbrengst_vorderingen
  const calculatedResult = calculatedRevenue - calculatedCosts + opbrengstVorderingen;
  const expectedCogs = expected.revenue - expected.result;

  return {
    month,
    expected: {
      revenue: expected.revenue,
      result: expected.result,
      cogs: expectedCogs
    },
    calculated: {
      revenue: calculatedRevenue,
      cogs: calculatedCosts,
      result: calculatedResult,
      opbrengstVorderingen
    },
    differences: {
      revenue: calculatedRevenue - expected.revenue,
      result: calculatedResult - expected.result,
      cogs: calculatedCosts - expectedCogs
    }
  };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          PNL CALCULATION COMPARISON TABLE                                                ║');
  console.log('║                          Van Kinsbergen 2025                                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  for (let month = 1; month <= 9; month++) {
    const result = await calculateMonth(month);
    if (result) results.push(result);
  }

  // Main comparison table
  console.log('┌───────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Month │ Exp Revenue │ Exp Result    │ Calc Revenue│ Calc Result │ Diff Revenue │ Diff Result  │');
  console.log('├───────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');
  
  results.forEach(r => {
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][r.month - 1];
    const expRev = r.expected.revenue.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const expRes = r.expected.result.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const calcRev = r.calculated.revenue.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const calcRes = r.calculated.result.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const diffRev = r.differences.revenue.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const diffRes = r.differences.result.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    
    const revColor = Math.abs(r.differences.revenue) > 1000 ? '⚠️ ' : '  ';
    const resColor = Math.abs(r.differences.result) > 1000 ? '⚠️ ' : '  ';
    
    console.log(`│ ${monthName.padEnd(5)} │ ${expRev} │ ${expRes} │ ${calcRev} │ ${calcRes} │ ${revColor}${diffRev} │ ${resColor}${diffRes} │`);
  });
  
  console.log('└───────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');

  // COGS comparison
  console.log('\n┌───────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Month │ Exp COGS     │ Calc COGS    │ Diff COGS    │ Opbrengst    │');
  console.log('├───────┼──────────────┼──────────────┼──────────────┼──────────────┤');
  
  results.forEach(r => {
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][r.month - 1];
    const expCogs = r.expected.cogs.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const calcCogs = r.calculated.cogs.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const diffCogs = r.differences.cogs.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    const opbrengst = r.calculated.opbrengstVorderingen.toLocaleString('nl-NL', {minimumFractionDigits: 0}).padStart(12);
    
    const cogsColor = Math.abs(r.differences.cogs) > 1000 ? '⚠️ ' : '  ';
    
    console.log(`│ ${monthName.padEnd(5)} │ ${expCogs} │ ${calcCogs} │ ${cogsColor}${diffCogs} │ ${opbrengst} │`);
  });
  
  console.log('└───────┴──────────────┴──────────────┴──────────────┴──────────────┘');

  // Summary
  const totalExpectedRevenue = results.reduce((sum, r) => sum + r.expected.revenue, 0);
  const totalCalculatedRevenue = results.reduce((sum, r) => sum + r.calculated.revenue, 0);
  const totalExpectedResult = results.reduce((sum, r) => sum + r.expected.result, 0);
  const totalCalculatedResult = results.reduce((sum, r) => sum + r.calculated.result, 0);
  const totalExpectedCogs = results.reduce((sum, r) => sum + r.expected.cogs, 0);
  const totalCalculatedCogs = results.reduce((sum, r) => sum + r.calculated.cogs, 0);

  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                    SUMMARY                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Total Expected Revenue:  ${totalExpectedRevenue.toLocaleString('nl-NL')} €`);
  console.log(`Total Calculated Revenue: ${totalCalculatedRevenue.toLocaleString('nl-NL')} €`);
  console.log(`Revenue Difference:      ${(totalCalculatedRevenue - totalExpectedRevenue).toLocaleString('nl-NL')} € (${((totalCalculatedRevenue / totalExpectedRevenue - 1) * 100).toFixed(1)}%)\n`);
  
  console.log(`Total Expected COGS:     ${totalExpectedCogs.toLocaleString('nl-NL')} €`);
  console.log(`Total Calculated COGS:   ${totalCalculatedCogs.toLocaleString('nl-NL')} €`);
  console.log(`COGS Difference:         ${(totalCalculatedCogs - totalExpectedCogs).toLocaleString('nl-NL')} € (${((totalCalculatedCogs / totalExpectedCogs - 1) * 100).toFixed(1)}%)\n`);
  
  console.log(`Total Expected Result:  ${totalExpectedResult.toLocaleString('nl-NL')} €`);
  console.log(`Total Calculated Result: ${totalCalculatedResult.toLocaleString('nl-NL')} €`);
  console.log(`Result Difference:      ${(totalCalculatedResult - totalExpectedResult).toLocaleString('nl-NL')} €\n`);
  
  console.log('⚠️  ISSUE: Data contains duplicate records causing over-counting. Need to deduplicate during aggregation.');
}

main().catch(console.error);



