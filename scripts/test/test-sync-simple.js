#!/usr/bin/env node

/**
 * Simple test to isolate the sync issue
 */

async function testSync() {
  console.log('🧪 Testing Eitje Sync API');
  console.log('==========================');
  
  try {
    const response = await fetch('http://localhost:3000/api/eitje/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'time_registration_shifts',
        startDate: '2024-10-24',
        endDate: '2024-10-25'
      }),
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response text (first 200 chars):`, text.substring(0, 200));
    
    if (text.startsWith('<!DOCTYPE')) {
      console.log('❌ Server returned HTML error page instead of JSON');
      console.log('This usually means there\'s a server-side error');
    } else {
      try {
        const json = JSON.parse(text);
        console.log('✅ Response is valid JSON:', json);
      } catch (e) {
        console.log('❌ Response is not valid JSON:', e.message);
      }
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

testSync();


