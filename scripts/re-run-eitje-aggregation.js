#!/usr/bin/env node

/**
 * Re-run Eitje Aggregation for All Data
 * 
 * This script triggers aggregation for all available data in batches.
 * Processes data month by month, respecting Supabase's 1000 record limit.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const BATCH_SIZE = 1000; // Supabase limit

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

async function getAvailableDates() {
  console.log('📅 Fetching available dates from raw data...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get distinct dates from revenue_days_raw
    const { data: revenueDates, error: revError } = await supabase
      .from('eitje_revenue_days_raw')
      .select('date')
      .order('date', { ascending: true });
    
    if (revError) throw revError;
    
    // Get distinct dates from time_registration_shifts_raw
    const { data: hoursDates, error: hoursError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('date')
      .order('date', { ascending: true });
    
    if (hoursError) throw hoursError;
    
    // Combine and deduplicate
    const allDates = new Set();
    (revenueDates || []).forEach(r => allDates.add(r.date));
    (hoursDates || []).forEach(h => allDates.add(h.date));
    
    const sortedDates = Array.from(allDates).sort();
    console.log(`✅ Found ${sortedDates.length} unique dates`);
    
    return sortedDates;
    
  } catch (error) {
    console.error('❌ Error fetching dates:', error.message);
    throw error;
  }
}

function groupDatesByMonth(dates) {
  const months = new Map();
  
  dates.forEach(date => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    
    if (!months.has(key)) {
      months.set(key, { year, month, dates: [] });
    }
    months.get(key).dates.push(date);
  });
  
  return Array.from(months.values());
}

async function aggregateMonth(endpoint, year, month) {
  const url = `${BASE_URL}/api/eitje/aggregate`;
  
  console.log(`  🔄 Processing ${endpoint} for ${year}-${month.toString().padStart(2, '0')}...`);
  
  try {
    const result = await fetchJson(url, {
      method: 'POST',
      body: JSON.stringify({ endpoint, year, month }),
    });
    
    if (result.success) {
      console.log(`  ✅ Success: ${result.message}`);
      return { success: true, endpoint, year, month };
    } else {
      console.log(`  ⚠️  Warning: ${result.error || 'Unknown error'}`);
      return { success: false, endpoint, year, month, error: result.error };
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, endpoint, year, month, error: error.message };
  }
}

async function processBatch(months, endpoints) {
  const results = {
    successful: [],
    failed: [],
    total: 0,
  };
  
  for (const monthData of months) {
    const { year, month, dates } = monthData;
    const dateCount = dates.length;
    
    console.log(`\n📅 Processing ${year}-${month.toString().padStart(2, '0')} (${dateCount} dates)`);
    
    // Check if we need to split into multiple batches
    if (dateCount > BATCH_SIZE) {
      console.log(`  ⚠️  Warning: ${dateCount} dates exceeds batch size of ${BATCH_SIZE}`);
      console.log(`  💡 Processing in chunks...`);
      
      // Process in chunks by date ranges
      for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const chunk = dates.slice(i, i + BATCH_SIZE);
        const startDate = chunk[0];
        const endDate = chunk[chunk.length - 1];
        console.log(`  📦 Chunk ${Math.floor(i / BATCH_SIZE) + 1}: ${startDate} to ${endDate}`);
        
        // Still process by month, but we're aware of the batch limit
        for (const endpoint of endpoints) {
          const result = await aggregateMonth(endpoint, year, month);
          results.total++;
          if (result.success) {
            results.successful.push(result);
          } else {
            results.failed.push(result);
          }
          
          // Small delay to avoid rate limiting
          await sleep(500);
        }
      }
    } else {
      // Process normally for this month
      for (const endpoint of endpoints) {
        const result = await aggregateMonth(endpoint, year, month);
        results.total++;
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }
        
        // Small delay to avoid rate limiting
        await sleep(500);
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting Eitje Aggregation Re-run');
  console.log('=====================================\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/eitje/status`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Error: Server is not running!');
    console.error('   Please start the Next.js dev server: npm run dev\n');
    process.exit(1);
  }
  
  try {
    // Get all available dates
    const dates = await getAvailableDates();
    
    if (dates.length === 0) {
      console.log('⚠️  No dates found in raw data. Nothing to aggregate.');
      return;
    }
    
    // Group dates by month
    const months = groupDatesByMonth(dates);
    console.log(`📊 Found ${months.length} months to process\n`);
    
    // Process both endpoints
    const endpoints = ['revenue_days', 'time_registration_shifts'];
    
    console.log('🔄 Starting aggregation process...\n');
    const startTime = Date.now();
    
    const results = await processBatch(months, endpoints);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n=====================================');
    console.log('📊 Aggregation Summary');
    console.log('=====================================');
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`📈 Total: ${results.total}`);
    console.log(`⏱️  Duration: ${duration}s`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed operations:');
      results.failed.forEach(f => {
        console.log(`   - ${f.endpoint} ${f.year}-${f.month.toString().padStart(2, '0')}: ${f.error}`);
      });
    }
    
    console.log('\n✅ Aggregation re-run complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, aggregateMonth, getAvailableDates };

