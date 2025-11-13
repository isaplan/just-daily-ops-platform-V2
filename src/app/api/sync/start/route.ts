import { NextRequest, NextResponse } from 'next/server';
import { createRealDataSyncService, DEFAULT_SYNC_CONFIG } from '@/lib/sync/real-data-sync';

/**
 * REAL DATA SYNC START ENDPOINT
 * 
 * Starts real-time data synchronization with Eitje API
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /sync/start] Starting real data synchronization...');
    
    const body = await request.json();
    const config = {
      ...DEFAULT_SYNC_CONFIG,
      ...body,
      enabled: true
    };

    // DEFENSIVE: Validate configuration
    if (config.interval < 1 || config.interval > 1440) {
      return NextResponse.json({
        success: false,
        error: 'Invalid interval: Must be between 1 and 1440 minutes'
      }, { status: 400 });
    }

    if (config.batchSize < 1 || config.batchSize > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Invalid batchSize: Must be between 1 and 1000'
      }, { status: 400 });
    }

    // DEFENSIVE: Create and start sync service
    const syncService = createRealDataSyncService(config);
    const result = await syncService.startSync();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }

    console.log('[API /sync/start] Real data sync started successfully');

    return NextResponse.json({
      success: true,
      message: result.message,
      config: {
        interval: config.interval,
        batchSize: config.batchSize,
        retryAttempts: config.retryAttempts,
        timeout: config.timeout,
        validateData: config.validateData
      }
    });

  } catch (error) {
    console.error('[API /sync/start] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start real data synchronization'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Real data sync start endpoint',
    endpoints: {
      'POST /api/sync/start': 'Start real-time data synchronization',
      'POST /api/sync/stop': 'Stop data synchronization',
      'GET /api/sync/status': 'Get sync status',
      'POST /api/sync/manual': 'Trigger manual sync'
    }
  });
}

