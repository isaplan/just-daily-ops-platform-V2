#!/usr/bin/env node

/**
 * Standalone Re-Aggregation Script
 * Re-aggregates P&L data directly using Supabase
 * 
 * Usage: node scripts/re-aggregate-standalone.mjs [locationId] [year]
 *   - No args: Re-aggregate all
 *   - locationId only: All years for that location
 *   - Both: Specific location/year
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS = {
  '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen',
  '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
  '550e8400-e29b-41d4-a716-446655440003': 'L\'Amour Toujours'
};

// This is a simplified version - we'll call the actual aggregation via HTTP
// or provide instructions to use the API

async function getUniqueCombinations(locationId = null, year = null) {
  let query = supabase
    .from('powerbi_pnl_data')
    .select('location_id, year, month')
    .order('location_id')
    .order('year', { ascending: false })
    .order('month');
  
  if (locationId) query = query.eq('location_id', locationId);
  if (year) query = query.eq('year', year);
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to get combinations: ${error.message}`);
  
  // Get unique combinations
  const unique = new Map();
  data.forEach(item => {
    const key = `${item.location_id}-${item.year}-${item.month}`;
    unique.set(key, item);
  });
  
  return Array.from(unique.values());
}

async function main() {
  const args = process.argv.slice(2);
  const targetLocationId = args[0] || null;
  const targetYear = args[1] ? parseInt(args[1]) : null;
  
  console.log('🚀 P&L Re-Aggregation');
  console.log('='.repeat(60));
  console.log('⚠️  This script requires the Next.js API endpoint.');
  console.log('   Please use one of these options:\n');
  console.log('   Option 1: Start Next.js server and run:');
  console.log('     npm run dev  # In one terminal');
  console.log('     node scripts/re-aggregate-pnl-direct.js  # In another\n');
  console.log('   Option 2: Use the API directly:');
  console.log('     POST http://localhost:3000/api/finance/pnl-aggregate');
  console.log('     Body: { "locationId": "...", "year": 2024, "aggregateAll": true }\n');
  console.log('   Option 3: Use curl:\n');
  
  const combinations = await getUniqueCombinations(targetLocationId, targetYear);
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
  
  console.log('📍 Available location/year combinations:\n');
  
  for (const [key, group] of groups) {
    const locationName = LOCATIONS[group.location_id] || 'Unknown';
    console.log(`   ${locationName} - ${group.year} (${group.months.length} months)`);
    console.log(`   curl -X POST http://localhost:3000/api/finance/pnl-aggregate \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"locationId":"${group.location_id}","year":${group.year},"aggregateAll":true}'\n`);
  }
  
  console.log(`\n✨ Found ${groups.size} location/year combinations to aggregate`);
}

main().catch(console.error);

