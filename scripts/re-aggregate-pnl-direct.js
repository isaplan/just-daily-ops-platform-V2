#!/usr/bin/env node

/**
 * Direct Re-Aggregation Script
 * Uses Supabase directly to re-aggregate all P&L data
 */

require('dotenv').config({ path: '.env.local' });

// Since we can't import TypeScript directly, we'll make HTTP requests to the API
// But first, let's check if the Next.js server is running

async function checkServer() {
  try {
    // Check if we can reach the root or any API endpoint
    const response = await fetch('http://localhost:3000', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.status < 500; // Any response means server is running
  } catch {
    return false;
  }
}

async function reAggregateViaAPI(locationId, year) {
  try {
    const response = await fetch('http://localhost:3000/api/finance/pnl-aggregate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId,
        year,
        aggregateAll: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to aggregate ${locationId} ${year}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const locations = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Van Kinsbergen' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bar Bea' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'L\'Amour Toujours' }
  ];
  
  const years = [2023, 2024, 2025];
  
  console.log('🚀 Starting P&L Re-Aggregation');
  console.log('⚠️  Make sure Next.js dev server is running on http://localhost:3000\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Next.js server is not running!');
    console.error('   Please start it with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  let totalProcessed = 0;
  let totalSuccess = 0;
  
  for (const location of locations) {
    for (const year of years) {
      console.log(`🔄 ${location.name} - ${year}`);
      const result = await reAggregateViaAPI(location.id, year);
      
      if (result.success) {
        const count = result.data?.length || 0;
        console.log(`   ✅ Aggregated ${count} months\n`);
        totalSuccess += count;
      } else {
        console.log(`   ❌ Error: ${result.error}\n`);
      }
      
      totalProcessed++;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('✨ Re-aggregation complete!');
  console.log(`   Processed: ${totalProcessed} location/year combinations`);
  console.log(`   Successfully aggregated: ${totalSuccess} months`);
}

main().catch(console.error);

