const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWithServiceRole() {
  try {
    console.log('Testing with service role key...');
    
    // Test BarBea March 2025
    const locationId = '550e8400-e29b-41d4-a716-446655440002'; // BarBea
    const year = 2025;
    const month = 3;
    
    console.log(`Testing aggregation for BarBea March 2025...`);
    
    // First, let's check if we can insert a test record
    console.log('Testing direct database insert with service role...');
    
    const testRecord = {
      location_id: locationId,
      year: year,
      month: month,
      revenue_food: 1000,
      revenue_beverage: 500,
      revenue_total: 1500,
      cost_of_sales_food: -300,
      cost_of_sales_beverage: -200,
      cost_of_sales_total: -500,
      labor_contract: -400,
      labor_flex: -100,
      labor_total: -500,
      other_costs_total: -200,
      opbrengst_vorderingen: 0,
      resultaat: 300,
      netto_omzet_uit_levering_geproduceerd: 1000,
      netto_omzet_verkoop_handelsgoederen: 500,
      inkoopwaarde_handelsgoederen: -500,
      lonen_en_salarissen: -500,
      huisvestingskosten: -100,
      exploitatie_kosten: -50,
      verkoop_kosten: -30,
      autokosten: -20,
      kantoorkosten: -10,
      assurantiekosten: -5,
      accountantskosten: -3,
      administratieve_lasten: -2,
      andere_kosten: -10,
      afschrijvingen: -50,
      financiele_baten_lasten: -20,
      total_revenue: 1500,
      total_cost_of_sales: -500,
      total_labor_costs: -500,
      total_other_costs: -200,
      total_costs: -1200
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('powerbi_pnl_aggregated')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('❌ Direct insert failed:', insertError);
      return;
    }
    
    console.log('✅ Direct insert successful with service role!');
    console.log('Inserted record ID:', insertData[0].id);
    
    // Now test the aggregation API
    console.log('\nTesting aggregation API...');
    
    const response = await fetch(`http://localhost:3000/api/finance/pnl-aggregate?locationId=${locationId}&year=${year}&month=${month}`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Aggregation API successful!');
      console.log('Result:', {
        revenue_food: result.data.revenue_food,
        revenue_beverage: result.data.revenue_beverage,
        revenue_total: result.data.revenue_total,
        resultaat: result.data.resultaat
      });
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
    
    // Clean up test data
    console.log('\nCleaning up test data...');
    await supabase.from('powerbi_pnl_aggregated').delete().eq('location_id', locationId).eq('year', year).eq('month', month);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('Error testing with service role:', error);
  }
}

testWithServiceRole();


