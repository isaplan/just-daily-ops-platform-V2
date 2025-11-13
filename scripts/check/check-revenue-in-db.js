const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRevenueInDB() {
  console.log('🔍 Checking for revenue data in database...\n');
  
  try {
    // Check for records with gl_account = "Netto-omzet"
    const { data: nettoOmzetData, error: nettoError } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .eq('gl_account', 'Netto-omzet')
      .limit(5);
    
    if (nettoError) {
      console.error('❌ Error fetching Netto-omzet data:', nettoError);
    } else {
      console.log(`📊 Found ${nettoOmzetData.length} records with gl_account = "Netto-omzet"`);
      if (nettoOmzetData.length > 0) {
        console.log('Sample record:', nettoOmzetData[0]);
      }
    }
    
    // Check for records with category containing "Netto-omzet"
    const { data: categoryData, error: categoryError } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .ilike('category', '%Netto-omzet%')
      .limit(5);
    
    if (categoryError) {
      console.error('❌ Error fetching category data:', categoryError);
    } else {
      console.log(`📊 Found ${categoryData.length} records with category containing "Netto-omzet"`);
      if (categoryData.length > 0) {
        console.log('Sample record:', categoryData[0]);
      }
    }
    
    // Check total record count
    const { count: totalCount, error: countError } = await supabase
      .from('powerbi_pnl_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting total count:', countError);
    } else {
      console.log(`📊 Total records in powerbi_pnl_data: ${totalCount}`);
    }
    
    // Check for any records with positive amounts (revenue)
    const { data: positiveData, error: positiveError } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .gt('amount', 0)
      .limit(5);
    
    if (positiveError) {
      console.error('❌ Error fetching positive amount data:', positiveError);
    } else {
      console.log(`📊 Found ${positiveData.length} records with positive amounts`);
      if (positiveData.length > 0) {
        console.log('Sample positive record:', positiveData[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkRevenueInDB().catch(console.error);


