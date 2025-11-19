/**
 * GET /api/admin/inspect-revenue-record
 * 
 * Inspect a revenue_days record to see its structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get one revenue_days record
    const record = await db.collection('eitje_raw_data')
      .findOne({ endpoint: 'revenue_days' }, { sort: { createdAt: -1 } });

    if (!record) {
      return NextResponse.json({
        success: false,
        error: 'No revenue_days records found',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date: record.date,
        endpoint: record.endpoint,
        environmentId: record.environmentId,
        locationId: record.locationId,
        extractedFields: Object.keys(record.extracted || {}),
        extractedSample: Object.fromEntries(
          Object.entries(record.extracted || {}).slice(0, 30)
        ),
        rawApiResponseKeys: Object.keys(record.rawApiResponse || {}),
        rawApiResponseSample: record.rawApiResponse,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/inspect-revenue-record] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to inspect revenue record',
      },
      { status: 500 }
    );
  }
}








