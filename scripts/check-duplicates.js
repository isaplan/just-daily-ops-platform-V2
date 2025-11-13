/**
 * Check for duplicate records in raw data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;
const MONTH = 1;

async function checkDuplicates() {
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', YEAR)
    .eq('month', MONTH);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n=== CHECKING DUPLICATES - January 2025 ===\n`);
  console.log(`Total records: ${rawData.length}\n`);

  // Group by category + subcategory + gl_account + amount
  const grouped = {};
  rawData.forEach(r => {
    const key = `${r.category}|${r.subcategory}|${r.gl_account}|${r.amount}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(r);
  });

  // Find duplicates
  const duplicates = Object.entries(grouped).filter(([key, records]) => records.length > 1);

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} sets of duplicate records:\n`);
    
    duplicates.slice(0, 10).forEach(([key, records]) => {
      const [cat, subcat, gl, amount] = key.split('|');
      console.log(`Duplicate (${records.length} times):`);
      console.log(`  Category: ${cat}`);
      console.log(`  Subcategory: ${subcat}`);
      console.log(`  GL Account: ${gl}`);
      console.log(`  Amount: ${amount} €`);
      console.log(`  Total if summed: ${(parseFloat(amount) * records.length).toLocaleString('nl-NL')} €\n`);
    });
  } else {
    console.log('No exact duplicates found (same category + subcategory + GL + amount)\n');
  }

  // Check revenue categories
  const revenueCategories = ['Netto-omzet uit leveringen geproduceerde goederen', 
                             'Netto-omzet uit verkoop van handelsgoederen',
                             'Netto-omzet groepen'];
  
  console.log('=== REVENUE BY CATEGORY (checking for issues) ===\n');
  
  revenueCategories.forEach(cat => {
    const records = rawData.filter(r => r.category === cat && (r.amount || 0) > 0);
    const total = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const uniqueSubcats = new Set(records.map(r => `${r.subcategory}|${r.gl_account}`));
    
    console.log(`${cat}:`);
    console.log(`  Records: ${records.length}`);
    console.log(`  Total: ${total.toLocaleString('nl-NL')} €`);
    console.log(`  Unique subcategory+GL combinations: ${uniqueSubcats.size}`);
    
    // Check for same subcategory with multiple amounts
    const bySubcat = {};
    records.forEach(r => {
      const subcat = r.subcategory || 'N/A';
      if (!bySubcat[subcat]) {
        bySubcat[subcat] = [];
      }
      bySubcat[subcat].push(r.amount);
    });
    
    const multiAmountSubcats = Object.entries(bySubcat).filter(([subcat, amounts]) => amounts.length > 1);
    if (multiAmountSubcats.length > 0) {
      console.log(`  Subcategories with multiple records:`);
      multiAmountSubcats.forEach(([subcat, amounts]) => {
        console.log(`    - ${subcat}: ${amounts.length} records, amounts: ${amounts.map(a => a.toLocaleString('nl-NL')).join(', ')} €`);
      });
    }
    console.log('');
  });

  // Expected revenue is 141,481 €
  // Let's see what we get if we exclude "Netto-omzet groepen"
  const detailedRevenue = rawData
    .filter(r => 
      (r.category === 'Netto-omzet uit leveringen geproduceerde goederen' || 
       r.category === 'Netto-omzet uit verkoop van handelsgoederen') &&
      (r.amount || 0) > 0
    )
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  console.log(`\n=== REVENUE CALCULATION ===`);
  console.log(`Expected: 141,481 €`);
  console.log(`Detailed categories only (excluding "Netto-omzet groepen"): ${detailedRevenue.toLocaleString('nl-NL')} €`);
  console.log(`Difference: ${(detailedRevenue - 141481).toLocaleString('nl-NL')} €`);
}

checkDuplicates().catch(console.error);



