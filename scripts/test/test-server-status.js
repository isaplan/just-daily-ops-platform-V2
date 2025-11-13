#!/usr/bin/env node

/**
 * Test server status and basic endpoints
 */

async function testServer() {
  console.log('🔍 Testing Server Status');
  console.log('========================');
  
  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3007];
  
  for (const port of ports) {
    try {
      console.log(`\n📡 Testing port ${port}...`);
      
      const response = await fetch(`http://localhost:${port}/api/eitje/status`);
      
      if (response.ok) {
        console.log(`✅ Port ${port} is responding`);
        const text = await response.text();
        console.log(`   Response length: ${text.length} characters`);
        
        if (text.startsWith('{')) {
          console.log(`   ✅ Valid JSON response`);
        } else {
          console.log(`   ⚠️  Non-JSON response: ${text.substring(0, 100)}...`);
        }
        
        // Test sync endpoint
        try {
          const syncResponse = await fetch(`http://localhost:${port}/api/eitje/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'time_registration_shifts',
              startDate: '2024-10-24',
              endDate: '2024-10-25'
            })
          });
          
          console.log(`   Sync endpoint status: ${syncResponse.status}`);
          const syncText = await syncResponse.text();
          console.log(`   Sync response length: ${syncText.length} characters`);
          
          if (syncText.startsWith('<!DOCTYPE')) {
            console.log(`   ❌ Sync returns HTML error page`);
          } else if (syncText.startsWith('{')) {
            console.log(`   ✅ Sync returns JSON`);
          } else {
            console.log(`   ⚠️  Sync returns: ${syncText.substring(0, 100)}...`);
          }
          
        } catch (syncError) {
          console.log(`   ❌ Sync test failed: ${syncError.message}`);
        }
        
        break; // Found working port, stop testing others
        
      } else {
        console.log(`❌ Port ${port} not responding (${response.status})`);
      }
      
    } catch (error) {
      console.log(`❌ Port ${port} error: ${error.message}`);
    }
  }
}

testServer();


