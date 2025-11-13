import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/progress
 * Get monthly progress for all endpoints
 * 
 * Query params:
 * - year: number (required)
 * - month: number (required)
 * - action: string (default: 'summary') - 'summary' or 'monthly'
 * 
 * Returns: { success: boolean, data: { endpoints: {...}, allProcessed: boolean } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const action = searchParams.get('action') || 'summary';

    const supabase = await createClient();

    // Endpoints to check (only time_registration_shifts for now)
    const endpoints = ['time_registration_shifts'];
    const endpointData: Record<string, any> = {};

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Check each endpoint
    for (const endpoint of endpoints) {
      const tableName = 'eitje_time_registration_shifts_processed_v2';

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
          console.error(`[API /eitje/v2/progress] Error for ${endpoint}:`, result.error);
          endpointData[endpoint] = {
            processedV2Count: 0,
            isProcessed: false,
            lastProcessed: null,
            error: result.error.message
          };
          break;
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

      endpointData[endpoint] = {
        processedV2Count,
        isProcessed: processedV2Count > 0,
        lastProcessed
      };
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

  } catch (error) {
    console.error('[API /eitje/v2/progress] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get progress'
    }, { status: 500 });
  }
}

