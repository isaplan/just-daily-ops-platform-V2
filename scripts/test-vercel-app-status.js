#!/usr/bin/env node

/**
 * Test if Vercel app is running and accessible
 * This checks if the app will be ready for the midnight cron
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
                 'https://just-daily-ops-platform.vercel.app';

async function testAppStatus() {
  console.log('\n🔍 Testing Vercel App Status...\n');
  console.log(`🌐 Testing URL: ${BASE_URL}\n`);

  // Test 1: Homepage
  console.log('1️⃣ Testing Homepage...');
  try {
    const homeResponse = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-App-Test/1.0'
      }
    });

    if (homeResponse.ok) {
      console.log(`   ✅ Homepage accessible (${homeResponse.status})`);
    } else {
      console.log(`   ⚠️  Homepage returned ${homeResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Homepage failed: ${error.message}`);
    console.log(`   💡 App might be sleeping or not deployed`);
  }

  // Test 2: Health/API endpoint (if exists)
  console.log('\n2️⃣ Testing API Endpoint...');
  try {
    const apiUrl = `${BASE_URL}/api/eitje/sync`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'}`
      },
      body: JSON.stringify({
        endpoint: 'time_registration_shifts',
        startDate: '2025-11-01',
        endDate: '2025-11-01'
      })
    });

    if (apiResponse.ok) {
      console.log(`   ✅ API endpoint accessible (${apiResponse.status})`);
      const data = await apiResponse.json().catch(() => null);
      if (data) {
        console.log(`   📊 Response: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } else {
      const errorText = await apiResponse.text().catch(() => 'Unknown error');
      console.log(`   ⚠️  API endpoint returned ${apiResponse.status}`);
      console.log(`   📝 Error: ${errorText.substring(0, 200)}`);
      
      if (apiResponse.status === 502) {
        console.log(`   💡 502 = App might be sleeping (cold start)`);
      }
    }
  } catch (error) {
    console.log(`   ❌ API endpoint failed: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.log(`   💡 App might not be deployed or URL is incorrect`);
    } else if (error.message.includes('timeout')) {
      console.log(`   💡 Connection timeout - app might be sleeping or overloaded`);
    }
  }

  // Summary
  console.log('\n📋 Summary:');
  console.log('─'.repeat(50));
  console.log(`📍 Tested URL: ${BASE_URL}`);
  console.log(`⏰ Current time: ${new Date().toISOString()}`);
  console.log('\n💡 Next Steps:');
  console.log('   1. If tests failed: Deploy app to Vercel');
  console.log('   2. If 502 errors: App might sleep - warm it up before midnight');
  console.log('   3. Check Vercel Dashboard for deployment status');
  console.log('   4. Test edge function manually before midnight\n');
}

// Run the test
testAppStatus().catch(error => {
  console.error('\n❌ Test script error:', error);
  process.exit(1);
});


