/**
 * GET /api/admin/check-data
 * 
 * Check MongoDB data for debugging/admin purposes
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    // Check locations
    const locationsCount = await db.collection('locations').countDocuments();
    const locations = await db.collection('locations').find({}).limit(5).toArray();

    // Check API credentials
    const credentialsCount = await db.collection('api_credentials').countDocuments();
    const credentials = await db.collection('api_credentials').find({}).toArray();

    // Check Eitje raw data
    const eitjeRawCount = await db.collection('eitje_raw_data').countDocuments();
    const eitjeRawSample = await db.collection('eitje_raw_data')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Check Eitje aggregated data
    const eitjeAggCount = await db.collection('eitje_aggregated').countDocuments();
    const eitjeAggSample = await db.collection('eitje_aggregated')
      .find({})
      .sort({ date: -1 })
      .limit(10)
      .toArray();

    // Date range for raw data
    const rawDateRange = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
        },
      },
    ]).toArray();

    // Date range for aggregated data
    const aggDateRange = await db.collection('eitje_aggregated').aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
        },
      },
    ]).toArray();

    // Endpoint breakdown with last sync time
    const endpointBreakdown = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          lastSync: { $max: '$createdAt' },
          firstSync: { $min: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    // Monthly breakdown for aggregated data
    const monthlyBreakdown = await db.collection('eitje_aggregated').aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHoursWorked' },
          totalRevenue: { $sum: '$totalRevenue' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        locations: {
          count: locationsCount,
          sample: locations.map((loc) => ({
            name: loc.name,
            code: loc.code,
            isActive: loc.isActive,
          })),
        },
        credentials: {
          count: credentialsCount,
          items: credentials.map((cred) => ({
            provider: cred.provider,
            isActive: cred.isActive,
            baseUrl: cred.baseUrl,
            hasLocationId: !!cred.locationId,
          })),
        },
        eitjeRaw: {
          count: eitjeRawCount,
          dateRange: rawDateRange.length > 0 && rawDateRange[0].minDate ? {
            min: new Date(rawDateRange[0].minDate).toISOString().split('T')[0],
            max: new Date(rawDateRange[0].maxDate).toISOString().split('T')[0],
          } : null,
          endpointBreakdown: endpointBreakdown.map((item) => ({
            endpoint: item._id,
            count: item.count,
            lastSync: item.lastSync ? new Date(item.lastSync).toISOString() : null,
            firstSync: item.firstSync ? new Date(item.firstSync).toISOString() : null,
          })),
          sample: eitjeRawSample.map((record) => ({
            date: record.date ? new Date(record.date).toISOString().split('T')[0] : null,
            endpoint: record.endpoint,
            extractedFieldsCount: Object.keys(record.extracted || {}).length,
            hasRawResponse: !!record.rawApiResponse,
          })),
        },
        eitjeAggregated: {
          count: eitjeAggCount,
          dateRange: aggDateRange.length > 0 && aggDateRange[0].minDate ? {
            min: new Date(aggDateRange[0].minDate).toISOString().split('T')[0],
            max: new Date(aggDateRange[0].maxDate).toISOString().split('T')[0],
          } : null,
          monthlyBreakdown: monthlyBreakdown.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            recordCount: item.count,
            totalHours: item.totalHours?.toFixed(2),
            totalRevenue: item.totalRevenue?.toFixed(2),
          })),
          sample: eitjeAggSample.map((record) => ({
            date: record.date ? new Date(record.date).toISOString().split('T')[0] : null,
            totalHoursWorked: record.totalHoursWorked?.toFixed(2),
            totalWageCost: record.totalWageCost?.toFixed(2),
            totalRevenue: record.totalRevenue?.toFixed(2),
            laborCostPercentage: record.laborCostPercentage?.toFixed(2),
            revenuePerHour: record.revenuePerHour?.toFixed(2),
            teamStatsCount: Array.isArray(record.teamStats) ? record.teamStats.length : 0,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check MongoDB data',
      },
      { status: 500 }
    );
  }
}





