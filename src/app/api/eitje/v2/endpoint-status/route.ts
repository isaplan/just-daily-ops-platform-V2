import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/endpoint-status
 * Check processed_v2 status for endpoint/month
 * 
 * Query params:
 * - endpoint: string (required) - 'time_registration_shifts'
 * - year: number (required)
 * - month: number (required)
 * 
 * Returns: { success: boolean, data: { processedV2Count, hasProcessedV2, lastProcessed } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: 'endpoint parameter is required'
      }, { status: 400 });
    }

    // Map endpoint to V2 table
    const tableMap: Record<string, string> = {
      'time_registration_shifts': 'eitje_time_registration_shifts_processed_v2'
    };

    const tableName = tableMap[endpoint];
    if (!tableName) {
      return NextResponse.json({
        success: false,
        error: `Unknown endpoint: ${endpoint}`
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Count records in processed_v2 for this month
    let allProcessedData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const result = await supabase
        .from(tableName)
        .select('id, date, created_at')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (result.error) {
        console.error('[API /eitje/v2/endpoint-status] Error:', result.error);
        return NextResponse.json({
          success: false,
          error: `Failed to check processed_v2: ${result.error.message}`
        }, { status: 500 });
      }

      if (result.data && result.data.length > 0) {
        allProcessedData = [...allProcessedData, ...result.data];
        page++;
        hasMore = result.data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const processedV2Count = allProcessedData.length;
    const lastProcessed = allProcessedData.length > 0
      ? allProcessedData[allProcessedData.length - 1].created_at
      : null;

    return NextResponse.json({
      success: true,
      data: {
        endpoint,
        year,
        month,
        processedV2Count,
        hasProcessedV2: processedV2Count > 0,
        lastProcessed
      }
    });

  } catch (error) {
    console.error('[API /eitje/v2/endpoint-status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check endpoint status'
    }, { status: 500 });
  }
}

