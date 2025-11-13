#!/usr/bin/env node
/**
 * Simple Re-Aggregation Script
 * Uses API endpoint to trigger re-aggregation
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS = {
  '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen',
  '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
  '550e8400-e29b-41d4-a716-446655440003': 'L\'Amour Toujours'
};

async function getUniqueCombinations() {
  const { data } = await supabase
    .from('powerbi_pnl_data')
    .select('location_id, year, month')
    .order('location_id')
    .order('year', { ascending: false })
    .order('month');
  
  const unique = new Map();
  data.forEach(d => {
    const key = `${d.location_id}-${d.year}-${d.month}`;
    unique.set(key, d);
  });
  
  return Array.from(unique.values());
}

async function reAggregate() {
  console.log('🔄 Starting re-aggregation...\n');
  
  const combinations = await getUniqueCombinations();
  console.log(`Found ${combinations.length} location/year/month combinations\n`);
  
  // Group by location and year for batch processing
  const groups = new Map();
  combinations.forEach(combo => {
    const key = `${combo.location_id}-${combo.year}`;
    if (!groups.has(key)) {
      groups.set(key, { location_id: combo.location_id, year: combo.year, months: [] });
    }
    if (!groups.get(key).months.includes(combo.month)) {
      groups.get(key).months.push(combo.month);
    }
  });
  
  console.log(`Processing ${groups.size} location/year groups...\n`);
  
  for (const [key, group] of groups) {
    const locationName = LOCATIONS[group.location_id] || 'Unknown';
    console.log(`📍 ${locationName} - ${group.year} (${group.months.length} months)`);
    
    // Use the aggregation API endpoint
    const response = await fetch('http://localhost:3000/api/finance/pnl-aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: group.location_id,
        year: group.year,
        aggregateAll: true
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`  ✅ Aggregated ${result.data?.length || 0} months\n`);
    } else {
      console.log(`  ❌ Error: ${result.error}\n`);
    }
  }
  
  console.log('✨ Re-aggregation complete!');
}

reAggregate().catch(console.error);
