/**
 * GET /api/admin/check-location-data
 * 
 * Check data breakdown by location
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get all locations
    const locations = await db.collection('locations').find({}).toArray();

    // Get data breakdown by location
    const locationBreakdown = await Promise.all(
      locations.map(async (loc) => {
        const rawCount = await db.collection('eitje_raw_data').countDocuments({
          locationId: loc._id,
        });

        const aggregatedCount = await db.collection('eitje_aggregated').countDocuments({
          locationId: loc._id,
        });

        // Get aggregated totals
        const aggregatedStats = await db.collection('eitje_aggregated').aggregate([
          {
            $match: { locationId: loc._id },
          },
          {
            $group: {
              _id: null,
              totalHours: { $sum: '$totalHoursWorked' },
              totalRevenue: { $sum: '$totalRevenue' },
              recordCount: { $sum: 1 },
            },
          },
        ]).toArray();

        return {
          locationId: loc._id.toString(),
          name: loc.name,
          code: loc.code,
          rawRecords: rawCount,
          aggregatedRecords: aggregatedCount,
          totalHours: aggregatedStats[0]?.totalHours?.toFixed(2) || '0.00',
          totalRevenue: aggregatedStats[0]?.totalRevenue?.toFixed(2) || '0.00',
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        locations: locationBreakdown,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-location-data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check location data',
      },
      { status: 500 }
    );
  }
}






