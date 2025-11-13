import { NextRequest, NextResponse } from 'next/server';
import { createRealDataSyncService, DEFAULT_SYNC_CONFIG } from '@/lib/sync/real-data-sync';

/**
 * REAL DATA SYNC STATUS ENDPOINT
 * 
 * Returns current synchronization status and statistics
 */

export async function GET() {
  try {
    console.log('[API /sync/status] Getting sync status...');
    
    // DEFENSIVE: Create sync service and get status
    const syncService = createRealDataSyncService(DEFAULT_SYNC_CONFIG);
    const status = syncService.getSyncStatus();

    // DEFENSIVE: Get additional statistics
    const stats = {
      isRunning: status.isRunning,
      lastSyncTime: status.lastSyncTime?.toISOString() || null,
      config: status.config,
      uptime: status.lastSyncTime ? 
        Math.floor((Date.now() - status.lastSyncTime.getTime()) / 1000) : null,
      nextSyncIn: status.isRunning && status.lastSyncTime ? 
        Math.max(0, status.config.interval * 60 - Math.floor((Date.now() - status.lastSyncTime.getTime()) / 1000)) : null
    };

    console.log('[API /sync/status] Status retrieved:', stats);

    return NextResponse.json({
      success: true,
      status: stats,
      message: status.isRunning ? 
        'Real data synchronization is active' : 
        'Real data synchronization is not running'
    });

  } catch (error) {
    console.error('[API /sync/status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}
