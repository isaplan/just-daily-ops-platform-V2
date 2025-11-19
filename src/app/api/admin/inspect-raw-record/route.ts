/**
 * GET /api/admin/inspect-raw-record
 * 
 * Inspect a single raw record to see its structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Get one raw record
    const record = await db.collection('eitje_raw_data')
      .findOne({}, { sort: { createdAt: -1 } });

    if (!record) {
      return NextResponse.json({
        success: false,
        error: 'No raw records found',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date: record.date,
        endpoint: record.endpoint,
        extractedFields: Object.keys(record.extracted || {}),
        extractedSample: Object.fromEntries(
          Object.entries(record.extracted || {}).slice(0, 20)
        ),
        rawApiResponseKeys: Object.keys(record.rawApiResponse || {}),
        rawApiResponseSample: Object.fromEntries(
          Object.entries(record.rawApiResponse || {}).slice(0, 20)
        ),
        // Check for hours/revenue fields specifically
        hoursFields: {
          extracted_hoursWorked: record.extracted?.hoursWorked,
          extracted_hours: record.extracted?.hours,
          extracted_hours_worked: record.extracted?.hours_worked,
          raw_hours_worked: record.rawApiResponse?.hours_worked,
          raw_hours: record.rawApiResponse?.hours,
        },
        revenueFields: {
          extracted_revenue: record.extracted?.revenue,
          raw_revenue: record.rawApiResponse?.revenue,
        },
        wageCostFields: {
          extracted_wageCost: record.extracted?.wageCost,
          extracted_wage_cost: record.extracted?.wage_cost,
          raw_wage_cost: record.rawApiResponse?.wage_cost,
          raw_wageCost: record.rawApiResponse?.wageCost,
        },
      },
    });
  } catch (error: any) {
    console.error('[API /admin/inspect-raw-record] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to inspect record',
      },
      { status: 500 }
    );
  }
}








