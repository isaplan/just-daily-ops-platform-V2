const { createClient } = require('@supabase/supabase-js');

async function testRevenueAggregation() {
  const supabaseUrl = 'https://vrucbxdudchboznunndz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🧪 Testing revenue aggregation...\n');
  
  try {
    // Get some raw revenue data
    const { data: rawRecords, error: fetchError } = await supabase
      .from('eitje_revenue_days_raw')
      .select('*')
      .gte('date', '2024-01-01')
      .lte('date', '2024-12-31')
      .limit(10);
    
    if (fetchError) {
      console.log('❌ Error fetching raw data:', fetchError.message);
      return;
    }
    
    console.log(`📊 Found ${rawRecords?.length || 0} raw records\n`);
    
    if (rawRecords && rawRecords.length > 0) {
      // Group records by (date, environment_id)
      const groupedRecords = new Map();
      
      rawRecords.forEach(record => {
        // Extract environment_id from raw_data.environment.id
        const environmentId = record.raw_data?.environment?.id || record.environment_id || 0;
        const key = `${record.date}-${environmentId}`;
        if (!groupedRecords.has(key)) {
          groupedRecords.set(key, []);
        }
        groupedRecords.get(key).push(record);
      });
      
      console.log(`📊 Grouped into ${groupedRecords.size} unique groups\n`);
      
      // Process each group
      const aggregatedRecords = [];
      
      for (const [key, records] of groupedRecords) {
        const parts = key.split('-');
        const date = `${parts[0]}-${parts[1]}-${parts[2]}`; // Reconstruct full date
        const environmentId = parts[3];
        
        let totalRevenue = 0;
        let transactionCount = 0;
        
        records.forEach(record => {
          // Extract revenue from amt_in_cents (convert to euros)
          const revenueCents = record.raw_data?.amt_in_cents || 0;
          const revenue = Number(revenueCents) / 100; // Convert cents to euros
          
          totalRevenue += revenue;
          transactionCount += 1;
        });
        
        const avgRevenuePerTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          total_revenue: Math.round(totalRevenue * 100) / 100,
          transaction_count: transactionCount,
          avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction * 100) / 100
        });
        
        console.log(`📋 Group ${key}:`, {
          date,
          environment_id: Number(environmentId),
          total_revenue: Math.round(totalRevenue * 100) / 100,
          transaction_count: transactionCount,
          avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction * 100) / 100
        });
      }
      
      console.log(`\n✅ Processed ${aggregatedRecords.length} aggregated records`);
      
      // Test upsert to aggregated table
      if (aggregatedRecords.length > 0) {
        console.log('\n🔄 Testing upsert to eitje_revenue_days_aggregated...');
        
        const { error: upsertError } = await supabase
          .from('eitje_revenue_days_aggregated')
          .upsert(aggregatedRecords, {
            onConflict: 'date,environment_id'
          });
        
        if (upsertError) {
          console.log('❌ Upsert error:', upsertError.message);
        } else {
          console.log('✅ Successfully upserted aggregated revenue data!');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
}

testRevenueAggregation().catch(console.error);
