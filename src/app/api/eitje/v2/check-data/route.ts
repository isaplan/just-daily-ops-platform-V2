/**
 * GET /api/eitje/v2/check-data
 * Check if data exists for specific months
 * 
 * Query params:
 * - year: number (required)
 * - month: number (optional, if not provided checks all months)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    const db = await getDatabase();

    const results: Record<string, any> = {};

    if (month) {
      // Check specific month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const rawCount = await db.collection('eitje_raw_data').countDocuments({
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });

      const aggregatedCount = await db.collection('eitje_aggregated').countDocuments({
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });

      // Get sample records
      const rawSample = await db.collection('eitje_raw_data')
        .find({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        })
        .limit(1)
        .toArray();

      const aggregatedSample = await db.collection('eitje_aggregated')
        .find({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        })
        .limit(1)
        .toArray();

      results[`${year}-${month}`] = {
        rawCount,
        aggregatedCount,
        hasRawData: rawCount > 0,
        hasAggregatedData: aggregatedCount > 0,
        rawSample: rawSample[0] || null,
        aggregatedSample: aggregatedSample[0] || null
      };
    } else {
      // Check all months for the year
      for (let m = 1; m <= 12; m++) {
        const startOfMonth = new Date(year, m - 1, 1);
        const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);

        const rawCount = await db.collection('eitje_raw_data').countDocuments({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        });

        const aggregatedCount = await db.collection('eitje_aggregated').countDocuments({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        });

        results[`${year}-${m}`] = {
          rawCount,
          aggregatedCount,
          hasRawData: rawCount > 0,
          hasAggregatedData: aggregatedCount > 0
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error: any) {
    console.error('[API /eitje/v2/check-data] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check data'
    }, { status: 500 });
  }
}









