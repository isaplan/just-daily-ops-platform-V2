/**
 * POST /api/admin/update-status-cache
 * 
 * Cron job route to pre-compute all status data
 * Runs every 5 minutes (via Vercel cron)
 * Updates: database stats, system status, integrity checks
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Vercel cron calls with ?action=run-now
    if (action === 'run-now') {
      return await POST(request);
    }

    return NextResponse.json({
      success: true,
      message: 'Use POST method or ?action=run-now to update cache',
    });
  } catch (error: any) {
    console.error('[API /admin/update-status-cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update status cache',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Trigger updates for all status types by calling their endpoints
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   'http://localhost:3000';

    const endpoints = [
      '/api/admin/database-stats',
      '/api/admin/system-status',
      '/api/admin/database-integrity',
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const url = `${baseUrl}${endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Internal call, no need for auth
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update ${endpoint}: ${response.statusText}`);
        }
        
        return await response.json();
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Status cache updated: ${successful} successful, ${failed} failed`,
      results: results.map((r, i) => ({
        endpoint: endpoints[i],
        status: r.status,
        error: r.status === 'rejected' ? (r as PromiseRejectedResult).reason?.message : undefined,
      })),
    });
  } catch (error: any) {
    console.error('[API /admin/update-status-cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update status cache',
      },
      { status: 500 }
    );
  }
}










