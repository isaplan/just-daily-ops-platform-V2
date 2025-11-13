#!/usr/bin/env node

/**
 * Check July progress via the API
 */

async function checkJulyProgress() {
  console.log('🔍 Checking July Progress via API');
  console.log('=================================');
  
  try {
    // Check July 2024 and July 2025
    const months = [
      { year: 2024, month: 7, name: 'July 2024' },
      { year: 2025, month: 7, name: 'July 2025' }
    ];
    
    for (const { year, month, name } of months) {
      console.log(`\n📅 ${name} Progress:`);
      
      try {
        // Get all progress for this month
        const response = await fetch(`http://localhost:3000/api/eitje/progress?action=all&year=${year}&month=${month}`);
        
        if (!response.ok) {
          console.log(`  ❌ API error: ${response.status}`);
          const text = await response.text();
          console.log(`  Response: ${text.substring(0, 200)}...`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`  ✅ Progress data retrieved successfully`);
          
          data.data.forEach(progress => {
            const percentage = progress.totalDays > 0 ? Math.round((progress.syncedDays / progress.totalDays) * 100) : 0;
            const status = progress.isComplete ? '✅ Complete' : '❌ Incomplete';
            console.log(`    ${progress.endpoint}: ${progress.syncedDays}/${progress.totalDays} days (${percentage}%) - ${status}`);
          });
          
          // Get summary
          const summaryResponse = await fetch(`http://localhost:3000/api/eitje/progress?action=summary&year=${year}&month=${month}`);
          const summaryData = await summaryResponse.json();
          
          if (summaryData.success) {
            console.log(`\n  📈 Summary:`);
            console.log(`    Total endpoints: ${summaryData.data.totalEndpoints}`);
            console.log(`    Complete endpoints: ${summaryData.data.completeEndpoints}`);
            console.log(`    Partial endpoints: ${summaryData.data.partialEndpoints}`);
            console.log(`    Total days: ${summaryData.data.totalDays}`);
            console.log(`    Synced days: ${summaryData.data.syncedDays}`);
            console.log(`    Completion: ${summaryData.data.completionPercentage}%`);
          }
          
        } else {
          console.log(`  ❌ API returned error: ${data.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking ${name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

checkJulyProgress();


