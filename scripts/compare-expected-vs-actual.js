#!/usr/bin/env node

/**
 * Compare Expected vs Actual Values
 * 
 * Extracts key values from aggregated data and compares with raw data calculations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS = {
  kinsbergen: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Van Kinsbergen' },
  barbea: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bar Bea' },
  lamour: { id: '550e8400-e29b-41d4-a716-446655440003', name: 'L\'Amour Toujours' }
};

async function analyzeData(locationName, locationId, year, month) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${locationName} - ${year}-${String(month).padStart(2, '0')}`);
  console.log('='.repeat(70));
  
  // Get raw data
  const { data: rawData } = await supabase
    .from('powerbi_pnl_data')
    .select('category, subcategory, amount')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month);
  
  // Get aggregated data
  const { data: aggregated } = await supabase
    .from('powerbi_pnl_aggregated')
    .select('*')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month)
    .single();
  
  if (!rawData || rawData.length === 0) {
    console.log('❌ No raw data found');
    return;
  }
  
  // Calculate expected from raw data
  const revenueLevering = rawData
    .filter(d => 
      (d.category === 'Netto-omzet uit leveringen geproduceerde goederen' || 
       (d.subcategory && (d.subcategory.includes('Omzet') && (d.subcategory.includes('snacks') || d.subcategory.includes('lunch') || d.subcategory.includes('diner') || d.subcategory.includes('menu') || d.subcategory.includes('keuken'))))) &&
      d.amount > 0
    )
    .reduce((sum, d) => sum + d.amount, 0);
    
  const revenueHandel = rawData
    .filter(d => 
      (d.category === 'Netto-omzet uit verkoop van handelsgoederen' ||
       (d.subcategory && d.subcategory.includes('Omzet') && (d.subcategory.includes('wijn') || d.subcategory.includes('gedestilleerd') || d.subcategory.includes('cocktail') || d.subcategory.includes('bier') || d.subcategory.includes('koffie') || d.subcategory.includes('frisdrank') || d.subcategory.includes('alcohol')))) &&
      d.amount > 0
    )
    .reduce((sum, d) => sum + d.amount, 0);
  
  const totalRevenue = revenueLevering + revenueHandel;
  
  // Calculate costs
  const allCosts = rawData.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0);
  const revenue = rawData.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
  const expectedResultaat = revenue + allCosts;
  
  console.log('\n📊 Expected (from raw data):');
  console.log(`  Revenue Levering: €${revenueLevering.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Revenue Handel: €${revenueHandel.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Total Revenue: €${totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  All Revenue (positive): €${revenue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  All Costs (negative): €${allCosts.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Expected Resultaat: €${expectedResultaat.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  
  if (aggregated) {
    console.log('\n📈 Actual (from aggregated):');
    console.log(`  Revenue Levering: €${(aggregated.netto_omzet_uit_levering_geproduceerd || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Revenue Handel: €${(aggregated.netto_omzet_verkoop_handelsgoederen || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Revenue Total: €${(aggregated.revenue_total || aggregated.total_revenue || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Resultaat: €${(aggregated.resultaat || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    
    console.log('\n🔍 Differences:');
    const revLevDiff = Math.abs(revenueLevering - (aggregated.netto_omzet_uit_levering_geproduceerd || 0));
    const revHandDiff = Math.abs(revenueHandel - (aggregated.netto_omzet_verkoop_handelsgoederen || 0));
    const revTotalDiff = Math.abs(totalRevenue - (aggregated.revenue_total || aggregated.total_revenue || 0));
    const resDiff = Math.abs(expectedResultaat - (aggregated.resultaat || 0));
    
    console.log(`  Revenue Levering: €${revLevDiff.toFixed(2)} (${(revLevDiff / Math.abs(revenueLevering || 1) * 100).toFixed(2)}%)`);
    console.log(`  Revenue Handel: €${revHandDiff.toFixed(2)} (${(revHandDiff / Math.abs(revenueHandel || 1) * 100).toFixed(2)}%)`);
    console.log(`  Revenue Total: €${revTotalDiff.toFixed(2)} (${(revTotalDiff / Math.abs(totalRevenue || 1) * 100).toFixed(2)}%)`);
    console.log(`  Resultaat: €${resDiff.toFixed(2)} (${(resDiff / Math.abs(expectedResultaat || 1) * 100).toFixed(2)}%)`);
  } else {
    console.log('\n⚠️  No aggregated data found');
  }
  
  // Show categories with positive amounts (revenue)
  console.log('\n💰 Revenue Categories (positive amounts):');
  const revenueCategories = new Map();
  rawData.filter(d => d.amount > 0).forEach(d => {
    const key = d.category || 'Unknown';
    revenueCategories.set(key, (revenueCategories.get(key) || 0) + d.amount);
  });
  
  Array.from(revenueCategories.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, total]) => {
      console.log(`  ${cat}: €${total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    });
}

async function main() {
  const testCases = [
    { loc: 'kinsbergen', year: 2024, month: 1 },
    { loc: 'kinsbergen', year: 2025, month: 1 },
    { loc: 'lamour', year: 2024, month: 1 },
    { loc: 'lamour', year: 2025, month: 1 }
  ];
  
  for (const test of testCases) {
    const location = LOCATIONS[test.loc];
    await analyzeData(location.name, location.id, test.year, test.month);
  }
}

main().catch(console.error);

