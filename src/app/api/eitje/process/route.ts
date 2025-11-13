import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import crypto from 'crypto';

/**
 * EITJE DATA PROCESSING ENDPOINT
 * 
 * Unpacks ALL JSONB fields from raw_data into normalized columns
 * Creates processed tables with 100% field coverage
 */

// Helper: Deduplicate items by a computed key (last-write-wins)
function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(getKey(item), item);
  }
  return Array.from(map.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, startDate, endDate } = body;
    
    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameter: endpoint" 
      }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters: startDate and endDate" 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Process based on endpoint
    if (endpoint === 'time_registration_shifts') {
      await processTimeRegistrationShifts(supabase, startDate, endDate);
    } else if (endpoint === 'planning_shifts') {
      await processPlanningShifts(supabase, startDate, endDate);
    } else if (endpoint === 'revenue_days') {
      await processRevenueDays(supabase, startDate, endDate);
    } else {
      return NextResponse.json({
        success: false, 
        error: `Unsupported endpoint: ${endpoint}` 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${endpoint} for ${startDate} to ${endDate}` 
    });

  } catch (error) {
    console.error('[API /eitje/process] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Helper: Generate hash of raw_data for validation
 */
function generateRawDataHash(rawData: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(rawData)).digest('hex');
}

/**
 * Helper: Extract nested object fields
 */
function extractNestedFields(obj: any, prefix: string): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = `${prefix}_${key}`;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively extract nested objects
      Object.assign(result, extractNestedFields(value, fieldName));
    } else {
      result[fieldName] = value;
    }
  }
  return result;
}

/**
 * Process time registration shifts: unpack JSONB → processed table
 */
async function processTimeRegistrationShifts(
  supabase: any,
  startDate: string, 
  endDate: string
) {
  console.log(`[API /eitje/process] Processing time registration shifts for ${startDate} to ${endDate}`);
  
  const { data: rawData, error } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  console.log(`[API /eitje/process] Found ${rawData?.length || 0} raw records`);
  
  if (!rawData || rawData.length === 0) {
    console.log('[API /eitje/process] No raw data found, skipping processing');
    return;
  }
  
  const processedRecords = [];
  
  for (const record of rawData) {
    const rawDataObj = record.raw_data || {};
    const dataHash = generateRawDataHash(rawDataObj);
    
    // Extract user fields
    const userFields = rawDataObj.user || {};
    const userNested = extractNestedFields(userFields, 'user');
    
    // Extract environment fields
    const envFields = rawDataObj.environment || {};
    const envNested = extractNestedFields(envFields, 'environment');
    
    // Extract team fields
    const teamFields = rawDataObj.team || {};
    const teamNested = extractNestedFields(teamFields, 'team');
    
    // Extract type fields
    const typeFields = rawDataObj.type || {};
    const typeNested = extractNestedFields(typeFields, 'type');
    
    // Build processed record with all fields unpacked
    const processed = {
      eitje_id: record.eitje_id,
      date: record.date,
      
      // User fields
      user_id: record.user_id || userFields.id || null,
      user_name: userFields.name || `${userFields.first_name || ''} ${userFields.last_name || ''}`.trim() || null,
      user_first_name: userFields.first_name || userFields.firstName || null,
      user_last_name: userFields.last_name || userFields.lastName || null,
      user_email: userFields.email || null,
      user_phone: userFields.phone || null,
      user_code: userFields.code || null,
      user_active: userFields.active !== undefined ? userFields.active : null,
      user_raw: userFields,
      ...userNested,
      
      // Environment fields
      environment_id: record.environment_id || envFields.id || null,
      environment_name: envFields.name || null,
      environment_code: envFields.code || null,
      environment_type: envFields.type || null,
      environment_active: envFields.active !== undefined ? envFields.active : null,
      environment_raw: envFields,
      ...envNested,
      
      // Team fields
      team_id: record.team_id || teamFields.id || null,
      team_name: teamFields.name || null,
      team_code: teamFields.code || null,
      team_active: teamFields.active !== undefined ? teamFields.active : null,
      team_raw: teamFields,
      ...teamNested,
      
      // Time fields
      start: rawDataObj.start || record.start_time || record.start_datetime || null,
      end: rawDataObj.end || record.end_time || record.end_datetime || null,
      start_time: record.start_time || rawDataObj.start_time || rawDataObj.start || null,
      end_time: record.end_time || rawDataObj.end_time || rawDataObj.end || null,
      start_datetime: record.start_datetime || rawDataObj.start_datetime || rawDataObj.start || null,
      end_datetime: record.end_datetime || rawDataObj.end_datetime || rawDataObj.end || null,
      
      // Break fields
      break_minutes: record.break_minutes || rawDataObj.break_minutes || 0,
      breaks: record.breaks || rawDataObj.breaks || 0,
      break_minutes_actual: record.break_minutes_actual || rawDataObj.break_minutes_actual || rawDataObj.break_minutes || 0,
      break_minutes_planned: rawDataObj.break_minutes_planned || 0,
      
      // Hours fields
      hours_worked: record.hours_worked || rawDataObj.hours_worked || rawDataObj.hours || rawDataObj.total_hours || null,
      hours: record.hours || rawDataObj.hours || rawDataObj.hours_worked || null,
      total_hours: record.total_hours || rawDataObj.total_hours || rawDataObj.hours_worked || null,
      
      // Cost fields
      wage_cost: record.wage_cost || rawDataObj.wage_cost || rawDataObj.wageCost || null,
      wage_cost_cents: rawDataObj.wage_cost_cents || null,
      costs_wage: rawDataObj.costs?.wage || null,
      costs_wage_cost: rawDataObj.costs?.wage_cost || null,
      costs_total: rawDataObj.costs?.total || null,
      labor_cost: rawDataObj.labor_cost || rawDataObj.laborCost || null,
      laborCost: rawDataObj.laborCost || null,
      total_cost: rawDataObj.total_cost || rawDataObj.totalCost || null,
      totalCost: rawDataObj.totalCost || null,
      cost: rawDataObj.cost || null,
      price: rawDataObj.price || null,
      hourly_rate: rawDataObj.hourly_rate || rawDataObj.hourlyRate || null,
      costs: record.costs || rawDataObj.costs || null,
      
      // Status and metadata
      status: record.status || rawDataObj.status || rawDataObj.type?.name || null,
      shift_type: record.shift_type || rawDataObj.shift_type || rawDataObj.type?.name || null,
      type_name: typeFields.name || null,
      type_raw: typeFields,
      ...typeNested,
      skill_set: record.skill_set || rawDataObj.skill_set || rawDataObj.skillSet || null,
      skillSet: rawDataObj.skillSet || null,
      notes: record.notes || rawDataObj.notes || rawDataObj.remarks || null,
      remarks: rawDataObj.remarks || null,
      
      // Validation
      raw_data_hash: dataHash,
      raw_data: rawDataObj,
      
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    processedRecords.push(processed);
  }
  
  console.log(`[API /eitje/process] Processed ${processedRecords.length} records`);
  
  // Upsert to processed table
  if (processedRecords.length > 0) {
    // Deduplicate payload to prevent "ON CONFLICT DO UPDATE ... affect row a second time"
    const uniqueProcessed = dedupeByKey(processedRecords, (r: any) => {
      return `${r.eitje_id}|${r.date}|${r.user_id ?? ''}`;
    });
    const { error: upsertError } = await supabase
      .from('eitje_time_registration_shifts_processed')
      .upsert(uniqueProcessed, {
        onConflict: 'eitje_id,date,user_id'
      });
      
    if (upsertError) {
      throw new Error(`Failed to upsert processed data: ${upsertError.message}`);
    }
    
    console.log('[API /eitje/process] Successfully processed time registration shifts');
  }
}

/**
 * Process planning shifts: unpack JSONB → processed table
 */
async function processPlanningShifts(
  supabase: any,
  startDate: string,
  endDate: string
) {
  console.log(`[API /eitje/process] Processing planning shifts for ${startDate} to ${endDate}`);
  
  const { data: rawData, error } = await supabase
    .from('eitje_planning_shifts_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  console.log(`[API /eitje/process] Found ${rawData?.length || 0} raw planning shift records`);
  
  if (!rawData || rawData.length === 0) {
    console.log('[API /eitje/process] No raw planning shift data found, skipping processing');
    return;
  }
  
  const processedRecords = [];
  
  for (const record of rawData) {
    const rawDataObj = record.raw_data || {};
    const dataHash = generateRawDataHash(rawDataObj);
    
    // Extract nested fields (same as time registration shifts)
    const userFields = rawDataObj.user || {};
    const userNested = extractNestedFields(userFields, 'user');
    const envFields = rawDataObj.environment || {};
    const envNested = extractNestedFields(envFields, 'environment');
    const teamFields = rawDataObj.team || {};
    const teamNested = extractNestedFields(teamFields, 'team');
    const typeFields = rawDataObj.type || {};
    const typeNested = extractNestedFields(typeFields, 'type');
    
    const processed = {
      eitje_id: record.eitje_id,
      date: record.date,
      
      // User fields
      user_id: record.user_id || userFields.id || null,
      user_name: userFields.name || `${userFields.first_name || ''} ${userFields.last_name || ''}`.trim() || null,
      user_first_name: userFields.first_name || userFields.firstName || null,
      user_last_name: userFields.last_name || userFields.lastName || null,
      user_email: userFields.email || null,
      user_phone: userFields.phone || null,
      user_code: userFields.code || null,
      user_active: userFields.active !== undefined ? userFields.active : null,
      user_raw: userFields,
      ...userNested,
      
      // Environment fields
      environment_id: record.environment_id || envFields.id || null,
      environment_name: envFields.name || null,
      environment_code: envFields.code || null,
      environment_type: envFields.type || null,
      environment_active: envFields.active !== undefined ? envFields.active : null,
      environment_raw: envFields,
      ...envNested,
      
      // Team fields
      team_id: record.team_id || teamFields.id || null,
      team_name: teamFields.name || null,
      team_code: teamFields.code || null,
      team_active: teamFields.active !== undefined ? teamFields.active : null,
      team_raw: teamFields,
      ...teamNested,
      
      // Time fields
      start: rawDataObj.start || record.start_time || record.start_datetime || null,
      end: rawDataObj.end || record.end_time || record.end_datetime || null,
      start_time: record.start_time || rawDataObj.start_time || rawDataObj.start || null,
      end_time: record.end_time || rawDataObj.end_time || rawDataObj.end || null,
      start_datetime: record.start_datetime || rawDataObj.start_datetime || rawDataObj.start || null,
      end_datetime: record.end_datetime || rawDataObj.end_datetime || rawDataObj.end || null,
      
      // Break fields
      break_minutes: record.break_minutes || rawDataObj.break_minutes || 0,
      breaks: record.breaks || rawDataObj.breaks || 0,
      break_minutes_actual: record.break_minutes_actual || rawDataObj.break_minutes_actual || 0,
      break_minutes_planned: rawDataObj.break_minutes_planned || 0,
      
      // Hours fields (planning-specific)
      planned_hours: record.planned_hours || rawDataObj.planned_hours || rawDataObj.hours_planned || null,
      hours: record.hours || rawDataObj.hours || null,
      total_hours: record.total_hours || rawDataObj.total_hours || null,
      hours_planned: rawDataObj.hours_planned || rawDataObj.planned_hours || null,
      
      // Cost fields (planning-specific)
      planned_cost: record.planned_cost || rawDataObj.planned_cost || null,
      wage_cost: record.wage_cost || rawDataObj.wage_cost || rawDataObj.wageCost || null,
      costs_wage: rawDataObj.costs?.wage || null,
      costs_wage_cost: rawDataObj.costs?.wage_cost || null,
      costs_total: rawDataObj.costs?.total || null,
      hourly_rate: rawDataObj.hourly_rate || rawDataObj.hourlyRate || null,
      costs: record.costs || rawDataObj.costs || null,
      
      // Status fields (planning-specific)
      status: record.status || rawDataObj.status || 'planned',
      confirmed: record.confirmed !== undefined ? record.confirmed : (rawDataObj.confirmed !== undefined ? rawDataObj.confirmed : false),
      cancelled: record.cancelled !== undefined ? record.cancelled : (rawDataObj.cancelled !== undefined ? rawDataObj.cancelled : false),
      shift_type: record.shift_type || rawDataObj.shift_type || rawDataObj.type?.name || null,
      type_name: typeFields.name || null,
      type_raw: typeFields,
      ...typeNested,
      skill_set: record.skill_set || rawDataObj.skill_set || rawDataObj.skillSet || null,
      skillSet: rawDataObj.skillSet || null,
      notes: record.notes || rawDataObj.notes || rawDataObj.remarks || null,
      remarks: rawDataObj.remarks || null,
      
      // Validation
      raw_data_hash: dataHash,
      raw_data: rawDataObj,
      
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    processedRecords.push(processed);
  }
  
  console.log(`[API /eitje/process] Processed ${processedRecords.length} planning shift records`);
  
  // Upsert to processed table
  if (processedRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('eitje_planning_shifts_processed')
      .upsert(processedRecords, {
        onConflict: 'eitje_id,date,user_id'
      });
      
    if (upsertError) {
      throw new Error(`Failed to upsert processed planning shifts: ${upsertError.message}`);
    }
    
    console.log('[API /eitje/process] Successfully processed planning shifts');
  }
}

/**
 * Process revenue days: unpack JSONB → processed table
 */
async function processRevenueDays(
  supabase: any,
  startDate: string,
  endDate: string
) {
  console.log(`[API /eitje/process] Processing revenue days for ${startDate} to ${endDate}`);
  
  const { data: rawData, error } = await supabase
    .from('eitje_revenue_days_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  console.log(`[API /eitje/process] Found ${rawData?.length || 0} raw revenue records`);
  
  if (!rawData || rawData.length === 0) {
    console.log('[API /eitje/process] No raw revenue data found, skipping processing');
    return;
  }
  
  const processedRecords = [];
  
  for (const record of rawData) {
    const rawDataObj = record.raw_data || {};
    const dataHash = generateRawDataHash(rawDataObj);
    
    // Extract environment fields
    const envFields = rawDataObj.environment || {};
    const envNested = extractNestedFields(envFields, 'environment');
    
    // Convert cents to euros if needed
    const amtInCents = rawDataObj.amt_in_cents || 0;
    const revenueInEuros = amtInCents ? amtInCents / 100 : null;
    
    const processed = {
      eitje_id: record.eitje_id,
      date: record.date,
      
      // Environment fields
      environment_id: record.environment_id || envFields.id || null,
      environment_name: envFields.name || null,
      environment_code: envFields.code || null,
      environment_type: envFields.type || null,
      environment_active: envFields.active !== undefined ? envFields.active : null,
      environment_raw: envFields,
      ...envNested,
      
      // Revenue fields (all variations)
      total_revenue: record.total_revenue || rawDataObj.total_revenue || revenueInEuros || null,
      revenue: record.revenue || rawDataObj.revenue || revenueInEuros || null,
      net_revenue: record.net_revenue || rawDataObj.net_revenue || rawDataObj.netRevenue || null,
      gross_revenue: record.gross_revenue || rawDataObj.gross_revenue || rawDataObj.grossRevenue || null,
      amt_in_cents: amtInCents || null,
      amount: rawDataObj.amount || revenueInEuros || null,
      
      // Transaction fields
      transaction_count: record.transaction_count || rawDataObj.transaction_count || rawDataObj.transactions_count || rawDataObj.count || null,
      transaction_count_total: record.transaction_count_total || rawDataObj.transaction_count_total || null,
      transactions_count: rawDataObj.transactions_count || null,
      count: rawDataObj.count || null,
      
      // Payment method fields
      cash_revenue: record.cash_revenue || rawDataObj.cash_revenue || rawDataObj.cashRevenue || null,
      cashRevenue: rawDataObj.cashRevenue || null,
      card_revenue: record.card_revenue || rawDataObj.card_revenue || rawDataObj.cardRevenue || null,
      cardRevenue: rawDataObj.cardRevenue || null,
      digital_revenue: record.digital_revenue || rawDataObj.digital_revenue || rawDataObj.digitalRevenue || null,
      digitalRevenue: rawDataObj.digitalRevenue || null,
      other_revenue: rawDataObj.other_revenue || rawDataObj.otherRevenue || null,
      otherRevenue: rawDataObj.otherRevenue || null,
      
      // VAT fields
      vat_amount: record.vat_amount || rawDataObj.vat_amount || rawDataObj.vatAmount || null,
      vatAmount: rawDataObj.vatAmount || null,
      vat_percentage: record.vat_percentage || rawDataObj.vat_percentage || rawDataObj.vatPercentage || null,
      vatPercentage: rawDataObj.vatPercentage || null,
      vat_rate: rawDataObj.vat_rate || rawDataObj.vatRate || null,
      vatRate: rawDataObj.vatRate || null,
      
      // Currency and metadata
      currency: record.currency || rawDataObj.currency || 'EUR',
      status: record.status || rawDataObj.status || null,
      notes: record.notes || rawDataObj.notes || rawDataObj.remarks || null,
      remarks: rawDataObj.remarks || null,
      
      // Validation
      raw_data_hash: dataHash,
      raw_data: rawDataObj,
      
      created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
    
    processedRecords.push(processed);
  }
  
  console.log(`[API /eitje/process] Processed ${processedRecords.length} revenue records`);
  
  // Upsert to processed table
  if (processedRecords.length > 0) {
    // Deduplicate payload to prevent "ON CONFLICT DO UPDATE ... affect row a second time"
    const uniqueProcessed = dedupeByKey(processedRecords, (r: any) => {
      return `${r.eitje_id}|${r.date}|${r.environment_id ?? ''}`;
    });
    const { error: upsertError } = await supabase
      .from('eitje_revenue_days_processed')
      .upsert(uniqueProcessed, {
        onConflict: 'eitje_id,date,environment_id'
      });
      
    if (upsertError) {
      throw new Error(`Failed to upsert processed revenue data: ${upsertError.message}`);
    }
    
    console.log('[API /eitje/process] Successfully processed revenue days');
  }
}
