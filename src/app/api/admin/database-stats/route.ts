/**
 * GET /api/admin/database-stats
 * 
 * Returns pre-computed database statistics
 * Uses caching to avoid expensive queries
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Test database connection first
    const db = await getDatabase();
    await db.admin().ping(); // Test connection

    // Check cache first
    const cached = await db.collection('system_status').findOne({
      type: 'database_stats',
    });

    if (cached && cached.expiresAt && new Date(cached.expiresAt) > new Date()) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        lastUpdated: cached.lastUpdated ? new Date(cached.lastUpdated).toISOString() : new Date().toISOString(),
      });
    }

    // Pre-compute stats (lightweight queries only - countDocuments)
    const [
      locationsCount,
      borkRawCount,
      borkAggCount,
      eitjeRawCount,
      eitjeAggCount,
      productsAggCount,
      menusCount,
      credentialsCount,
    ] = await Promise.all([
      db.collection('locations').countDocuments(),
      db.collection('bork_raw_data').countDocuments(),
      db.collection('bork_aggregated').countDocuments(),
      db.collection('eitje_raw_data').countDocuments(),
      db.collection('eitje_aggregated').countDocuments(),
      db.collection('products_aggregated').countDocuments(),
      db.collection('menus').countDocuments(),
      db.collection('api_credentials').countDocuments(),
    ]);

    // Get latest record dates (lightweight - limit 1, sort by date)
    const [
      borkLatest,
      eitjeLatest,
      productsLatest,
    ] = await Promise.all([
      db.collection('bork_aggregated')
        .find({})
        .sort({ date: -1 })
        .limit(1)
        .project({ date: 1 })
        .toArray(),
      db.collection('eitje_aggregated')
        .find({})
        .sort({ date: -1 })
        .limit(1)
        .project({ date: 1 })
        .toArray(),
      db.collection('products_aggregated')
        .find({})
        .sort({ lastSeen: -1 })
        .limit(1)
        .project({ lastSeen: 1 })
        .toArray(),
    ]);

    const stats = {
      collections: [
        { name: 'locations', count: locationsCount },
        { name: 'bork_raw_data', count: borkRawCount },
        { name: 'bork_aggregated', count: borkAggCount, lastRecordDate: borkLatest[0]?.date ? new Date(borkLatest[0].date).toISOString() : undefined },
        { name: 'eitje_raw_data', count: eitjeRawCount },
        { name: 'eitje_aggregated', count: eitjeAggCount, lastRecordDate: eitjeLatest[0]?.date ? new Date(eitjeLatest[0].date).toISOString() : undefined },
        { name: 'products_aggregated', count: productsAggCount, lastRecordDate: productsLatest[0]?.lastSeen ? new Date(productsLatest[0].lastSeen).toISOString() : undefined },
        { name: 'menus', count: menusCount },
        { name: 'api_credentials', count: credentialsCount },
      ],
      totalRecords: locationsCount + borkRawCount + borkAggCount + eitjeRawCount + eitjeAggCount + productsAggCount + menusCount + credentialsCount,
      lastRefresh: new Date(),
      databaseName: process.env.MONGODB_DB_NAME || 'just-daily-ops-v2',
      connectionStatus: 'connected' as const,
    };

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL);
    await db.collection('system_status').updateOne(
      { type: 'database_stats' },
      {
        $set: {
          data: stats,
          lastUpdated: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: stats,
      cached: false,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /admin/database-stats] Error:', error);
    console.error('[API /admin/database-stats] Error stack:', error.stack);
    console.error('[API /admin/database-stats] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get database statistics',
        connectionStatus: 'error' as const,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

