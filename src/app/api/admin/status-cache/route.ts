/**
 * GET/POST /api/admin/status-cache
 * 
 * Manages pre-computed status cache
 * GET: Retrieve cached status
 * POST: Update cached status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import type { SystemStatusType } from '@/models/settings/data-status.model';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SystemStatusType | null;

    const db = await getDatabase();

    if (type) {
      // Get specific type
      const cached = await db.collection('system_status').findOne({ type });
      if (!cached) {
        return NextResponse.json({
          success: false,
          error: 'Cache not found for type: ' + type,
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: cached.data,
        lastUpdated: cached.lastUpdated,
        expiresAt: cached.expiresAt,
      });
    } else {
      // Get all cached statuses
      const allCached = await db.collection('system_status')
        .find({})
        .sort({ lastUpdated: -1 })
        .toArray();

      return NextResponse.json({
        success: true,
        data: allCached.map((cached) => ({
          type: cached.type,
          data: cached.data,
          lastUpdated: cached.lastUpdated,
          expiresAt: cached.expiresAt,
        })),
      });
    }
  } catch (error: any) {
    console.error('[API /admin/status-cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get status cache',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, ttl } = body;

    if (!type || !data) {
      return NextResponse.json(
        {
          success: false,
          error: 'type and data are required',
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const ttlMs = (ttl || 5 * 60) * 1000; // Default 5 minutes
    const expiresAt = new Date(Date.now() + ttlMs);

    await db.collection('system_status').updateOne(
      { type },
      {
        $set: {
          data,
          lastUpdated: new Date(),
          expiresAt,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Status cache updated',
      expiresAt,
    });
  } catch (error: any) {
    console.error('[API /admin/status-cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update status cache',
      },
      { status: 500 }
    );
  }
}










