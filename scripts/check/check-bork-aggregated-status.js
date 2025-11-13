const { createClient } = require('@supabase/supabase-js');

// Try to load env vars
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  console.log('No .env.local found, using process.env');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBorkAggregatedStatus() {
  console.log('🔍 Checking Bork Aggregated Data Status...\n');

  try {
    // 1. Get locations
    console.log('📍 Fetching locations...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name')
      .order('name');

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    console.log(`Found ${locations.length} locations\n`);

    // 2. Check aggregated data for each location
    const locationAnalysis = [];

    for (const location of locations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏪 ${location.name} (${location.id})`);
      console.log(`${'='.repeat(60)}`);

      // Get aggregated data for this location
      const { data: aggregatedData, error: aggError } = await supabase
        .from('bork_sales_aggregated')
        .select('*')
        .eq('location_id', location.id)
        .order('date');

      if (aggError) {
        console.error(`❌ Error fetching aggregated data: ${aggError.message}`);
        continue;
      }

      if (!aggregatedData || aggregatedData.length === 0) {
        console.log(`❌ No aggregated data found for this location`);
        locationAnalysis.push({
          locationId: location.id,
          locationName: location.name,
          aggregatedRecords: 0,
          dateRange: null,
          totalRevenue: 0,
          totalQuantity: 0,
          isComplete: false
        });
        continue;
      }

      // Analyze aggregated data
      const dates = aggregatedData.map(d => d.date).sort();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      
      const totalRevenue = aggregatedData.reduce((sum, d) => sum + (d.total_revenue_incl_vat || 0), 0);
      const totalQuantity = aggregatedData.reduce((sum, d) => sum + (d.total_quantity || 0), 0);
      const avgDailyRevenue = totalRevenue / aggregatedData.length;
      const avgDailyQuantity = totalQuantity / aggregatedData.length;

      console.log(`📊 Aggregated records: ${aggregatedData.length}`);
      console.log(`📅 Date range: ${firstDate} to ${lastDate}`);
      console.log(`💰 Total revenue: €${totalRevenue.toLocaleString()}`);
      console.log(`📦 Total quantity: ${totalQuantity.toLocaleString()}`);
      console.log(`📈 Avg daily revenue: €${avgDailyRevenue.toFixed(2)}`);
      console.log(`📈 Avg daily quantity: ${avgDailyQuantity.toFixed(2)}`);

      // Check for gaps in dates
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i-1]);
        const currDate = new Date(dates[i]);
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 1) {
          gaps.push({
            start: dates[i-1],
            end: dates[i],
            gapDays: diffDays - 1
          });
        }
      }

      if (gaps.length > 0) {
        console.log(`\n⚠️  Date gaps found: ${gaps.length}`);
        gaps.slice(0, 5).forEach(gap => {
          console.log(`   ${gap.start} to ${gap.end} (${gap.gapDays} missing days)`);
        });
        if (gaps.length > 5) {
          console.log(`   ... and ${gaps.length - 5} more gaps`);
        }
      } else {
        console.log(`\n✅ No date gaps found`);
      }

      // Check data quality
      const zeroRevenueDays = aggregatedData.filter(d => d.total_revenue_incl_vat === 0).length;
      const zeroQuantityDays = aggregatedData.filter(d => d.total_quantity === 0).length;
      
      if (zeroRevenueDays > 0) {
        console.log(`⚠️  Days with zero revenue: ${zeroRevenueDays}`);
      }
      if (zeroQuantityDays > 0) {
        console.log(`⚠️  Days with zero quantity: ${zeroQuantityDays}`);
      }

      locationAnalysis.push({
        locationId: location.id,
        locationName: location.name,
        aggregatedRecords: aggregatedData.length,
        dateRange: { start: firstDate, end: lastDate },
        totalRevenue,
        totalQuantity,
        avgDailyRevenue,
        avgDailyQuantity,
        gaps: gaps.length,
        zeroRevenueDays,
        zeroQuantityDays,
        isComplete: gaps.length === 0 && aggregatedData.length > 0
      });
    }

    // 3. Overall summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 OVERALL SUMMARY`);
    console.log(`${'='.repeat(80)}`);

    const totalRecords = locationAnalysis.reduce((sum, l) => sum + l.aggregatedRecords, 0);
    const totalRevenue = locationAnalysis.reduce((sum, l) => sum + l.totalRevenue, 0);
    const totalQuantity = locationAnalysis.reduce((sum, l) => sum + l.totalQuantity, 0);
    const completeLocations = locationAnalysis.filter(l => l.isComplete).length;
    const totalGaps = locationAnalysis.reduce((sum, l) => sum + l.gaps, 0);

    console.log(`\n🏪 Locations: ${locations.length} total`);
    console.log(`   ✅ Complete: ${completeLocations}`);
    console.log(`   ❌ Incomplete: ${locations.length - completeLocations}`);

    console.log(`\n📊 Data Statistics:`);
    console.log(`   Total aggregated records: ${totalRecords.toLocaleString()}`);
    console.log(`   Total revenue: €${totalRevenue.toLocaleString()}`);
    console.log(`   Total quantity: ${totalQuantity.toLocaleString()}`);
    console.log(`   Total date gaps: ${totalGaps}`);

    // Overall date range
    const allDates = locationAnalysis
      .filter(l => l.dateRange)
      .flatMap(l => [l.dateRange.start, l.dateRange.end])
      .sort();
    
    if (allDates.length > 0) {
      console.log(`\n📅 Overall date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);
    }

    // 4. Check raw data vs aggregated data
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 RAW vs AGGREGATED DATA COMPARISON`);
    console.log(`${'='.repeat(80)}`);

    for (const location of locationAnalysis) {
      if (location.aggregatedRecords === 0) {
        console.log(`\n🏪 ${location.locationName}: No aggregated data`);
        continue;
      }

      // Get raw data count for comparison (with limit to avoid timeout)
      const { data: rawData, error: rawError } = await supabase
        .from('bork_sales_data')
        .select('date', { count: 'exact', head: true })
        .eq('location_id', location.locationId)
        .neq('category', 'STEP1_RAW_DATA');

      if (rawError) {
        console.log(`\n🏪 ${location.locationName}: Error checking raw data - ${rawError.message}`);
        continue;
      }

      const rawDates = rawData ? new Set(rawData.map(r => r.date)) : new Set();
      const aggregatedDates = new Set();
      
      // Get aggregated dates for this location
      const { data: aggDates } = await supabase
        .from('bork_sales_aggregated')
        .select('date')
        .eq('location_id', location.locationId);
      
      if (aggDates) {
        aggDates.forEach(d => aggregatedDates.add(d.date));
      }

      const missingAggregated = [...rawDates].filter(date => !aggregatedDates.has(date));
      const missingRaw = [...aggregatedDates].filter(date => !rawDates.has(date));

      console.log(`\n🏪 ${location.locationName}:`);
      console.log(`   Raw data dates: ${rawDates.size}`);
      console.log(`   Aggregated dates: ${aggregatedDates.size}`);
      console.log(`   Missing aggregated: ${missingAggregated.length}`);
      console.log(`   Missing raw: ${missingRaw.length}`);

      if (missingAggregated.length > 0) {
        console.log(`   ⚠️  Raw data not aggregated: ${missingAggregated.slice(0, 5).join(', ')}${missingAggregated.length > 5 ? '...' : ''}`);
      }
      if (missingRaw.length > 0) {
        console.log(`   ⚠️  Aggregated data without raw: ${missingRaw.slice(0, 5).join(', ')}${missingRaw.length > 5 ? '...' : ''}`);
      }
    }

    // 5. Recommendations
    console.log(`\n${'='.repeat(80)}`);
    console.log(`💡 RECOMMENDATIONS`);
    console.log(`${'='.repeat(80)}`);

    if (totalRecords === 0) {
      console.log(`\n❌ No aggregated data found. Need to:`);
      console.log(`   1. Process raw data into individual sales records`);
      console.log(`   2. Run aggregation to create daily summaries`);
    } else if (totalGaps > 0) {
      console.log(`\n⚠️  Date gaps found. Consider:`);
      console.log(`   1. Syncing missing dates from Bork API`);
      console.log(`   2. Running aggregation for missing dates`);
    } else {
      console.log(`\n✅ Data looks complete! Consider:`);
      console.log(`   1. Setting up automated daily aggregation`);
      console.log(`   2. Adding data quality monitoring`);
    }

    console.log('\n✅ Aggregated data analysis completed!');

  } catch (error) {
    console.error('❌ Error checking aggregated data status:', error);
  }
}

// Run the check
checkBorkAggregatedStatus();

