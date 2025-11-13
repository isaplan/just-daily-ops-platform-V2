import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Check status of a specific endpoint for a specific month
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

    const supabase = await createClient();
    
    // Get table names
    const tableMap: Record<string, string> = {
      'environments': 'eitje_environments',
      'teams': 'eitje_teams',
      'users': 'eitje_users',
      'shift_types': 'eitje_shift_types',
      'time_registration_shifts': 'eitje_time_registration_shifts_raw',
      'planning_shifts': 'eitje_planning_shifts_raw',
      'revenue_days': 'eitje_revenue_days_raw'
    };

    const rawTableName = tableMap[endpoint];
    if (!rawTableName) {
      return NextResponse.json({
        success: false,
        error: `Unknown endpoint: ${endpoint}`
      }, { status: 400 });
    }

    // Check raw data count for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    // For master data, check by created_at. For data endpoints, check by date field
    const isMasterData = ['environments', 'teams', 'users', 'shift_types'].includes(endpoint);
    
    let rawData;
    let rawError;

    if (isMasterData) {
      // Master data: count all records with pagination
      let allMasterData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const result = await supabase
          .from(rawTableName)
          .select('id, created_at')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (result.error) {
          rawError = result.error;
          break;
        }

        if (result.data && result.data.length > 0) {
          allMasterData = [...allMasterData, ...result.data];
          page++;
          hasMore = result.data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      rawData = allMasterData;
    } else {
      // Data endpoints: filter by date field with pagination to get accurate count
      let allRawData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const result = await supabase
          .from(rawTableName)
          .select('id, created_at, date, raw_data')
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0])
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (result.error) {
          rawError = result.error;
          break;
        }

        if (result.data && result.data.length > 0) {
          allRawData = [...allRawData, ...result.data];
          page++;
          hasMore = result.data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      rawData = allRawData;
    }

    if (rawError) {
      return NextResponse.json({
        success: false,
        error: `Failed to check raw data: ${rawError.message}`
      }, { status: 500 });
    }

    const rawDataCount = rawData?.length || 0;
    const lastSync = isMasterData && rawDataCount > 0 
      ? rawData[0]?.created_at 
      : (rawData && rawData.length > 0 ? rawData[rawData.length - 1].created_at : null);

    // Check aggregated data count (only for data endpoints, not master data)
    let aggregatedDataCount = 0;
    
    if (!isMasterData) {
      const aggregatedTableMap: Record<string, string> = {
        'time_registration_shifts': 'eitje_labor_hours_aggregated',
        'planning_shifts': 'eitje_planning_hours_aggregated',
        'revenue_days': 'eitje_revenue_days_aggregated'
      };

      const aggregatedTableName = aggregatedTableMap[endpoint];
      if (aggregatedTableName) {
        // Use pagination for aggregated data count as well
        let allAggregatedData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const result = await supabase
            .from(aggregatedTableName)
            .select('id, date')
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0])
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (result.error) {
            break;
          }

          if (result.data && result.data.length > 0) {
            allAggregatedData = [...allAggregatedData, ...result.data];
            page++;
            hasMore = result.data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        aggregatedDataCount = allAggregatedData.length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        endpoint,
        year,
        month,
        rawDataCount,
        aggregatedDataCount,
        lastSync,
        isMasterData,
        hasRawData: rawDataCount > 0,
        hasAggregatedData: aggregatedDataCount > 0
      }
    });

  } catch (error) {
    console.error('[API /eitje/endpoint-status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check endpoint status'
    }, { status: 500 });
  }
}
