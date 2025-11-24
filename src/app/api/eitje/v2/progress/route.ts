/**
 * GET /api/eitje/v2/progress
 * Get monthly progress for all endpoints (MongoDB V2)
 * 
 * Query params:
 * - year: number (required)
 * - month: number (required)
 * 
 * Returns: { success: boolean, data: { endpoints: {...}, allProcessed: boolean } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const db = await getDatabase();

    // Endpoints to check (only time_registration_shifts for now)
    const endpoints = ['time_registration_shifts'];
    const endpointData: Record<string, any> = {};

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Check each endpoint
    for (const endpoint of endpoints) {
      try {
        // For V2, check eitje_aggregated collection (processed data)
        // This represents data that has been processed and aggregated
        const processedCount = await db.collection('eitje_aggregated').countDocuments({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        });

        // Get the latest processed record for this month
        const lastProcessed = await db.collection('eitje_aggregated')
          .findOne(
            {
              date: {
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            },
            {
              sort: { createdAt: -1 },
              projection: { createdAt: 1 }
            }
          );

        endpointData[endpoint] = {
          processedV2Count: processedCount,
          isProcessed: processedCount > 0,
          lastProcessed: lastProcessed?.createdAt ? new Date(lastProcessed.createdAt).toISOString() : null
        };
      } catch (error: any) {
        console.error(`[API /eitje/v2/progress] Error for ${endpoint}:`, error);
        endpointData[endpoint] = {
          processedV2Count: 0,
          isProcessed: false,
          lastProcessed: null,
          error: error.message
        };
      }
    }

    // Check if all endpoints are processed
    const allProcessed = Object.values(endpointData).every(
      (data: any) => data.isProcessed === true
    );

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        endpoints: endpointData,
        allProcessed
      }
    });

  } catch (error: any) {
    console.error('[API /eitje/v2/progress] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get progress'
    }, { status: 500 });
  }
}











