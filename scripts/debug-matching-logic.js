/**
 * Debug why revenue matching is double-counting
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;
const MONTH = 1;

async function debugMatching() {
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

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  const REVENUE_CATEGORIES = {
    netto_omzet_uit_levering: [
      'Netto-omzet uit leveringen geproduceerde goederen',
      'Omzet snacks (btw laag)',
      'Verkopen snacks (btw laag)',
      'Omzet lunch (btw laag)',
      'Omzet diner (btw laag)',
      'Omzet menu\'s (btw laag)',
      'Omzet keuken overig (btw laag)'
    ]
  };

  console.log('\n=== Debugging Matching Logic ===\n');

  // Filter out parent category
  const filtered = allData.filter(d => d.category !== 'Netto-omzet groepen' && (d.amount || 0) > 0);

  console.log(`Records after filtering parent: ${filtered.length}\n`);

  // Check how many match by category vs subcategory
  let matchedByCategory = 0;
  let matchedBySubcategory = 0;
  let matchedByBoth = 0;
  let totalMatched = 0;

  const matchedRecords = [];

  filtered.forEach(d => {
    const categoryMatch = d.category && REVENUE_CATEGORIES.netto_omzet_uit_levering.includes(d.category);
    const subcategoryMatch = d.subcategory && REVENUE_CATEGORIES.netto_omzet_uit_levering.includes(d.subcategory);
    
    if (categoryMatch || subcategoryMatch) {
      matchedRecords.push({
        category: d.category,
        subcategory: d.subcategory,
        gl_account: d.gl_account,
        amount: d.amount,
        matchedBy: categoryMatch && subcategoryMatch ? 'both' : (categoryMatch ? 'category' : 'subcategory')
      });
      
      if (categoryMatch && subcategoryMatch) matchedByBoth++;
      else if (categoryMatch) matchedByCategory++;
      else if (subcategoryMatch) matchedBySubcategory++;
      
      totalMatched += d.amount;
    }
  });

  console.log(`Matched records: ${matchedRecords.length}`);
  console.log(`  By category only: ${matchedByCategory}`);
  console.log(`  By subcategory only: ${matchedBySubcategory}`);
  console.log(`  By both: ${matchedByBoth}`);
  console.log(`  Total amount: ${totalMatched.toLocaleString('nl-NL')} €\n`);

  // Show sample matched records
  console.log('Sample matched records (first 10):');
  matchedRecords.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i + 1}. Category: "${r.category}", Subcategory: "${r.subcategory}", Amount: ${r.amount.toLocaleString('nl-NL')} € (matched by: ${r.matchedBy})`);
  });

  // Check for exact duplicates
  const uniqueKeys = new Set();
  const duplicates = [];
  
  matchedRecords.forEach(r => {
    const key = `${r.category}|${r.subcategory}|${r.gl_account}|${r.amount}`;
    if (uniqueKeys.has(key)) {
      duplicates.push(r);
    } else {
      uniqueKeys.add(key);
    }
  });

  console.log(`\nUnique combinations: ${uniqueKeys.size}`);
  console.log(`Exact duplicates: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\nDuplicate records:');
    duplicates.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. Category: "${r.category}", Subcategory: "${r.subcategory}", Amount: ${r.amount.toLocaleString('nl-NL')} €`);
    });
  }

  // Calculate with deduplication
  let deduplicatedTotal = 0;
  const seen = new Set();
  
  matchedRecords.forEach(r => {
    const key = `${r.category}|${r.subcategory}|${r.gl_account}|${r.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicatedTotal += r.amount;
    }
  });

  console.log(`\nAfter deduplication: ${deduplicatedTotal.toLocaleString('nl-NL')} €`);
  console.log(`Expected: 141,481 €`);
  console.log(`Ratio: ${(deduplicatedTotal / 141481).toFixed(2)}x`);
}

debugMatching().catch(console.error);



