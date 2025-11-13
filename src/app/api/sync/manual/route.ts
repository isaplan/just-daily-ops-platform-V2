import { NextRequest, NextResponse } from 'next/server';
import { createRealDataSyncService, DEFAULT_SYNC_CONFIG } from '@/lib/sync/real-data-sync';

/**
 * REAL DATA SYNC MANUAL TRIGGER ENDPOINT
 * 
 * Triggers immediate manual data synchronization
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /sync/manual] Triggering manual sync...');
    
    const body = await request.json();
    const config = {
      ...DEFAULT_SYNC_CONFIG,
      ...body
    };

    // DEFENSIVE: Create sync service and trigger manual sync
    const syncService = createRealDataSyncService(config);
    const result = await syncService.triggerManualSync();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Manual sync failed',
        details: {
          recordsProcessed: result.recordsProcessed,
          recordsAdded: result.recordsAdded,
          recordsUpdated: result.recordsUpdated,
          errors: result.errors,
          syncTime: result.syncTime
        }
      }, { status: 500 });
    }

    console.log('[API /sync/manual] Manual sync completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Manual sync completed successfully',
      data: {
        recordsProcessed: result.recordsProcessed,
        recordsAdded: result.recordsAdded,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors,
        syncTime: result.syncTime,
        lastSyncDate: result.lastSyncDate,
        nextSyncDate: result.nextSyncDate
      }
    });

  } catch (error) {
    console.error('[API /sync/manual] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger manual sync'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Real data sync manual trigger endpoint',
    usage: 'POST /api/sync/manual to trigger immediate data synchronization'
  });
}

