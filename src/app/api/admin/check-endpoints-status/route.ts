/**
 * GET /api/admin/check-endpoints-status
 * 
 * Check which Eitje API endpoints are connected and processed
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { EITJE_ENDPOINTS } from '@/lib/eitje/v2-types';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get all available endpoints from types
    const availableEndpoints = Object.values(EITJE_ENDPOINTS).map(path => path.replace('/', ''));

    // Check which endpoints have data in MongoDB
    const endpointsWithData = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          firstRecord: { $min: '$createdAt' },
          lastRecord: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    // Check which endpoints are supported in sync route
    const supportedInSync = [
      'environments',
      'teams',
      'users',
      'shift_types',
      'time_registration_shifts',
      'planning_shifts',
      'revenue_days',
      'availability_shifts',
      'leave_requests',
      'events',
    ];
    
    // Check which endpoints are processed in aggregate route (only date-based endpoints)
    const processedInAggregate = ['time_registration_shifts', 'revenue_days'];
    
    // Master data endpoints don't need aggregation
    const masterDataEndpoints = ['environments', 'teams', 'users', 'shift_types'];

    const endpointStatus = availableEndpoints.map((endpoint) => {
      const dataInfo = endpointsWithData.find((e) => e._id === endpoint);
      const hasData = !!dataInfo;
      const isSupportedInSync = supportedInSync.includes(endpoint);
      const isProcessedInAggregate = processedInAggregate.includes(endpoint);
      const isMasterData = masterDataEndpoints.includes(endpoint);

      // Master data endpoints are "fully_connected" if they're synced (no aggregation needed)
      // Date-based endpoints need both sync and aggregation
      let status: string;
      if (isMasterData) {
        status = hasData && isSupportedInSync ? 'fully_connected' : isSupportedInSync ? 'supported_not_synced' : 'not_connected';
      } else {
        status = hasData && isSupportedInSync && isProcessedInAggregate 
          ? 'fully_connected' 
          : hasData && isSupportedInSync 
          ? 'synced_not_aggregated'
          : isSupportedInSync 
          ? 'supported_not_synced'
          : 'not_connected';
      }

      return {
        endpoint,
        available: true,
        hasData,
        recordCount: dataInfo?.count || 0,
        firstRecord: dataInfo?.firstRecord ? new Date(dataInfo.firstRecord).toISOString() : null,
        lastRecord: dataInfo?.lastRecord ? new Date(dataInfo.lastRecord).toISOString() : null,
        supportedInSync: isSupportedInSync,
        processedInAggregate: isProcessedInAggregate,
        isMasterData,
        status,
      };
    });

    // Summary
    const summary = {
      totalAvailable: availableEndpoints.length,
      fullyConnected: endpointStatus.filter((e) => e.status === 'fully_connected').length,
      syncedNotAggregated: endpointStatus.filter((e) => e.status === 'synced_not_aggregated').length,
      supportedNotSynced: endpointStatus.filter((e) => e.status === 'supported_not_synced').length,
      notConnected: endpointStatus.filter((e) => e.status === 'not_connected').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        endpoints: endpointStatus,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-endpoints-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check endpoints status',
      },
      { status: 500 }
    );
  }
}

