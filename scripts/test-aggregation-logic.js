#!/usr/bin/env node

/**
 * Test Aggregation Logic
 * 
 * Tests the new aggregation logic without writing to database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS = {
  lamour: '550e8400-e29b-41d4-a716-446655440003'
};

// Revenue categories (simplified from aggregation-service.ts)
const REVENUE_CATEGORIES = {
  netto_omzet_uit_levering: [
    'Netto-omzet uit leveringen geproduceerde goederen',
    'Omzet snacks (btw laag)',
    'Omzet lunch (btw laag)',
    'Omzet diner (btw laag)',
    'Omzet menu\'s (btw laag)',
    'Omzet keuken overig (btw laag)'
  ],
  netto_omzet_verkoop_handelsgoederen: [
    'Netto-omzet uit verkoop van handelsgoederen',
    'Omzet wijnen (btw hoog)',
    'Omzet gedestilleerd (btw hoog)',
    'Omzet cocktails (btw hoog)',
    'Omzet cider (btw hoog)',
    'Omzet hoog overig (btw hoog)',
    'Omzet speciaalbier fles (btw hoog)',
    'Omzet speciaalbier tap (btw hoog)',
    'Omzet tap pilsner (btw hoog)',
    'Omzet koffie / thee (btw laag)',
    'Omzet frisdranken (btw laag)',
    'Omzet alcohol vrij (btw laag)',
    'Omzet laag overig (btw laag)',
    'Omzet non food (btw hoog)'
  ]
};

function sumBySubcategories(data, subcategories) {
  return data
    .filter(d => {
      // Match subcategory if it exists
      if (d.subcategory && subcategories.includes(d.subcategory)) {
        return true;
      }
      // Match category if it exists (for top-level category amounts)
      if (d.category && subcategories.includes(d.category)) {
        return true;
      }
      return false;
    })
    .reduce((sum, d) => sum + d.amount, 0);
}

async function testAggregationLogic() {
  const locationId = LOCATIONS.lamour;
  const year = 2024;
  const month = 1;
  
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('category, subcategory, amount')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nTesting aggregation logic for Lamour ${year}-${month}`);
  console.log(`Total records: ${rawData.length}\n`);
  
  // Test revenue calculation
  const netto_omzet_uit_levering = sumBySubcategories(
    rawData,
    REVENUE_CATEGORIES.netto_omzet_uit_levering
  );
  
  const netto_omzet_verkoop_handelsgoederen = sumBySubcategories(
    rawData,
    REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen
  );
  
  const total_revenue = netto_omzet_uit_levering + netto_omzet_verkoop_handelsgoederen;
  
  console.log('Revenue Calculation:');
  console.log(`  Levering (calculated): €${netto_omzet_uit_levering.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Handel (calculated): €${netto_omzet_verkoop_handelsgoederen.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Total (calculated): €${total_revenue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  
  // Compare with raw data by category
  console.log('\nRaw Data by Category (Revenue):');
  const revenueCategories = rawData.filter(d => d.amount > 0);
  const categoryTotals = {};
  revenueCategories.forEach(d => {
    const key = d.category || 'Unknown';
    categoryTotals[key] = (categoryTotals[key] || 0) + d.amount;
  });
  
  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, total]) => {
      console.log(`  ${cat}: €${total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    });
  
  // Check what's being matched
  console.log('\nMatching Details:');
  const matchedLevering = rawData.filter(d => {
    if (d.subcategory && REVENUE_CATEGORIES.netto_omzet_uit_levering.includes(d.subcategory)) return true;
    if (d.category && REVENUE_CATEGORIES.netto_omzet_uit_levering.includes(d.category)) return true;
    return false;
  });
  
  console.log(`  Levering matches: ${matchedLevering.length} records`);
  matchedLevering.forEach(d => {
    console.log(`    - Category: ${d.category}, Subcategory: ${d.subcategory || '(none)'}, Amount: €${d.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  });
  
  const matchedHandel = rawData.filter(d => {
    if (d.subcategory && REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen.includes(d.subcategory)) return true;
    if (d.category && REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen.includes(d.category)) return true;
    return false;
  });
  
  console.log(`  Handel matches: ${matchedHandel.length} records`);
  matchedHandel.forEach(d => {
    console.log(`    - Category: ${d.category}, Subcategory: ${d.subcategory || '(none)'}, Amount: €${d.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  });
}

testAggregationLogic().catch(console.error);

