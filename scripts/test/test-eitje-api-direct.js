#!/usr/bin/env node

/**
 * Test Eitje API calls directly to see what's happening
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testEitjeApi() {
  console.log('🧪 Testing Eitje API Direct Calls');
  console.log('==================================');
  
  try {
    // Get credentials from database
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing Supabase credentials');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .single();
    
    if (credError || !credentials) {
      console.log('❌ No Eitje credentials found:', credError?.message);
      return;
    }
    
    console.log('✅ Found Eitje credentials:', {
      id: credentials.id,
      base_url: credentials.base_url,
      has_api_key: !!credentials.api_key
    });
    
    const baseUrl = credentials.base_url;
    const apiKey = credentials.api_key;
    
    // Test master data endpoints (these work)
    console.log('\n📊 Testing Master Data Endpoints:');
    
    try {
      const envResponse = await axios.get(`${baseUrl}/environments`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ Environments: ${envResponse.data?.items?.length || envResponse.data?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Environments error: ${error.response?.status} - ${error.message}`);
    }
    
    try {
      const teamsResponse = await axios.get(`${baseUrl}/teams`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ Teams: ${teamsResponse.data?.items?.length || teamsResponse.data?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Teams error: ${error.response?.status} - ${error.message}`);
    }
    
    // Test data endpoints (these are failing)
    console.log('\n📊 Testing Data Endpoints:');
    
    try {
      const shiftsResponse = await axios({
        method: 'GET',
        url: `${baseUrl}/time_registration_shifts`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: { 
          filters: { 
            start_date: '2024-10-24', 
            end_date: '2024-10-25', 
            date_filter_type: 'resource_date' 
          } 
        },
        timeout: 10000
      });
      
      console.log(`✅ Time Registration Shifts: ${shiftsResponse.data?.items?.length || shiftsResponse.data?.length || 0} records`);
      if (shiftsResponse.data?.items?.length > 0) {
        console.log(`   Sample record:`, JSON.stringify(shiftsResponse.data.items[0], null, 2).substring(0, 200) + '...');
      }
    } catch (error) {
      console.log(`❌ Time Registration Shifts error: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   Response data:`, JSON.stringify(error.response.data, null, 2).substring(0, 200) + '...');
      }
    }
    
    try {
      const revenueResponse = await axios({
        method: 'GET',
        url: `${baseUrl}/revenue_days`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: { 
          filters: { 
            start_date: '2024-10-24', 
            end_date: '2024-10-25', 
            date_filter_type: 'resource_date' 
          } 
        },
        timeout: 10000
      });
      
      console.log(`✅ Revenue Days: ${revenueResponse.data?.items?.length || revenueResponse.data?.length || 0} records`);
      if (revenueResponse.data?.items?.length > 0) {
        console.log(`   Sample record:`, JSON.stringify(revenueResponse.data.items[0], null, 2).substring(0, 200) + '...');
      }
    } catch (error) {
      console.log(`❌ Revenue Days error: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   Response data:`, JSON.stringify(error.response.data, null, 2).substring(0, 200) + '...');
      }
    }
    
    // Test with different date range (maybe the issue is with the specific dates)
    console.log('\n📊 Testing with Different Date Range:');
    
    try {
      const shiftsResponse2 = await axios({
        method: 'GET',
        url: `${baseUrl}/time_registration_shifts`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: { 
          filters: { 
            start_date: '2024-01-01', 
            end_date: '2024-01-07', 
            date_filter_type: 'resource_date' 
          } 
        },
        timeout: 10000
      });
      
      console.log(`✅ Time Registration Shifts (Jan 2024): ${shiftsResponse2.data?.items?.length || shiftsResponse2.data?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Time Registration Shifts (Jan 2024) error: ${error.response?.status} - ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testEitjeApi();


