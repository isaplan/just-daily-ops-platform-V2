/**
 * TEST EITJE CREDENTIALS
 * 
 * Simple test to verify Eitje API credentials work
 * Tests the environments endpoint (no date filtering required)
 */

const fetch = require('node-fetch');

async function testEitjeCredentials() {
  console.log('🧪 Testing Eitje API Credentials...\n');
  
  // Your credentials from the database
  const credentials = {
    baseUrl: 'https://open-api.eitje.app/open_api',
    partner_username: 'haagse_nieuwe',
    partner_password: 'HHRrrS2LERp6',
    api_username: 'srjSXG',
    api_password: 'HRY2oKmzS6ASja4jC6fRh15eFKQFCH5WhLhI8P4nCZQQ1cT4GxISDlPAfdZ9'
  };
  
  try {
    console.log('📡 Making request to Eitje API...');
    console.log('🔗 Endpoint:', `${credentials.baseUrl}/environments`);
    console.log('🔑 Using credentials:', {
      partner_username: credentials.partner_username,
      api_username: credentials.api_username,
      // Hide passwords
      partner_password: '***',
      api_password: '***'
    });
    
    const response = await fetch(`${credentials.baseUrl}/environments`, {
      method: 'GET',
      headers: {
        'Partner-Username': credentials.partner_username,
        'Partner-Password': credentials.partner_password,
        'Api-Username': credentials.api_username,
        'Api-Password': credentials.api_password,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'JustDailyOps-EitjeIntegration/1.0.0'
      },
      timeout: 30000
    });
    
    console.log('\n📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! Credentials are working');
      console.log('📦 Data received:', Array.isArray(data) ? `${data.length} records` : 'Non-array response');
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('🏢 First environment:', data[0]);
      }
      
      return {
        success: true,
        status: response.status,
        dataCount: Array.isArray(data) ? data.length : 0,
        message: 'Credentials test successful'
      };
      
    } else {
      const errorText = await response.text();
      console.log('\n❌ FAILED! API returned error');
      console.log('📄 Error response:', errorText);
      
      return {
        success: false,
        status: response.status,
        error: errorText,
        message: 'Credentials test failed'
      };
    }
    
  } catch (error) {
    console.log('\n💥 ERROR! Request failed');
    console.log('🔍 Error details:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Network or connection error'
    };
  }
}

// Run the test
testEitjeCredentials()
  .then(result => {
    console.log('\n🎯 Test Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });

