import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjePlanningShifts,
  fetchEitjeRevenueDays,
  getEitjeCredentials
} from '@/lib/eitje/api-service';

/**
 * EITJE DATA SYNCHRONIZATION ENDPOINT
 * 
 * Handles manual data synchronization from Eitje API to database
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/sync] Manual sync request received');
    
    const body = await request.json();
    const { 
      endpoint,
      startDate, 
      endDate, 
      batchSize = 100
    } = body;

    // DEFENSIVE: Check if this is a master data endpoint (no dates required)
    const masterDataEndpoints = ['environments', 'teams', 'users', 'shift_types'];
    const isMasterData = endpoint && masterDataEndpoints.includes(endpoint);
    
    // DEFENSIVE: Validate required parameters based on endpoint type
    if (!isMasterData && (!startDate || !endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: startDate and endDate are required for data endpoints'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate date format (only for data endpoints)
    if (!isMasterData && (!isValidDate(startDate) || !isValidDate(endDate))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate date range (only for data endpoints)
    if (!isMasterData && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'startDate cannot be after endDate'
      }, { status: 400 });
    }

    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();

    // DEFENSIVE: Fetch data from Eitje API using simple functions
    const startTime = Date.now();
    let data;

    try {
      // Route to appropriate endpoint method
      switch (endpoint) {
        case 'environments':
          data = await fetchEitjeEnvironments(baseUrl, credentials);
          console.log('[API /eitje/sync] Environments data:', { 
            dataType: typeof data, 
            isArray: Array.isArray(data), 
            length: Array.isArray(data) ? data.length : 'not array',
            firstItem: Array.isArray(data) && data.length > 0 ? data[0] : 'no items'
          });
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
        case 'planning_shifts':
          data = await fetchEitjePlanningShifts(baseUrl, credentials, startDate, endDate);
          break;
        case 'revenue_days':
          data = await fetchEitjeRevenueDays(baseUrl, credentials, startDate, endDate);
          break;
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown endpoint: ${endpoint}`
          }, { status: 400 });
      }
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Data fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        details: {
          endpoint,
          errorType: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'
        }
      }, { status: 502 });
    }

    // DEFENSIVE: Process and store data
    console.log('[API /eitje/sync] Data received:', { 
      dataLength: data?.length || 0, 
      endpoint,
      batchSize 
    });
    
    // DEBUG: Log sample data structure for data endpoints
    if (!isMasterData && data && data.length > 0) {
      console.log('[API /eitje/sync] Sample data structure:', {
        endpoint,
        sampleRecord: data[0],
        recordKeys: Object.keys(data[0] || {}),
        hasId: 'id' in (data[0] || {}),
        hasEitjeId: 'eitje_id' in (data[0] || {}),
        hasDate: 'date' in (data[0] || {}),
        hasStartDate: 'start_date' in (data[0] || {}),
        hasResourceDate: 'resource_date' in (data[0] || {})
      });
    }
    const syncResult = await processAndStoreData(data || [], batchSize, endpoint);
    const syncTime = Date.now() - startTime;

    console.log('[API /eitje/sync] Manual sync completed:', syncResult);

    return NextResponse.json({
      success: true,
      message: 'Manual sync completed successfully',
      result: {
        endpoint,
        recordsProcessed: syncResult.recordsProcessed,
        recordsAdded: syncResult.recordsAdded,
        recordsUpdated: syncResult.recordsUpdated,
        errors: syncResult.errors,
        errorDetails: syncResult.errorDetails,
        syncTime,
        lastSyncDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API /eitje/sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform manual sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Process and store synchronized data
 */
async function processAndStoreData(
  data: unknown[], 
  batchSize: number,
  endpoint: string
): Promise<{
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  errorDetails?: string[];
}> {
  let recordsProcessed = 0;
  let recordsAdded = 0;
  const recordsUpdated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
        // DEFENSIVE: Determine target table based on endpoint
        const tableMap: Record<string, string> = {
          'environments': 'eitje_environments',
          'teams': 'eitje_teams', 
          'users': 'eitje_users',
          'shift_types': 'eitje_shift_types',
          'time_registration_shifts': 'eitje_time_registration_shifts_raw',
          'planning_shifts': 'eitje_planning_shifts_raw',
          'revenue_days': 'eitje_revenue_days_raw'
        };

        const targetTable = tableMap[endpoint];
        if (!targetTable) {
          throw new Error(`No table mapping found for endpoint: ${endpoint}`);
        }

        // DEFENSIVE: Create Supabase client
        const supabase = await createClient();
        
        // DEFENSIVE: Process data in batches
        console.log('[API /eitje/sync] Starting batch processing:', { 
          totalRecords: data.length, 
          batchSize, 
          targetTable 
        });
        
        // Prepare all records for batch insert
        const recordsToInsert = [];
        const isMasterData = ['environments', 'teams', 'users', 'shift_types'].includes(endpoint);
        
        for (const record of data) {
          try {
            // DEFENSIVE: Validate record structure
            const isValid = validateRecord(record);
            if (!isValid) {
              errors++;
              continue;
            }

            // DEFENSIVE: Store raw data directly for now
            
            if (isMasterData) {
              // Master data: use minimal structure that we know exists
              const eitjeId = (record as any).id;
              
              recordsToInsert.push({
                id: eitjeId, // Use eitje ID as primary key
                raw_data: record,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else {
              // Data endpoints: extract from JSONB and populate normalized columns
              const recordDate = (record as any).date || (record as any).start_date || (record as any).resource_date || new Date().toISOString().split('T')[0];
              const eitjeId = (record as any).id || (record as any).eitje_id;
              
              // DEFENSIVE: Ensure eitje_id is a valid integer
              if (!eitjeId || isNaN(parseInt(eitjeId))) {
                console.warn('[API /eitje/sync] Invalid eitje_id, skipping record:', { eitjeId, record });
                errors++;
                continue;
              }
              
              // Extract normalized columns from JSONB for time_registration_shifts
              if (endpoint === 'time_registration_shifts') {
                const rec = record as any;
                recordsToInsert.push({
                  eitje_id: parseInt(eitjeId),
                  date: recordDate,
                  // Extract user info
                  user_id: rec.user?.id || rec.user_id || null,
                  // Extract team info
                  team_id: rec.team?.id || rec.team_id || null,
                  // Extract environment info
                  environment_id: rec.environment?.id || rec.environment_id || null,
                  // Extract time fields
                  start_time: rec.start || rec.start_time || rec.start_datetime || null,
                  end_time: rec.end || rec.end_time || rec.end_datetime || null,
                  start_datetime: rec.start || rec.start_datetime || null,
                  end_datetime: rec.end || rec.end_datetime || null,
                  // Extract break fields
                  break_minutes: rec.break_minutes || rec.breaks || 0,
                  breaks: rec.breaks || rec.break_minutes || 0,
                  break_minutes_actual: rec.break_minutes_actual || rec.break_minutes || 0,
                  // Extract hours (calculate if not present)
                  hours_worked: rec.hours_worked || rec.hours || rec.total_hours || 
                    (rec.start && rec.end 
                      ? (new Date(rec.end).getTime() - new Date(rec.start).getTime()) / (1000 * 60 * 60) - ((rec.break_minutes || 0) / 60)
                      : null),
                  hours: rec.hours || rec.hours_worked || rec.total_hours || null,
                  total_hours: rec.total_hours || rec.hours_worked || rec.hours || null,
                  // Extract cost fields
                  wage_cost: rec.wage_cost || rec.wageCost || rec.costs?.wage || rec.costs?.wage_cost || 
                    rec.labor_cost || rec.laborCost || rec.total_cost || rec.totalCost || null,
                  // Extract metadata
                  status: rec.type?.name || rec.status || null,
                  shift_type: rec.type?.name || rec.shift_type || null,
                  skill_set: rec.skill_set || rec.skillSet || null,
                  notes: rec.remarks || rec.notes || null,
                  // Store raw data
                  raw_data: record,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              } else if (endpoint === 'revenue_days') {
                const rec = record as any;
                recordsToInsert.push({
                  eitje_id: parseInt(eitjeId),
                  date: recordDate,
                  // Extract environment
                  environment_id: rec.environment?.id || rec.environment_id || null,
                  // Extract revenue fields
                  total_revenue: rec.amt_in_cents ? rec.amt_in_cents / 100 : 
                    (rec.total_revenue || rec.revenue || rec.amount || null),
                  revenue: rec.revenue || rec.total_revenue || (rec.amt_in_cents ? rec.amt_in_cents / 100 : null),
                  net_revenue: rec.net_revenue || rec.netRevenue || null,
                  gross_revenue: rec.gross_revenue || rec.grossRevenue || null,
                  // Extract transaction fields
                  transaction_count: rec.transaction_count || rec.transactions_count || rec.count || null,
                  transaction_count_total: rec.transaction_count_total || rec.transaction_count || null,
                  // Extract payment method fields
                  cash_revenue: rec.cash_revenue || rec.cashRevenue || null,
                  card_revenue: rec.card_revenue || rec.cardRevenue || null,
                  digital_revenue: rec.digital_revenue || rec.digitalRevenue || null,
                  // Extract VAT fields
                  vat_amount: rec.vat_amount || rec.vatAmount || null,
                  vat_percentage: rec.vat_percentage || rec.vatPercentage || null,
                  // Extract metadata
                  currency: rec.currency || 'EUR',
                  status: rec.status || null,
                  notes: rec.notes || rec.remarks || null,
                  // Store raw data
                  raw_data: record,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              } else {
                // Other endpoints: minimal extraction
                recordsToInsert.push({
                  eitje_id: parseInt(eitjeId),
                  date: recordDate,
                  raw_data: record,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
          } catch (recordError) {
            const errorMsg = `Record processing error: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`;
            console.error('[API /eitje/sync] Record processing error:', recordError);
            errorDetails.push(errorMsg);
            errors++;
          }
        }

        // DEFENSIVE: Batch insert all records at once
        if (recordsToInsert.length > 0) {
          console.log('[API /eitje/sync] Batch inserting records:', { 
            count: recordsToInsert.length,
            targetTable 
          });
          
          // DEFENSIVE: Try upsert first, using the correct unique constraint per table
          // - time_registration_shifts_raw: unique (eitje_id, date, user_id)
          // - revenue_days_raw: unique (eitje_id, date, environment_id)
          // - master data: unique id
          // - other endpoints (if any): default to (eitje_id)
          const conflictColumns = isMasterData
            ? 'id'
            : endpoint === 'time_registration_shifts'
              ? 'eitje_id,date,user_id'
              : endpoint === 'revenue_days'
                ? 'eitje_id,date,environment_id'
                : 'eitje_id';
          
  const { error } = await supabase
            .from(targetTable)
            .upsert(recordsToInsert, { 
              onConflict: conflictColumns,
              ignoreDuplicates: false 
            });

          // If upsert fails due to missing constraint (should not happen with correct conflict columns),
          // do not fall back to a raw insert to avoid duplicate key violations.
          // Instead, surface the error so we can fix the constraint or columns.

          if (error) {
            const errorMsg = `Batch insert error: ${error.message} (code: ${error.code})`;
            console.error('[API /eitje/sync] Batch insert error:', { 
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              table: targetTable,
              recordCount: recordsToInsert.length
            });
            errorDetails.push(errorMsg);
            errors += recordsToInsert.length;
          } else {
            console.log('[API /eitje/sync] Successfully batch inserted records:', recordsToInsert.length);
            recordsProcessed += recordsToInsert.length;
            recordsAdded += recordsToInsert.length;
          }
        }

    console.log(`[API /eitje/sync] Processed ${recordsProcessed} records, ${errors} errors`);
    
    return {
      recordsProcessed,
      recordsAdded,
      recordsUpdated,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    };

  } catch (error) {
    console.error('[API /eitje/sync] Data processing failed:', error);
    throw error;
  }
}

/**
 * DEFENSIVE: Validate record structure
 */
function validateRecord(record: unknown): boolean {
  return !!(
    record &&
    typeof record === 'object' &&
    record !== null &&
    'id' in record
  );
}

/**
 * DEFENSIVE: Transform record for storage
 */
function transformRecord(record: unknown): Record<string, unknown> {
  const rec = record as Record<string, unknown>;
  const user = rec.user as Record<string, unknown> | undefined;
  const team = rec.team as Record<string, unknown> | undefined;
  const environment = rec.environment as Record<string, unknown> | undefined;
  const skillSet = rec.skill_set as Record<string, unknown> | undefined;
  const shiftType = rec.shift_type as Record<string, unknown> | undefined;
  
  return {
    id: rec.id || '',
    date: rec.date || '',
    user_id: user?.id || null,
    team_id: team?.id || null,
    environment_id: environment?.id || null,
    start_time: rec.start || null,
    end_time: rec.end || null,
    break_minutes: rec.break_minutes || 0,
    published: rec.published || false,
    skill_set: skillSet?.name || null,
    shift_type: shiftType?.name || null,
    remarks: rec.remarks || null,
    raw_data: record,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * DEFENSIVE: Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}
