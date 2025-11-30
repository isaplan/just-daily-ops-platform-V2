/**
 * GET /api/admin/system-status
 * 
 * Returns pre-computed system status (Bork/Eitje API status)
 * Uses existing cron status endpoints
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET() {
  try {
    // Test database connection first
    const db = await getDatabase();
    await db.admin().ping(); // Test connection

    // Check cache first
    const cached = await db.collection('system_status').findOne({
      type: 'system_status',
    });

    if (cached && cached.expiresAt && new Date(cached.expiresAt) > new Date()) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        lastUpdated: cached.lastUpdated ? new Date(cached.lastUpdated).toISOString() : new Date().toISOString(),
      });
    }

    // Get API credentials to check connection status
    const [borkCredentials, eitjeCredentials] = await Promise.all([
      db.collection('api_credentials')
        .findOne({ provider: 'bork', isActive: true }),
      db.collection('api_credentials')
        .findOne({ provider: 'eitje', isActive: true }),
    ]);

    // Get cron job statuses (using internal cron manager or direct DB queries)
    // For now, we'll check the cron_jobs collection if it exists, or use API calls
    const getCronStatus = async (jobType: string) => {
      try {
        // Try to get from cron_jobs collection if it exists
        const cronJob = await db.collection('cron_jobs')
          .findOne({ jobType });
        
        if (cronJob) {
          return {
            isActive: cronJob.isActive || false,
            lastRun: cronJob.lastRun ? new Date(cronJob.lastRun) : undefined,
            nextRun: cronJob.nextRun ? new Date(cronJob.nextRun) : undefined,
          };
        }
      } catch (error) {
        // Collection might not exist
      }
      return {
        isActive: false,
        lastRun: undefined,
        nextRun: undefined,
      };
    };

    // Get latest sync dates from aggregated collections
    const [borkLatestSync, eitjeLatestSync] = await Promise.all([
      db.collection('bork_aggregated')
        .find({})
        .sort({ date: -1 })
        .limit(1)
        .project({ date: 1, createdAt: 1 })
        .toArray(),
      db.collection('eitje_aggregated')
        .find({})
        .sort({ date: -1 })
        .limit(1)
        .project({ date: 1, createdAt: 1 })
        .toArray(),
    ]);

    // Get cron statuses
    const [
      borkDailyCron,
      borkHistoricalCron,
      borkMasterCron,
      eitjeDailyCron,
      eitjeHistoricalCron,
      eitjeMasterCron,
    ] = await Promise.all([
      getCronStatus('bork-daily-data'),
      getCronStatus('bork-historical-data'),
      getCronStatus('bork-master-data'),
      getCronStatus('eitje-daily-data'),
      getCronStatus('eitje-historical-data'),
      getCronStatus('eitje-master-data'),
    ]);

    const systemStatus = {
      bork: {
        provider: 'bork' as const,
        connectionStatus: borkCredentials ? ('connected' as const) : ('disconnected' as const),
        lastSync: borkLatestSync[0]?.date ? new Date(borkLatestSync[0].date) : undefined,
        cronJobs: {
          dailyData: borkDailyCron,
          historicalData: borkHistoricalCron,
          masterData: borkMasterCron,
        },
      },
      eitje: {
        provider: 'eitje' as const,
        connectionStatus: eitjeCredentials ? ('connected' as const) : ('disconnected' as const),
        lastSync: eitjeLatestSync[0]?.date ? new Date(eitjeLatestSync[0].date) : undefined,
        cronJobs: {
          dailyData: eitjeDailyCron,
          historicalData: eitjeHistoricalCron,
          masterData: eitjeMasterCron,
        },
      },
      lastUpdated: new Date(),
    };

    // Store in cache
    const expiresAt = new Date(Date.now() + CACHE_TTL);
    await db.collection('system_status').updateOne(
      { type: 'system_status' },
      {
        $set: {
          data: systemStatus,
          lastUpdated: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: systemStatus,
      cached: false,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /admin/system-status] Error:', error);
    console.error('[API /admin/system-status] Error stack:', error.stack);
    console.error('[API /admin/system-status] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get system status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

