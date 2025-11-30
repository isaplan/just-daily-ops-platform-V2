/**
 * GET /api/admin/worker-profiles-aggregated/check-data
 * Verify that worker_profiles_aggregated collection has data
 * Returns record count, sample records, and active years
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    console.log('[Worker Check-Data] Checking worker_profiles_aggregated collection...');

    // Count total records
    const totalCount = await db.collection('worker_profiles_aggregated')
      .countDocuments({});

    console.log(`[Worker Check-Data] Total records: ${totalCount}`);

    // Get sample records
    const sampleRecords = await db.collection('worker_profiles_aggregated')
      .find({})
      .limit(5)
      .toArray();

    // Get aggregation stats
    const stats = await db.collection('worker_profiles_aggregated')
      .aggregate([
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            avgYearsActive: { $avg: { $size: '$activeYears' } },
            activeWorkers: {
              $sum: { $cond: ['$isActive', 1, 0] },
            },
            inactiveWorkers: {
              $sum: { $cond: ['$isActive', 0, 1] },
            },
            withHourlyWage: {
              $sum: { $cond: [{ $gt: ['$hourlyWage', null] }, 1, 0] },
            },
            withoutHourlyWage: {
              $sum: { $cond: [{ $eq: ['$hourlyWage', null] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();

    const aggregationStats = stats[0] || {
      totalRecords: 0,
      avgYearsActive: 0,
      activeWorkers: 0,
      inactiveWorkers: 0,
      withHourlyWage: 0,
      withoutHourlyWage: 0,
    };

    // Get latest aggregation times
    const latestAggregations = await db.collection('worker_profiles_aggregated')
      .find({})
      .sort({ lastAggregated: -1 })
      .limit(5)
      .project({ eitjeUserId: 1, userName: 1, lastAggregated: 1, isActive: 1 })
      .toArray();

    console.log('[Worker Check-Data] ✅ Collection check complete');

    return NextResponse.json({
      success: true,
      collection: 'worker_profiles_aggregated',
      totalRecords: totalCount,
      statistics: aggregationStats,
      sampleRecords: sampleRecords.map((r: any) => ({
        eitjeUserId: r.eitjeUserId,
        userName: r.userName,
        locationName: r.locationName,
        isActive: r.isActive,
        activeYears: r.activeYears,
        contractType: r.contractType,
        hourlyWage: r.hourlyWage,
        lastAggregated: r.lastAggregated,
      })),
      latestAggregations: latestAggregations.map((r: any) => ({
        eitjeUserId: r.eitjeUserId,
        userName: r.userName,
        lastAggregated: r.lastAggregated,
        isActive: r.isActive,
      })),
    });
  } catch (error: any) {
    console.error('[Worker Check-Data] ❌ Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check worker data',
      },
      { status: 500 }
    );
  }
}
