const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAggregationAPI() {
  try {
    console.log('Testing aggregation API...');
    
    // Test the aggregation API endpoint
    const locationId = '550e8400-e29b-41d4-a716-446655440002'; // BarBea
    const year = 2025;
    const month = 3;
    
    console.log(`Testing aggregation for BarBea March 2025...`);
    
    const response = await fetch(`http://localhost:3000/api/finance/pnl-aggregate?locationId=${locationId}&year=${year}&month=${month}`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Aggregation API successful!');
      console.log('Result:', {
        revenue_food: result.data.revenue_food,
        revenue_beverage: result.data.revenue_beverage,
        revenue_total: result.data.revenue_total,
        cost_of_sales_food: result.data.cost_of_sales_food,
        cost_of_sales_beverage: result.data.cost_of_sales_beverage,
        cost_of_sales_total: result.data.cost_of_sales_total,
        labor_contract: result.data.labor_contract,
        labor_flex: result.data.labor_flex,
        labor_total: result.data.labor_total,
        other_costs_total: result.data.other_costs_total,
        resultaat: result.data.resultaat
      });
      
      // Check if resultaat matches expected value (€8,153)
      const expectedResultaat = 8153;
      const actualResultaat = result.data.resultaat;
      const errorMargin = Math.abs(actualResultaat - expectedResultaat) / expectedResultaat * 100;
      
      console.log(`\n📊 Validation Results:`);
      console.log(`Expected resultaat: €${expectedResultaat.toLocaleString()}`);
      console.log(`Actual resultaat: €${actualResultaat.toLocaleString()}`);
      console.log(`Error margin: ${errorMargin.toFixed(2)}%`);
      
      if (errorMargin < 0.5) {
        console.log('✅ Resultaat is within 0.5% error margin!');
      } else {
        console.log('❌ Resultaat is outside 0.5% error margin');
      }
      
    } else {
      console.error('❌ Aggregation API failed:', result.error);
    }
    
    // Test the aggregated data API
    console.log('\nTesting aggregated data API...');
    
    const dataResponse = await fetch(`http://localhost:3000/api/finance/pnl-aggregated-data?year=2025&location=${locationId}`);
    const dataResult = await dataResponse.json();
    
    if (dataResponse.ok && dataResult.success) {
      console.log('✅ Aggregated data API successful!');
      console.log(`Found ${dataResult.data.length} aggregated records`);
      
      if (dataResult.data.length > 0) {
        const record = dataResult.data[0];
        console.log('Sample record:', {
          location_id: record.location_id,
          year: record.year,
          month: record.month,
          revenue_food: record.revenue_food,
          revenue_beverage: record.revenue_beverage,
          resultaat: record.resultaat
        });
      }
    } else {
      console.error('❌ Aggregated data API failed:', dataResult.error);
    }
    
  } catch (error) {
    console.error('Error testing aggregation API:', error);
  }
}

testAggregationAPI();


