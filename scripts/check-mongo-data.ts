/**
 * Check MongoDB V2 Data
 * 
 * Script to check what data exists in MongoDB collections
 * Usage: npx tsx scripts/check-mongo-data.ts
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';

async function checkMongoData() {
  try {
    const db = await getDatabase();

    console.log('\n📊 MongoDB V2 Data Check\n');
    console.log('='.repeat(50));

    // Check locations
    const locationsCount = await db.collection('locations').countDocuments();
    const locations = await db.collection('locations').find({}).limit(5).toArray();
    console.log(`\n📍 Locations: ${locationsCount} total`);
    if (locations.length > 0) {
      console.log('Sample locations:');
      locations.forEach((loc) => {
        console.log(`  - ${loc.name} (${loc.code || 'no code'}) - Active: ${loc.isActive}`);
      });
    }

    // Check API credentials
    const credentialsCount = await db.collection('api_credentials').countDocuments();
    const credentials = await db.collection('api_credentials').find({}).toArray();
    console.log(`\n🔑 API Credentials: ${credentialsCount} total`);
    credentials.forEach((cred) => {
      console.log(`  - Provider: ${cred.provider}, Active: ${cred.isActive}`);
      console.log(`    Base URL: ${cred.baseUrl || 'N/A'}`);
    });

    // Check Eitje raw data
    const eitjeRawCount = await db.collection('eitje_raw_data').countDocuments();
    const eitjeRawSample = await db.collection('eitje_raw_data')
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    console.log(`\n📥 Eitje Raw Data: ${eitjeRawCount} total`);
    if (eitjeRawSample.length > 0) {
      console.log('Sample records:');
      eitjeRawSample.forEach((record) => {
        const date = record.date ? new Date(record.date).toISOString().split('T')[0] : 'N/A';
        console.log(`  - Date: ${date}, Endpoint: ${record.endpoint}`);
        console.log(`    Extracted fields: ${Object.keys(record.extracted || {}).length} fields`);
      });
    }

    // Check Eitje aggregated data
    const eitjeAggCount = await db.collection('eitje_aggregated').countDocuments();
    const eitjeAggSample = await db.collection('eitje_aggregated')
      .find({})
      .sort({ date: -1 })
      .limit(5)
      .toArray();
    console.log(`\n📊 Eitje Aggregated Data: ${eitjeAggCount} total`);
    if (eitjeAggSample.length > 0) {
      console.log('Sample aggregated records:');
      eitjeAggSample.forEach((record) => {
        const date = record.date ? new Date(record.date).toISOString().split('T')[0] : 'N/A';
        console.log(`  - Date: ${date}`);
        console.log(`    Hours: ${record.totalHoursWorked?.toFixed(2) || 0}, Revenue: ${record.totalRevenue?.toFixed(2) || 0}`);
        console.log(`    Labor Cost %: ${record.laborCostPercentage?.toFixed(2) || 0}%, Revenue/Hour: ${record.revenuePerHour?.toFixed(2) || 0}`);
      });
    }

    // Date range summary for Eitje data
    if (eitjeRawCount > 0) {
      const dateRange = await db.collection('eitje_raw_data').aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' },
          },
        },
      ]).toArray();

      if (dateRange.length > 0 && dateRange[0].minDate) {
        console.log(`\n📅 Eitje Raw Data Date Range:`);
        console.log(`  From: ${new Date(dateRange[0].minDate).toISOString().split('T')[0]}`);
        console.log(`  To: ${new Date(dateRange[0].maxDate).toISOString().split('T')[0]}`);
      }
    }

    if (eitjeAggCount > 0) {
      const aggDateRange = await db.collection('eitje_aggregated').aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' },
          },
        },
      ]).toArray();

      if (aggDateRange.length > 0 && aggDateRange[0].minDate) {
        console.log(`\n📅 Eitje Aggregated Data Date Range:`);
        console.log(`  From: ${new Date(aggDateRange[0].minDate).toISOString().split('T')[0]}`);
        console.log(`  To: ${new Date(aggDateRange[0].maxDate).toISOString().split('T')[0]}`);
      }
    }

    // Endpoint breakdown for raw data
    if (eitjeRawCount > 0) {
      const endpointBreakdown = await db.collection('eitje_raw_data').aggregate([
        {
          $group: {
            _id: '$endpoint',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray();

      console.log(`\n📡 Endpoint Breakdown:`);
      endpointBreakdown.forEach((item) => {
        console.log(`  - ${item._id}: ${item.count} records`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Data check complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking MongoDB data:', error);
    process.exit(1);
  }
}

checkMongoData();











