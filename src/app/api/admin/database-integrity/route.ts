/**
 * GET /api/admin/database-integrity
 * 
 * Checks date gaps in aggregated collections
 * Uses lightweight aggregation queries
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (integrity checks are more expensive)

export async function GET() {
  try {
    // Test database connection first
    const db = await getDatabase();
    await db.admin().ping(); // Test connection

    // Check cache first
    const cached = await db.collection('system_status').findOne({
      type: 'database_integrity',
    });

    if (cached && cached.expiresAt && new Date(cached.expiresAt) > new Date()) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        lastUpdated: cached.lastUpdated ? new Date(cached.lastUpdated).toISOString() : new Date().toISOString(),
      });
    }

    // Get date ranges using lightweight aggregation (min/max only)
    const [borkDateRange, eitjeDateRange, productsInfo] = await Promise.all([
      db.collection('bork_aggregated').aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' },
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      db.collection('eitje_aggregated').aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' },
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      db.collection('products_aggregated').aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            maxLastSeen: { $max: '$lastSeen' },
          },
        },
      ]).toArray(),
    ]);

    const borkData = borkDateRange[0];
    const eitjeData = eitjeDateRange[0];
    const productsData = productsInfo[0];

    // Check for missing dates (only if we have data)
    const getMissingDates = async (collection: string, minDate: Date, maxDate: Date): Promise<string[]> => {
      if (!minDate || !maxDate) return [];

      // Get all existing dates (lightweight - only date field)
      const existingDates = await db.collection(collection)
        .find({}, { projection: { date: 1 } })
        .toArray();

      const existingDateSet = new Set(
        existingDates.map((d: any) => {
          const date = new Date(d.date);
          return date.toISOString().split('T')[0];
        })
      );

      // Generate expected dates
      const missing: string[] = [];
      const current = new Date(minDate);
      const end = new Date(maxDate);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!existingDateSet.has(dateStr)) {
          missing.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }

      return missing;
    };

    const [borkMissingDates, eitjeMissingDates] = await Promise.all([
      borkData?.minDate && borkData?.maxDate
        ? getMissingDates('bork_aggregated', new Date(borkData.minDate), new Date(borkData.maxDate))
        : Promise.resolve([]),
      eitjeData?.minDate && eitjeData?.maxDate
        ? getMissingDates('eitje_aggregated', new Date(eitjeData.minDate), new Date(eitjeData.maxDate))
        : Promise.resolve([]),
    ]);

    const integrity = {
      borkAggregated: {
        dateRange: borkData
          ? {
              min: new Date(borkData.minDate).toISOString().split('T')[0],
              max: new Date(borkData.maxDate).toISOString().split('T')[0],
            }
          : { min: '', max: '' },
        missingDates: borkMissingDates,
        totalRecords: borkData?.count || 0,
        integrityStatus: borkData
          ? borkMissingDates.length === 0
            ? ('complete' as const)
            : ('missing_dates' as const)
          : ('no_data' as const),
      },
      eitjeAggregated: {
        dateRange: eitjeData
          ? {
              min: new Date(eitjeData.minDate).toISOString().split('T')[0],
              max: new Date(eitjeData.maxDate).toISOString().split('T')[0],
            }
          : { min: '', max: '' },
        missingDates: eitjeMissingDates,
        totalRecords: eitjeData?.count || 0,
        integrityStatus: eitjeData
          ? eitjeMissingDates.length === 0
            ? ('complete' as const)
            : ('missing_dates' as const)
          : ('no_data' as const),
      },
      productsAggregated: {
        totalRecords: productsData?.count || 0,
        lastUpdated: productsData?.maxLastSeen
          ? new Date(productsData.maxLastSeen).toISOString()
          : undefined,
        integrityStatus: productsData?.count > 0 ? ('complete' as const) : ('no_data' as const),
      },
      lastChecked: new Date(),
    };

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL);
    await db.collection('system_status').updateOne(
      { type: 'database_integrity' },
      {
        $set: {
          data: integrity,
          lastUpdated: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: integrity,
      cached: false,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /admin/database-integrity] Error:', error);
    console.error('[API /admin/database-integrity] Error stack:', error.stack);
    console.error('[API /admin/database-integrity] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check database integrity',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

