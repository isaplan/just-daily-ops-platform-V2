/**
 * GET /api/admin/login-history
 * 
 * Returns paginated login history
 * Uses database-level pagination for performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Test database connection first
    const db = await getDatabase();
    await db.admin().ping(); // Test connection

    // Check if login_history collection exists, if not return empty
    const collections = await db.listCollections({ name: 'login_history' }).toArray();
    if (collections.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          records: [],
          total: 0,
          page: 1,
          limit,
          totalPages: 0,
        },
      });
    }

    // Get total count and records in parallel (database-level pagination)
    const [records, total] = await Promise.all([
      db.collection('login_history')
        .find({})
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('login_history').countDocuments({}),
    ]);

    // Format records
    const formattedRecords = records.map((record: any) => ({
      _id: record._id.toString(),
      userId: record.userId?.toString(),
      userEmail: record.userEmail,
      userName: record.userName,
      timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      success: record.success !== false, // Default to true if not specified
    }));

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[API /admin/login-history] Error:', error);
    console.error('[API /admin/login-history] Error stack:', error.stack);
    console.error('[API /admin/login-history] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get login history',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

