import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/processed-hours
 * Fetch processed_v2 data with pagination and filters
 * 
 * Query params:??
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - environmentId: number (optional)
 * - teamId: number (optional)
 * - teamName: string (optional) - Filter by team name (e.g., "Keuken", "Bediening")
 * - typeName: string (optional) - Filter by type_name (e.g., "verlof", "ziek", "Gewerkte Uren")
 * - userId: number (optional)
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
    const environmentId = searchParams.get('environmentId');
    const teamId = searchParams.get('teamId');
    const teamName = searchParams.get('teamName');
    const typeNameParam = searchParams.get('typeName');
    const typeName = typeNameParam === '' ? null : typeNameParam;
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('[API /eitje/v2/processed-hours] Filters:', {
      startDate,
      endDate,
      environmentId,
      teamId,
      teamName,
      typeName,
      userId,
      page,
      limit
    });

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('*', { count: 'exact' });

    // Apply date filters first (most selective)
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    // Apply team filter before other filters
    if (teamName) {
      // Filter by team name - use exact match (team names should match exactly)
      console.log('[API /eitje/v2/processed-hours] Filtering by team_name:', teamName);
      const trimmedTeamName = teamName.trim();
      query = query.eq('team_name', trimmedTeamName);
      console.log('[API /eitje/v2/processed-hours] Applied team_name filter:', trimmedTeamName);
    }
    
    // Apply other filters
    if (environmentId) {
      query = query.eq('environment_id', parseInt(environmentId, 10));
    }
    if (teamId) {
      query = query.eq('team_id', parseInt(teamId, 10));
    }
    if (typeName !== undefined) {
      if (typeName === null) {
        // Special case: "Gewerkte Uren" - filter for 'gewerkte_uren' (actual value in DB)
        // Also include null/empty as fallback for any records that might not have type_name set
        query = query.or('type_name.eq.gewerkte_uren,type_name.is.null,type_name.eq.');
      } else {
        query = query.eq('type_name', typeName);
      }
    }
    if (userId) {
      query = query.eq('user_id', parseInt(userId, 10));
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by date desc, then user_name
    query = query.order('date', { ascending: false })
                 .order('user_name', { ascending: true });

    // Log the final query for debugging
    console.log('[API /eitje/v2/processed-hours] Executing query with filters:', {
      hasTeamNameFilter: !!teamName,
      teamNameValue: teamName,
      hasTypeNameFilter: typeName !== undefined,
      typeNameValue: typeName,
      dateRange: { startDate, endDate }
    });

    // Diagnostic: Check if data exists with team filter
    if (teamName) {
      const trimmedTeamName = teamName.trim();
      
      // Test 1: Count with team filter
      const { count: teamCount, error: teamError } = await supabase
        .from('eitje_time_registration_shifts_processed_v2')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate || '1900-01-01')
        .lte('date', endDate || '2100-12-31')
        .eq('team_name', trimmedTeamName);
      
      // Test 2: Count without team filter (to see total in date range)
      const { count: totalCount, error: totalError } = await supabase
        .from('eitje_time_registration_shifts_processed_v2')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate || '1900-01-01')
        .lte('date', endDate || '2100-12-31');
      
      // Test 3: Get sample team names in date range
      const { data: sampleTeams } = await supabase
        .from('eitje_time_registration_shifts_processed_v2')
        .select('team_name')
        .gte('date', startDate || '1900-01-01')
        .lte('date', endDate || '2100-12-31')
        .not('team_name', 'is', null)
        .limit(10);
      
      const uniqueTeams = Array.from(new Set(sampleTeams?.map(r => r.team_name) || [])).sort();
      
      console.log('[API /eitje/v2/processed-hours] Diagnostic results:', {
        teamName: trimmedTeamName,
        countWithTeamFilter: teamCount,
        totalCountInDateRange: totalCount,
        teamFilterError: teamError?.message,
        totalCountError: totalError?.message,
        sampleTeamNamesInRange: uniqueTeams,
        teamNameExists: uniqueTeams.includes(trimmedTeamName)
      });
    }

    const { data: records, error, count } = await query;

    if (error) {
      console.error('[API /eitje/v2/processed-hours] Query error:', error);
      console.error('[API /eitje/v2/processed-hours] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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

    console.log('[API /eitje/v2/processed-hours] Query result:', {
      recordsCount: records?.length || 0,
      total,
      page,
      totalPages,
      hasRecords: (records?.length || 0) > 0,
      sampleTeamNames: records?.slice(0, 5).map((r: { team_name: string | null }) => r.team_name),
      sampleDates: records?.slice(0, 5).map((r: { date: string | null }) => r.date),
      appliedFilters: {
        teamName,
        typeName,
        startDate,
        endDate
      }
    });

    const response = {
      success: true,
      records: records || [],
      total,
      page,
      totalPages
    };

    console.log('[API /eitje/v2/processed-hours] Returning response:', {
      success: response.success,
      recordsCount: response.records.length,
      total: response.total,
      page: response.page,
      totalPages: response.totalPages
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /eitje/v2/processed-hours] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch processed hours',
      records: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 500 });
  }
}

