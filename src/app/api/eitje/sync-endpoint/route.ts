import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjeRevenueDays,
  getEitjeCredentials
} from '@/lib/eitje/api-service';

/**
 * EITJE ENDPOINT SYNC API
 * 
 * Syncs data from individual Eitje API endpoints to database
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/sync-endpoint] Endpoint sync request received');
    
    const body = await request.json();
    const { 
      endpoint,
      startDate = '2024-10-24', 
      endDate = '2024-10-25',
      batchSize = 100
    } = body;

    // DEFENSIVE: Validate required parameters
    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: endpoint is required'
      }, { status: 400 });
    }

    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();

    // DEFENSIVE: Fetch data from the specific endpoint using simple functions
    const startTime = Date.now();
    let data;

    try {
      console.log(`[API /eitje/sync-endpoint] Fetching data for endpoint: ${endpoint}`);
      
      // Use simple function calls based on endpoint
      switch (endpoint) {
        case 'environments':
          data = await fetchEitjeEnvironments(baseUrl, credentials);
          break;
        case 'teams':
          data = await fetchEitjeTeams(baseUrl, credentials);
          break;
        case 'users':
          data = await fetchEitjeUsers(baseUrl, credentials);
          break;
        case 'shift_types':
          data = await fetchEitjeShiftTypes(baseUrl, credentials);
          break;
        case 'time_registration_shifts':
          data = await fetchEitjeTimeRegistrationShifts(baseUrl, credentials, startDate, endDate);
          break;
        // case 'planning_shifts': // NOT NEEDED - Commented out per user request
        //   data = await fetchEitjePlanningShifts(baseUrl, credentials, startDate, endDate);
        //   break;
        case 'revenue_days':
          data = await fetchEitjeRevenueDays(baseUrl, credentials, startDate, endDate);
          break;
        // NEW ENDPOINTS - Commented out as functions are not yet implemented
        // case 'availability_shifts':
        //   data = await fetchEitjeAvailabilityShifts(baseUrl, credentials, startDate, endDate);
        //   break;
        // case 'leave_requests':
        //   data = await fetchEitjeLeaveRequests(baseUrl, credentials, startDate, endDate);
        //   break;
        // case 'events':
        //   data = await fetchEitjeEvents(baseUrl, credentials, startDate, endDate);
        //   break;
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown endpoint: ${endpoint}`
          }, { status: 400 });
      }
      
      console.log(`[API /eitje/sync-endpoint] Data fetch result for ${endpoint}:`, {
        hasData: !!data,
        dataLength: Array.isArray(data) ? data.length : 'not array'
      });
      
    } catch (fetchError) {
      console.error(`[API /eitje/sync-endpoint] Fetch error for ${endpoint}:`, fetchError);
      return NextResponse.json({
        success: false,
        error: `Data fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
      }, { status: 500 });
    }

    // DEFENSIVE: Process and store data
    const syncResult = await processAndStoreData(
      data || [], 
      endpoint,
      batchSize
    );
    const syncTime = Date.now() - startTime;

    console.log(`[API /eitje/sync-endpoint] ${endpoint} sync completed:`, syncResult);

    return NextResponse.json({
      success: true,
      message: `Endpoint ${endpoint} sync completed successfully`,
      result: {
        endpoint,
        success: true,
        recordsProcessed: syncResult.recordsProcessed,
        recordsAdded: syncResult.recordsAdded,
        recordsUpdated: syncResult.recordsUpdated,
        errors: syncResult.errors,
        syncTime,
        lastSyncDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API /eitje/sync-endpoint] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync endpoint'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Process and store synchronized data
 */
async function processAndStoreData(
  data: any[], 
  endpoint: string,
  batchSize: number
): Promise<{
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
}> {
  let recordsProcessed = 0;
  let recordsAdded = 0;
  const recordsUpdated = 0;
  let errors = 0;

  try {
    // DEFENSIVE: Determine target table based on endpoint
    const tableMap: Record<string, string> = {
      'environments': 'eitje_environments',
      'teams': 'eitje_teams', 
      'users': 'eitje_users',
      'shift_types': 'eitje_shift_types',
      'time_registration_shifts': 'eitje_time_registration_shifts_raw',
      // 'planning_shifts': 'eitje_planning_shifts_raw', // NOT NEEDED - Commented out per user request
      'revenue_days': 'eitje_revenue_days_raw'
    };

    const targetTable = tableMap[endpoint];
    if (!targetTable) {
      throw new Error(`No table mapping found for endpoint: ${endpoint}`);
    }

    // DEFENSIVE: Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // DEFENSIVE: Validate record structure
          if (!validateRecord(record)) {
            errors++;
            continue;
          }

          // DEFENSIVE: Transform record for storage
          const transformedRecord = transformRecord(record, endpoint);
          
          // DEFENSIVE: Store in database
          const supabase = await createClient();
          const { error } = await supabase
            .from(targetTable)
            .upsert(transformedRecord, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`[API /eitje/sync-endpoint] Database error for ${endpoint}:`, error);
            errors++;
          } else {
            recordsAdded++;
          }

          recordsProcessed++;
        } catch (recordError) {
          console.error(`[API /eitje/sync-endpoint] Record processing error for ${endpoint}:`, recordError);
          errors++;
        }
      }
    }

    return {
      recordsProcessed,
      recordsAdded,
      recordsUpdated,
      errors
    };

  } catch (error) {
    console.error(`[API /eitje/sync-endpoint] Process and store error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * DEFENSIVE: Validate record structure
 */
function validateRecord(record: any): boolean {
  if (!record || typeof record !== 'object') {
    return false;
  }

  // Basic validation - must have some identifying field
  return !!(record.id || record.eitje_id || record.name);
}

/**
 * DEFENSIVE: Transform record for storage
 */
function transformRecord(record: any, endpoint: string): any {
  const baseRecord = {
    id: record.id || record.eitje_id,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: record.updated_at || new Date().toISOString(),
    raw_data: record // Store complete raw data
  };

  // Add endpoint-specific fields
  switch (endpoint) {
    case 'environments':
      return {
        ...baseRecord,
        name: record.name,
        active: record.active,
        team_ids: record.team_ids || [],
        user_ids: record.user_ids || []
      };
    
    case 'teams':
      return {
        ...baseRecord,
        name: record.name,
        environment_id: record.environment_id,
        active: record.active
      };
    
    case 'users':
      return {
        ...baseRecord,
        name: record.name,
        email: record.email,
        active: record.active,
        environment_ids: record.environment_ids || []
      };
    
    case 'shift_types':
      return {
        ...baseRecord,
        name: record.name,
        description: record.description,
        active: record.active
      };
    
    case 'time_registration_shifts':
    // case 'planning_shifts': // NOT NEEDED - Commented out per user request
      return {
        ...baseRecord,
        user_id: record.user_id,
        team_id: record.team_id,
        environment_id: record.environment_id,
        date: record.date,
        start_time: record.start_time || record.start,
        end_time: record.end_time || record.end,
        break_minutes: record.break_minutes || 0,
        hours_worked: record.hours_worked || 0,
        wage_cost: record.wage_cost || record.costs?.wage || 0,
        status: record.status,
        skill_set: record.skill_set,
        shift_type: record.shift_type
      };
    
    case 'revenue_days':
      return {
        ...baseRecord,
        environment_id: record.environment_id,
        date: record.date,
        total_revenue: record.total_revenue || 0,
        revenue_excl_vat: record.revenue_excl_vat || 0,
        revenue_incl_vat: record.revenue_incl_vat || 0,
        vat_amount: record.vat_amount || 0,
        transaction_count: record.transaction_count || 0
      };
    
    default:
      return baseRecord;
  }
}
