/**
 * Debug revenue calculation to see why it's 2x too high
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;
const MONTH = 1;

async function debugRevenue() {
  console.log(`\n=== Debugging Revenue Calculation - ${YEAR}-${String(MONTH).padStart(2, '0')} ===\n`);

  // Fetch ALL raw data with pagination
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .eq('location_id', VAN_KINSBERGEN_ID)
      .eq('year', YEAR)
      .eq('month', MONTH)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (data) {
      allData = allData.concat(data);
    }

    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  console.log(`Total records: ${allData.length}\n`);

  // Check revenue categories
  const revenueCategories = {
    'Netto-omzet uit leveringen geproduceerde goederen': [],
    'Netto-omzet uit verkoop van handelsgoederen': [],
    'Netto-omzet groepen': []
  };

  allData.forEach(r => {
    if ((r.amount || 0) > 0) {
      const cat = r.category || '';
      if (cat === 'Netto-omzet uit leveringen geproduceerde goederen') {
        revenueCategories[cat].push(r);
      } else if (cat === 'Netto-omzet uit verkoop van handelsgoederen') {
        revenueCategories[cat].push(r);
      } else if (cat === 'Netto-omzet groepen') {
        revenueCategories[cat].push(r);
      }
    }
  });

  // Calculate totals
  const leveringen = revenueCategories['Netto-omzet uit leveringen geproduceerde goederen']
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const handelsgoederen = revenueCategories['Netto-omzet uit verkoop van handelsgoederen']
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const groepen = revenueCategories['Netto-omzet groepen']
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  console.log('Revenue breakdown:');
  console.log(`  Netto-omzet uit leveringen geproduceerde goederen: ${leveringen.toLocaleString('nl-NL')} € (${revenueCategories['Netto-omzet uit leveringen geproduceerde goederen'].length} records)`);
  console.log(`  Netto-omzet uit verkoop van handelsgoederen: ${handelsgoederen.toLocaleString('nl-NL')} € (${revenueCategories['Netto-omzet uit verkoop van handelsgoederen'].length} records)`);
  console.log(`  Netto-omzet groepen (parent): ${groepen.toLocaleString('nl-NL')} € (${revenueCategories['Netto-omzet groepen'].length} records)`);
  console.log(`  Total if all included: ${(leveringen + handelsgoederen + groepen).toLocaleString('nl-NL')} €`);
  console.log(`  Total if parent excluded: ${(leveringen + handelsgoederen).toLocaleString('nl-NL')} €`);
  console.log(`  Expected: 141,481 €\n`);

  // Check for duplicates
  const uniqueKeys = new Set();
  const duplicateKeys = new Set();
  
  revenueCategories['Netto-omzet uit leveringen geproduceerde goederen'].forEach(r => {
    const key = `${r.category}|${r.subcategory}|${r.gl_account}|${r.amount}`;
    if (uniqueKeys.has(key)) {
      duplicateKeys.add(key);
    } else {
      uniqueKeys.add(key);
    }
  });

  console.log(`Unique combinations: ${uniqueKeys.size}`);
  console.log(`Duplicate combinations: ${duplicateKeys.size}`);
  
  if (duplicateKeys.size > 0) {
    console.log('\nSample duplicates:');
    Array.from(duplicateKeys).slice(0, 5).forEach(key => {
      const [cat, subcat, gl, amount] = key.split('|');
      const count = revenueCategories['Netto-omzet uit leveringen geproduceerde goederen']
        .filter(r => `${r.category}|${r.subcategory}|${r.gl_account}|${r.amount}` === key).length;
      console.log(`  ${subcat}: ${amount} € (appears ${count} times)`);
    });
  }
}

debugRevenue().catch(console.error);



