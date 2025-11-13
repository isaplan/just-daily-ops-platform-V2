#!/usr/bin/env node

/**
 * Test the fixed progress tracking logic
 */

async function testProgressFix() {
  console.log('🧪 Testing Fixed Progress Tracking');
  console.log('==================================');
  
  try {
    // Test October 2024 progress
    const response = await fetch('http://localhost:3000/api/eitje/progress?action=all&year=2024&month=10');
    
    if (!response.ok) {
      console.log(`❌ API error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text}`);
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Progress data retrieved successfully');
      console.log('\n📊 October 2024 Progress:');
      
      data.data.forEach(progress => {
        const percentage = progress.totalDays > 0 ? Math.round((progress.syncedDays / progress.totalDays) * 100) : 0;
        console.log(`  ${progress.endpoint}: ${progress.syncedDays}/${progress.totalDays} days (${percentage}%) - ${progress.isComplete ? 'Complete' : 'Incomplete'}`);
      });
      
      // Test summary
      const summaryResponse = await fetch('http://localhost:3000/api/eitje/progress?action=summary&year=2024&month=10');
      const summaryData = await summaryResponse.json();
      
      if (summaryData.success) {
        console.log('\n📈 October 2024 Summary:');
        console.log(`  Total endpoints: ${summaryData.data.totalEndpoints}`);
        console.log(`  Complete endpoints: ${summaryData.data.completeEndpoints}`);
        console.log(`  Partial endpoints: ${summaryData.data.partialEndpoints}`);
        console.log(`  Total days: ${summaryData.data.totalDays}`);
        console.log(`  Synced days: ${summaryData.data.syncedDays}`);
        console.log(`  Completion: ${summaryData.data.completionPercentage}%`);
      }
      
    } else {
      console.log(`❌ API returned error: ${data.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testProgressFix();


