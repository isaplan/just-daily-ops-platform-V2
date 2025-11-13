import { NextRequest, NextResponse } from 'next/server';
import { createRealDataSyncService, DEFAULT_SYNC_CONFIG } from '@/lib/sync/real-data-sync';

/**
 * REAL DATA SYNC STOP ENDPOINT
 * 
 * Stops real-time data synchronization
 */

export async function POST() {
  try {
    console.log('[API /sync/stop] Stopping real data synchronization...');
    
    // DEFENSIVE: Create sync service and stop
    const syncService = createRealDataSyncService(DEFAULT_SYNC_CONFIG);
    const result = await syncService.stopSync();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }

    console.log('[API /sync/stop] Real data sync stopped successfully');

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('[API /sync/stop] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to stop real data synchronization'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Real data sync stop endpoint',
    usage: 'POST /api/sync/stop to stop data synchronization'
  });
}
