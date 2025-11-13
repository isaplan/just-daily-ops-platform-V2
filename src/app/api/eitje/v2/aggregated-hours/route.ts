import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/aggregated-hours
 * Fetch aggregated_v2 data with pagination and filters
 * 
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - userId: number (optional)
 * - environmentId: number (optional)
 * - teamId: number (optional)
 * - teamName: string (optional) - Filter by team name
 * - typeName: string (optional) - Filter by type_name (e.g., "verlof", "ziek", null for "Gewerkte Uren")
 * - page: number (default: 1)
 * - limit: number (default: 50)
 * 
 * Returns: { records: [...], total: number, page: number, totalPages: number }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const environmentId = searchParams.get('environmentId');
    const teamId = searchParams.get('teamId');
    const teamName = searchParams.get('teamName');
    const typeNameParam = searchParams.get('typeName');
    const typeName = typeNameParam === '' ? null : typeNameParam;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('[API /eitje/v2/aggregated-hours] Filters:', {
      startDate,
      endDate,
      userId,
      environmentId,
      teamId,
      teamName,
      typeName,
      page,
      limit
    });

    const supabase = await createClient();

    // Build query - we need to filter by checking processed_v2 records
    // because aggregated_v2 doesn't have type_name column
    // We'll use a subquery to filter aggregated records that have matching type_name in processed_v2
    
    let query = supabase
      .from('eitje_hours_aggregated_v2')
      .select('*', { count: 'exact' });

    // Apply basic filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (userId) {
      query = query.eq('user_id', parseInt(userId, 10));
    }
    if (environmentId) {
      query = query.eq('environment_id', parseInt(environmentId, 10));
    }
    if (teamId) {
      query = query.eq('team_id', parseInt(teamId, 10));
    }
    if (teamName) {
      const trimmedTeamName = teamName.trim();
      query = query.eq('team_name', trimmedTeamName);
    }

    // Apply type_name filter by checking processed_v2 table
    // Since aggregated_v2 doesn't have type_name, we need to filter based on
    // whether the aggregated record has ALL processed records with matching type_name
    // NOTE: This is a complex filter that requires checking processed_v2 for each aggregated record
    // For performance, we'll use a simpler approach: get all matching keys first, then filter
    if (typeName !== undefined) {
      console.log('[API /eitje/v2/aggregated-hours] Applying type_name filter:', typeName);
      
      // Get all unique aggregated keys (date, user_id, environment_id, team_id) from processed_v2
      // where ALL records match the type_name filter
      // We'll use a single query with GROUP BY to find keys where ALL records match
      
      let processedFilterQuery = supabase
        .from('eitje_time_registration_shifts_processed_v2')
        .select('date, user_id, environment_id, team_id, type_name')
        .not('user_id', 'is', null);

      // Apply date filters
      if (startDate) {
        processedFilterQuery = processedFilterQuery.gte('date', startDate);
      }
      if (endDate) {
        processedFilterQuery = processedFilterQuery.lte('date', endDate);
      }

      // Apply other filters to processed query
      if (userId) {
        processedFilterQuery = processedFilterQuery.eq('user_id', parseInt(userId, 10));
      }
      if (environmentId) {
        processedFilterQuery = processedFilterQuery.eq('environment_id', parseInt(environmentId, 10));
      }
      if (teamId) {
        processedFilterQuery = processedFilterQuery.eq('team_id', parseInt(teamId, 10));
      }
      if (teamName) {
        const trimmedTeamName = teamName.trim();
        processedFilterQuery = processedFilterQuery.eq('team_name', trimmedTeamName);
      }

      // Get processed records in the date range (with filters applied)
      // Limit to 10000 records to prevent timeout (should be enough for most date ranges)
      processedFilterQuery = processedFilterQuery.limit(10000);
      const { data: allProcessedRecords, error: processedError } = await processedFilterQuery;

      if (processedError) {
        console.error('[API /eitje/v2/aggregated-hours] Error fetching processed records:', processedError);
        // Continue without type filter if there's an error
      } else if (allProcessedRecords && allProcessedRecords.length > 0) {
        // Group by aggregated key and check if ALL records for each key match
        const keysMap = new Map<string, { date: string; user_id: number; environment_id: number | null; team_id: number | null; typeNames: string[] }>();

        // Group all processed records by their aggregated key
        for (const record of allProcessedRecords) {
          const key = `${record.date}-${record.user_id}-${record.environment_id || 'null'}-${record.team_id || 'null'}`;
          if (!keysMap.has(key)) {
            keysMap.set(key, {
              date: record.date,
              user_id: record.user_id,
              environment_id: record.environment_id,
              team_id: record.team_id,
              typeNames: []
            });
          }
          keysMap.get(key)!.typeNames.push(record.type_name || '');
        }

        // Filter keys where ALL type_names match the filter
        const matchingKeys = new Set<string>();
        for (const [key, keyData] of keysMap.entries()) {
          let allMatch = true;
          for (const typeNameValue of keyData.typeNames) {
            if (typeName === null) {
              // "Gewerkte Uren" - exclude if type_name is verlof, ziek, etc.
              if (typeNameValue !== null && typeNameValue !== '' && typeNameValue !== 'gewerkte_uren') {
                allMatch = false;
                break;
              }
            } else {
              // Specific type - must match exactly
              if (typeNameValue !== typeName) {
                allMatch = false;
                break;
              }
            }
          }
          if (allMatch) {
            matchingKeys.add(key);
          }
        }

        // Filter aggregated query to only include matching keys
        if (matchingKeys.size > 0) {
          console.log('[API /eitje/v2/aggregated-hours] Found', matchingKeys.size, 'matching aggregated keys');
          
          // Fetch all aggregated records (with basic filters), then filter by matching keys
          query = query.range(0, 999999); // Get all for filtering
          const { data: allAggregatedRecords, error: fetchError } = await query;
          
          if (fetchError) {
            throw fetchError;
          }

          // Filter to only include records with matching keys
          interface AggregatedRecord {
            date: string;
            user_id: number;
            environment_id: number | null;
            team_id: number | null;
            [key: string]: unknown;
          }
          
          const filteredRecords = (allAggregatedRecords || []).filter((record: AggregatedRecord) => {
            const key = `${record.date}-${record.user_id}-${record.environment_id || 'null'}-${record.team_id || 'null'}`;
            return matchingKeys.has(key);
          });

          // Apply pagination
          const from = (page - 1) * limit;
          const to = from + limit;
          const paginatedRecords = filteredRecords.slice(from, to);
          const total = filteredRecords.length;
          const totalPages = Math.ceil(total / limit);

          console.log('[API /eitje/v2/aggregated-hours] Filtered results:', {
            totalRecords: allAggregatedRecords?.length || 0,
            filteredCount: filteredRecords.length,
            paginatedCount: paginatedRecords.length,
            typeNameFilter: typeName
          });

          return NextResponse.json({
            success: true,
            records: paginatedRecords,
            total,
            page,
            totalPages
          });
        } else {
          // No matching keys found
          console.log('[API /eitje/v2/aggregated-hours] No matching keys found for type_name filter');
          return NextResponse.json({
            success: true,
            records: [],
            total: 0,
            page,
            totalPages: 0
          });
        }
      } else {
        // No processed records found
        console.log('[API /eitje/v2/aggregated-hours] No processed records found for type_name filter');
        return NextResponse.json({
          success: true,
          records: [],
          total: 0,
          page,
          totalPages: 0
        });
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by date desc, then user_name
    query = query.order('date', { ascending: false })
                 .order('user_name', { ascending: true });

    const { data: records, error, count } = await query;

    if (error) {
      console.error('[API /eitje/v2/aggregated-hours] Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        records: [],
        total: 0,
        page: 1,
        totalPages: 0
      }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      records: records || [],
      total,
      page,
      totalPages
    });

  } catch (error) {
    console.error('[API /eitje/v2/aggregated-hours] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch aggregated hours',
      records: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 500 });
  }
}

