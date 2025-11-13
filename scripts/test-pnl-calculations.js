#!/usr/bin/env node

/**
 * Test P&L Calculations
 * 
 * Extracts sample data and validates calculations
 * Usage: node scripts/test-pnl-calculations.js [location] [year] [month]
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

// Location UUIDs
const LOCATIONS = {
  kinsbergen: '550e8400-e29b-41d4-a716-446655440001',
  barbea: '550e8400-e29b-41d4-a716-446655440002',
  lamour: '550e8400-e29b-41d4-a716-446655440003'
};

async function extractRawData(locationId, year, month) {
  const { data, error } = await supabase
    .from('powerbi_pnl_data')
    .select('category, subcategory, gl_account, amount')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month)
    .order('category')
    .order('subcategory');
    
  if (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
  
  return data || [];
}

async function getAggregatedData(locationId, year, month) {
  const { data, error } = await supabase
    .from('powerbi_pnl_aggregated')
    .select('*')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch aggregated: ${error.message}`);
  }
  
  return data;
}

function calculateFromRaw(rawData) {
  // Revenue (positive amounts)
  const revenue = rawData
    .filter(d => d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0);
  
  // Costs (negative amounts)
  const costs = rawData
    .filter(d => d.amount < 0)
    .reduce((sum, d) => sum + d.amount, 0);
  
  // Calculate by categories
  const revenueLevering = rawData
    .filter(d => d.category?.includes('leveringen') && d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0);
    
  const revenueHandel = rawData
    .filter(d => d.category?.includes('handelsgoederen') && d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0);
    
  const costInkoop = rawData
    .filter(d => d.category?.includes('Inkoop') || d.category?.includes('Kostprijs'))
    .reduce((sum, d) => sum + d.amount, 0);
    
  const laborTotal = rawData
    .filter(d => 
      d.category?.includes('Lonen') || 
      d.category?.includes('Arbeid') || 
      d.category?.includes('Labor') ||
      d.category?.includes('Salaris')
    )
    .reduce((sum, d) => sum + d.amount, 0);
    
  const otherCosts = costs - costInkoop - laborTotal;
  
  const resultaat = revenue + costs; // Costs are negative
  
  return {
    revenue,
    revenueLevering,
    revenueHandel,
    costInkoop,
    laborTotal,
    otherCosts,
    costs,
    resultaat
  };
}

async function testCalculation(locationName, locationId, year, month) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${locationName} - ${year}-${String(month).padStart(2, '0')}`);
  console.log('='.repeat(60));
  
  const rawData = await extractRawData(locationId, year, month);
  const aggregated = await getAggregatedData(locationId, year, month);
  
  if (!rawData || rawData.length === 0) {
    console.log('❌ No raw data found');
    return;
  }
  
  const calculated = calculateFromRaw(rawData);
  
  console.log('\n📊 Raw Data Summary:');
  console.log(`  Records: ${rawData.length}`);
  console.log(`  Revenue (calculated): €${calculated.revenue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Revenue Levering: €${calculated.revenueLevering.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Revenue Handel: €${calculated.revenueHandel.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Cost Inkoop: €${calculated.costInkoop.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Labor Total: €${calculated.laborTotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Other Costs: €${calculated.otherCosts.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  console.log(`  Resultaat (calculated): €${calculated.resultaat.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
  
  if (aggregated) {
    console.log('\n📈 Aggregated Data Summary:');
    console.log(`  Revenue Total: €${(aggregated.revenue_total || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Revenue Levering: €${(aggregated.netto_omzet_uit_levering_geproduceerd || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Revenue Handel: €${(aggregated.netto_omzet_verkoop_handelsgoederen || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Cost Inkoop: €${(aggregated.inkoopwaarde_handelsgoederen || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Labor Total: €${(aggregated.labor_total || aggregated.lonen_en_salarissen || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Other Costs: €${(aggregated.other_costs_total || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    console.log(`  Resultaat: €${(aggregated.resultaat || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`);
    
    // Compare
    const revenueDiff = Math.abs(calculated.revenue - (aggregated.revenue_total || 0));
    const resultaatDiff = Math.abs(calculated.resultaat - (aggregated.resultaat || 0));
    const revenuePercent = calculated.revenue !== 0 ? (revenueDiff / Math.abs(calculated.revenue)) * 100 : 0;
    const resultaatPercent = calculated.resultaat !== 0 ? (resultaatDiff / Math.abs(calculated.resultaat)) * 100 : 0;
    
    console.log('\n🔍 Comparison:');
    console.log(`  Revenue Difference: €${revenueDiff.toFixed(2)} (${revenuePercent.toFixed(2)}%)`);
    console.log(`  Resultaat Difference: €${resultaatDiff.toFixed(2)} (${resultaatPercent.toFixed(2)}%)`);
    
    if (resultaatPercent > 1) {
      console.log('  ❌ Resultaat exceeds 1% margin!');
    } else {
      console.log('  ✅ Resultaat within 1% margin');
    }
  } else {
    console.log('\n⚠️  No aggregated data found - needs aggregation');
  }
  
  // Category breakdown
  const categories = [...new Set(rawData.map(d => d.category))].sort();
  console.log('\n📋 Categories found:');
  categories.forEach(cat => {
    const categoryData = rawData.filter(d => d.category === cat);
    const total = categoryData.reduce((sum, d) => sum + d.amount, 0);
    console.log(`  ${cat}: €${total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} (${categoryData.length} records)`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Test all locations with sample months
    console.log('🧪 Running full test suite...\n');
    
    for (const [name, id] of Object.entries(LOCATIONS)) {
      try {
        // Try to find months with data
        const { data } = await supabase
          .from('powerbi_pnl_data')
          .select('year, month')
          .eq('location_id', id)
          .limit(12);
          
        if (data && data.length > 0) {
          const testMonth = data[0];
          await testCalculation(name, id, testMonth.year, testMonth.month);
        }
      } catch (error) {
        console.error(`Error testing ${name}:`, error.message);
      }
    }
  } else if (args.length === 3) {
    const [locationName, year, month] = args;
    const locationId = LOCATIONS[locationName.toLowerCase()];
    
    if (!locationId) {
      console.error(`Unknown location: ${locationName}`);
      console.error('Available:', Object.keys(LOCATIONS).join(', '));
      process.exit(1);
    }
    
    await testCalculation(locationName, locationId, parseInt(year), parseInt(month));
  } else {
    console.error('Usage: node scripts/test-pnl-calculations.js [location] [year] [month]');
    console.error('Or run without args to test all locations');
    process.exit(1);
  }
}

main().catch(console.error);

