import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/worker-profiles
 * Fetch worker profiles with pagination and filters
 * 
 * Query params:
 * - locationId: UUID (optional)
 * - eitjeUserId: number (optional)
 * - activeOnly: boolean (optional, default: false)
 * - page: number (default: 1)
 * - limit: number (default: 50)
 * 
 * Returns: { records: [...], total: number, page: number, totalPages: number }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const eitjeUserId = searchParams.get('eitjeUserId');
    const teamName = searchParams.get('teamName');
    const activeOnlyParam = searchParams.get('activeOnly');
    const activeOnly = activeOnlyParam === 'true';
    const inactiveOnly = activeOnlyParam === 'false';
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const dayParam = searchParams.get('day');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('worker_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    // locationId can be:
    // - "env_<name>" (environment name filter)
    // - location name (string, not UUID) - we'll filter by environment_name
    // - UUID (legacy, but we'll handle it)
    const isEnvironmentFilter = locationId && locationId.startsWith('env_');
    const isLocationNameFilter = locationId && !isEnvironmentFilter && !locationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    if (locationId && !isEnvironmentFilter && !isLocationNameFilter) {
      // Filter by unified location_id (UUID)
      query = query.eq('location_id', locationId);
    }
    if (eitjeUserId) {
      query = query.eq('eitje_user_id', parseInt(eitjeUserId, 10));
    }
    // Filter by year/month/day based on contract effective dates
    // Show workers who had a contract active during the selected period
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    
    if (yearParam || monthParam || dayParam) {
      const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
      const month = monthParam ? parseInt(monthParam, 10) : null;
      const day = dayParam ? parseInt(dayParam, 10) : null;

      if (day && month) {
        // Filter by specific day
        periodStart = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        periodEnd = periodStart;
      } else if (month) {
        // Filter by month
        periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else if (year) {
        // Filter by year
        periodStart = `${year}-01-01`;
        periodEnd = `${year}-12-31`;
      }

      if (periodStart && periodEnd) {
        // Contract was active during this period if:
        // effective_from <= periodEnd AND (effective_to >= periodStart OR effective_to IS NULL)
        query = query.lte('effective_from', periodEnd);
        query = query.or(`effective_to.gte.${periodStart},effective_to.is.null`);
      }
    }

    // Active/Inactive filter - use is_active column (updated weekly via cronjob)
    // is_active is based on: effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    if (activeOnly || inactiveOnly) {
      if (activeOnly) {
        // Active: is_active = true
        query = query.eq('is_active', true);
      } else if (inactiveOnly) {
        // Inactive: is_active = false
        query = query.eq('is_active', false);
      }
    }
    
    // Debug logging
    console.log('[API /eitje/v2/worker-profiles] Filters:', {
      activeOnlyParam,
      activeOnly,
      inactiveOnly,
      locationId,
      teamName,
      eitjeUserId,
      yearParam,
      monthParam,
      dayParam
    });

    // For environment filter, location name filter, or team filter (which matches by team_name),
    // we need to get ALL records first, then filter after enrichment
    // For simple filters (eitjeUserId, activeOnly, location UUID), we can paginate at database level
    // If locationId is provided and it's a name (not UUID), we need post-filtering
    const needsPostFilter = isEnvironmentFilter || isLocationNameFilter || (locationId && !isEnvironmentFilter && !locationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) || (teamName && teamName !== 'all');
    
    if (!needsPostFilter) {
      // Apply pagination at database level for simple filters
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data: records, error, count } = await query;

    if (error) {
      console.error('[API /eitje/v2/worker-profiles] Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        records: [],
        total: 0,
        page: 1,
        totalPages: 0
      }, { status: 500 });
    }

    // Get location name for filtering
    // If locationId is a name (not UUID), use it directly
    // If locationId is a UUID, try to get the name from locations table
    let locationNameForFilter = null;
    if (locationId && !isEnvironmentFilter) {
      if (isLocationNameFilter) {
        // locationId is already the location name
        locationNameForFilter = locationId;
      } else {
        // locationId is a UUID, try to get name from locations table
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();
        locationNameForFilter = locationData?.name || null;
      }
    }

    // Enrich records with user_name, team_name, location_name from processed_v2
    // Location: Use unified locations table if available, otherwise fallback to environment_name
    const enrichedRecords = await Promise.all((records || []).map(async (profile: { eitje_user_id: number; location_id: string | null }) => {
      // Get user name, team name, and environment name from processed_v2 (most recent)
      const { data: userData } = await supabase
        .from('eitje_time_registration_shifts_processed_v2')
        .select('user_name, team_name, environment_name')
        .eq('user_id', profile.eitje_user_id)
        .not('user_name', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get location name from unified locations table if location_id exists
      let locationName = null;
      if (profile.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', profile.location_id)
          .single();
        locationName = locationData?.name || null;
      }
      
      // Fallback to environment_name if location_name is not available
      // (temporary until unified locations are fully set up)
      if (!locationName && userData?.environment_name) {
        locationName = userData.environment_name;
      }

      return {
        ...profile,
        user_name: userData?.user_name || `User ${profile.eitje_user_id}`,
        team_name: userData?.team_name || null,
        location_name: locationName,
        environment_name: userData?.environment_name || null
      };
    }));

    // Filter by location - must happen after enrichment since we match by environment_name
    type EnrichedRecord = typeof enrichedRecords[0];
    let filteredRecords: EnrichedRecord[] = enrichedRecords;
    
    if (locationId && locationId !== 'all') {
      let filterName: string;
      
      if (isEnvironmentFilter) {
        // Remove "env_" prefix
        filterName = locationId.replace('env_', '').toLowerCase().trim();
      } else if (locationNameForFilter) {
        // Use the looked-up location name
        filterName = locationNameForFilter.toLowerCase().trim();
      } else {
        // Direct location name (not UUID, not env_ prefix) - e.g., "Van Kinsbergen"
        filterName = locationId.toLowerCase().trim();
      }
      
      // Filter by exact match on environment_name or location_name
      filteredRecords = enrichedRecords.filter((record: EnrichedRecord) => {
        const recordLocationName = record.location_name?.toLowerCase().trim() || '';
        const recordEnvironmentName = record.environment_name?.toLowerCase().trim() || '';
        // Exact match required - no partial matches
        return recordLocationName === filterName || recordEnvironmentName === filterName;
      });
      
      console.log('[API /eitje/v2/worker-profiles] Location filter applied:', {
        locationId,
        filterName,
        beforeFilter: enrichedRecords.length,
        afterFilter: filteredRecords.length,
        sampleRecords: filteredRecords.slice(0, 3).map(r => ({
          id: r.eitje_user_id,
          location_name: r.location_name,
          environment_name: r.environment_name
        }))
      });
    }
    
    // Apply team filter if provided
    if (teamName && teamName !== 'all') {
      const trimmedTeamName = teamName.trim();
      filteredRecords = filteredRecords.filter((record: EnrichedRecord) => 
        record.team_name && record.team_name.trim() === trimmedTeamName
      );
    }

    // Update total count if we filtered after enrichment
    const total = needsPostFilter 
      ? filteredRecords.length 
      : count || 0;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination to filtered records if post-filtering was used
    let paginatedRecords = filteredRecords;
    if (needsPostFilter) {
      const from = (page - 1) * limit;
      const to = from + limit;
      paginatedRecords = filteredRecords.slice(from, to);
    }

    return NextResponse.json({
      success: true,
      records: paginatedRecords,
      total,
      page,
      totalPages
    });

  } catch (error) {
    console.error('[API /eitje/v2/worker-profiles] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch worker profiles',
      records: [],
      total: 0,
      page: 1,
      totalPages: 0
    }, { status: 500 });
  }
}

/**
 * POST /api/eitje/v2/worker-profiles
 * Create new worker profile
 * 
 * Body: {
 *   eitje_user_id: number,
 *   location_id: UUID (optional),
 *   contract_type: string (optional),
 *   contract_hours: number (optional),
 *   hourly_wage: number (optional),
 *   wage_override: boolean (optional, default: false),
 *   effective_from: DATE (optional),
 *   effective_to: DATE (optional),
 *   notes: string (optional)
 * }
 * 
 * Returns: { success: boolean, data: {...}, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eitje_user_id,
      location_id,
      contract_type,
      contract_hours,
      hourly_wage,
      wage_override = false,
      effective_from,
      effective_to,
      notes
    } = body;

    // Validate required fields
    if (!eitje_user_id) {
      return NextResponse.json({
        success: false,
        error: 'eitje_user_id is required'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Insert new profile
    const { data, error } = await supabase
      .from('worker_profiles')
      .insert({
        eitje_user_id,
        location_id: location_id || null,
        contract_type: contract_type || null,
        contract_hours: contract_hours || null,
        hourly_wage: hourly_wage || null,
        wage_override,
        effective_from: effective_from || null,
        effective_to: effective_to || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('[API /eitje/v2/worker-profiles] Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[API /eitje/v2/worker-profiles] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create worker profile'
    }, { status: 500 });
  }
}

