import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE AGGREGATION SERVICE
 * 
 * Processes raw Eitje data into aggregated metrics for fast dashboard loading
 * Follows EXTREME DEFENSIVE MODE: simple, modular, debuggable
 */

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  environmentId?: number;
  teamId?: number;
}

export interface AggregationResult {
  recordsProcessed: number;
  recordsAggregated: number;
  errors: string[];
  processingTime: number;
}

export interface LaborHoursRecord {
  date: string;
  environment_id: number;
  team_id?: number;
  total_hours_worked: number;
  total_breaks_minutes: number;
  total_wage_cost: number;
  employee_count: number;
  shift_count: number;
  avg_hours_per_employee: number;
  avg_wage_per_hour: number;
}

export interface PlanningHoursRecord {
  date: string;
  environment_id: number;
  team_id?: number;
  planned_hours_total: number;
  total_breaks_minutes: number;
  total_planned_cost: number;
  employee_count: number;
  shift_count: number;
  confirmed_count: number;
  cancelled_count: number;
  planned_count: number;
  avg_hours_per_employee: number;
  avg_cost_per_hour: number;
}

export interface RevenueDaysRecord {
  date: string;
  environment_id: number;
  total_revenue: number;
  transaction_count: number;
  avg_revenue_per_transaction: number;
  // VAT fields
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  avg_vat_rate: number;
  // Payment method fields
  total_cash_revenue: number;
  total_card_revenue: number;
  total_digital_revenue: number;
  total_other_revenue: number;
  // Payment method percentages
  cash_percentage: number;
  card_percentage: number;
  digital_percentage: number;
  other_percentage: number;
  // Transaction metrics
  max_transaction_value: number;
  min_transaction_value: number;
  // Additional fields
  currency: string;
  net_revenue: number;
  gross_revenue: number;
}

/**
 * Helper function to extract field values from raw_data JSONB
 * Tries multiple field paths and returns first non-null value
 */
function extractFieldValue(rawData: any, fieldPaths: string[]): any {
  if (!rawData || typeof rawData !== 'object') return null;
  
  for (const path of fieldPaths) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], rawData);
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return null;
}

/**
 * Calculate hours worked from start/end times if hours field is missing
 */
function calculateHoursFromTimes(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  } catch (error) {
    console.warn('[Eitje Aggregation] Error calculating hours from times:', error);
    return 0;
  }
}

/**
 * Aggregate Labor Hours from time_registration_shifts_raw
 */
export async function aggregateLaborHours(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting labor hours aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Failed to initialize Supabase client');
    }
    
    // Build query with filters
    let query = supabase
      .from('eitje_time_registration_shifts_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    if (dateRange.teamId) {
      query = query.eq('team_id', dateRange.teamId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for labor hours');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw labor records`);
    
    // Group records by (date, environment_id, team_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      // Extract date from raw_data if record.date is not available
      const recordDate = record.date || extractFieldValue(record.raw_data, ['date', 'start_date', 'resource_date']);
      if (!recordDate) {
        console.warn('[Eitje Aggregation] Skipping record without date:', record.id);
        return;
      }
      
      // Extract environment_id and team_id from raw_data
      const environmentId = record.environment_id || extractFieldValue(record.raw_data, ['environment_id', 'environment.id', 'environment']);
      const teamId = record.team_id || extractFieldValue(record.raw_data, ['team_id', 'team.id', 'team']);
      
      // Debug logging for environment extraction
      if (!environmentId) {
        console.warn('[Eitje Aggregation] No environment_id found for record:', {
          id: record.id,
          date: recordDate,
          raw_data_keys: record.raw_data ? Object.keys(record.raw_data) : 'no raw_data',
          environment_id: record.environment_id
        });
      }
      
      const key = `${recordDate}-${environmentId || 'null'}-${teamId || 'null'}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group
    const aggregatedRecords: LaborHoursRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const parts = key.split('-');
        const date = parts.slice(0, 3).join('-'); // Rejoin date parts
        const environmentId = parts[3];
        const teamId = parts[4];
        
        let totalHoursWorked = 0;
        let totalBreaksMinutes = 0;
        let totalWageCost = 0;
        const uniqueEmployees = new Set<number>();
        
        records.forEach(record => {
          // COMPLIANCE: Prioritize normalized columns over raw_data JSONB
          // Extract ALL possible fields from JSONB to ensure nothing is missed
          
          // Extract hours worked - try normalized columns first, then fallback to raw_data with comprehensive paths
          const hoursWorked = Number(record.hours_worked || record.hours || record.total_hours || 0) ||
            extractFieldValue(record.raw_data, [
              'hours_worked', 'hours', 'totalHours', 'total_hours', 'hoursWorked',
              'duration', 'duration_hours', 'work_hours', 'worked_hours',
              'time.hours', 'shift.hours', 'shift_data.hours'
            ]) || calculateHoursFromTimes(
              record.start_time || record.start_datetime || extractFieldValue(record.raw_data, [
                'start_time', 'start', 'startDateTime', 'startTime', 'clock_in', 'clockIn',
                'time.start', 'shift.start', 'shift_data.start'
              ]),
              record.end_time || record.end_datetime || extractFieldValue(record.raw_data, [
                'end_time', 'end', 'endDateTime', 'endTime', 'clock_out', 'clockOut',
                'time.end', 'shift.end', 'shift_data.end'
              ])
            );
          
          totalHoursWorked += Number(hoursWorked) || 0;
          
          // Extract breaks - prioritize normalized columns, then comprehensive JSONB paths
          const breaks = Number(record.break_minutes || record.breaks || record.break_minutes_actual || 0) ||
            extractFieldValue(record.raw_data, [
              'break_minutes', 'breaks', 'breakMinutes', 'break_minutes_actual',
              'break_time', 'breakTime', 'break_duration', 'breakDuration',
              'time.breaks', 'shift.breaks', 'shift_data.breaks'
            ]) || 0;
          totalBreaksMinutes += Number(breaks) || 0;
          
          // Extract wage cost - prioritize normalized columns, then comprehensive raw_data JSONB paths
          let wageCost = Number(record.wage_cost || 0);
          
          // If no wage_cost in normalized column, check raw_data JSONB with comprehensive paths
          if (!wageCost || wageCost === 0) {
            wageCost = Number(
              extractFieldValue(record.raw_data, [
                'wage_cost', 'wageCost', 'wage', 'total_wage', 'totalWage',
                'costs.wage', 'costs.wage_cost', 'costs.wageCost',
                'labor_cost', 'laborCost', 'laborCosts', 'labor_costs',
                'total_cost', 'totalCost', 'total_costs', 'totalCosts',
                'cost', 'price', 'amount', 'cost_amount',
                'shift.cost', 'shift.wage', 'shift_data.cost', 'shift_data.wage'
              ]) || 0
            );
          }
          
          // If still no cost, use fallback calculation (€15/hour)
          if (!wageCost || wageCost === 0) {
            const hours = Number(hoursWorked) || 0;
            wageCost = hours * 15;
          }
          
          totalWageCost += Number(wageCost) || 0;
          
          // Track unique employees - extract from multiple possible paths
          const userId = record.user_id || 
            extractFieldValue(record.raw_data, [
              'user_id', 'userId', 'user.id', 'employee_id', 'employeeId',
              'employee.id', 'worker_id', 'workerId', 'worker.id'
            ]);
          if (userId) {
            uniqueEmployees.add(Number(userId));
          }
        });
        
        const employeeCount = uniqueEmployees.size;
        const shiftCount = records.length;
        const avgHoursPerEmployee = employeeCount > 0 ? totalHoursWorked / employeeCount : 0;
        const avgWagePerHour = totalHoursWorked > 0 ? totalWageCost / totalHoursWorked : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          team_id: teamId === 'null' ? null : Number(teamId),
          total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
          total_breaks_minutes: totalBreaksMinutes,
          total_wage_cost: Math.round(totalWageCost * 100) / 100,
          employee_count: employeeCount,
          shift_count: shiftCount,
          avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
          avg_wage_per_hour: Math.round(avgWagePerHour * 100) / 100
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_labor_hours_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id,team_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Labor hours aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Labor hours aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Aggregate Planning Hours from planning_shifts_raw
 */
export async function aggregatePlanningHours(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting planning hours aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('eitje_planning_shifts_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    if (dateRange.teamId) {
      query = query.eq('team_id', dateRange.teamId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for planning hours');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw planning records`);
    
    // Group records by (date, environment_id, team_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      const key = `${record.date}-${record.environment_id}-${record.team_id || 'null'}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group
    const aggregatedRecords: PlanningHoursRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const [date, environmentId, teamId] = key.split('-');
        
        let plannedHoursTotal = 0;
        let totalBreaksMinutes = 0;
        let totalPlannedCost = 0;
        const uniqueEmployees = new Set<number>();
        let confirmedCount = 0;
        let cancelledCount = 0;
        let plannedCount = 0;
        
        records.forEach(record => {
          // Extract planned hours
          const plannedHours = extractFieldValue(record.raw_data, [
            'planned_hours', 'hours', 'totalHours', 'total_hours'
          ]) || calculateHoursFromTimes(
            extractFieldValue(record.raw_data, ['start_time', 'start', 'startDateTime']),
            extractFieldValue(record.raw_data, ['end_time', 'end', 'endDateTime'])
          );
          
          plannedHoursTotal += Number(plannedHours) || 0;
          
          // Extract breaks
          const breaks = extractFieldValue(record.raw_data, [
            'break_minutes', 'breaks', 'breakMinutes', 'break_minutes_actual'
          ]) || 0;
          totalBreaksMinutes += Number(breaks) || 0;
          
          // Extract planned cost
          const plannedCost = extractFieldValue(record.raw_data, [
            'planned_cost', 'costs.planned', 'plannedCost', 'wage_cost'
          ]) || 0;
          totalPlannedCost += Number(plannedCost) || 0;
          
          // Track unique employees
          if (record.user_id) {
            uniqueEmployees.add(record.user_id);
          }
          
          // Count by status
          const status = extractFieldValue(record.raw_data, ['status']) || 'planned';
          if (status === 'confirmed') confirmedCount++;
          else if (status === 'cancelled') cancelledCount++;
          else plannedCount++;
        });
        
        const employeeCount = uniqueEmployees.size;
        const shiftCount = records.length;
        const avgHoursPerEmployee = employeeCount > 0 ? plannedHoursTotal / employeeCount : 0;
        const avgCostPerHour = plannedHoursTotal > 0 ? totalPlannedCost / plannedHoursTotal : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          team_id: teamId === 'null' ? null : Number(teamId),
          planned_hours_total: Math.round(plannedHoursTotal * 100) / 100,
          total_breaks_minutes: totalBreaksMinutes,
          total_planned_cost: Math.round(totalPlannedCost * 100) / 100,
          employee_count: employeeCount,
          shift_count: shiftCount,
          confirmed_count: confirmedCount,
          cancelled_count: cancelledCount,
          planned_count: plannedCount,
          avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
          avg_cost_per_hour: Math.round(avgCostPerHour * 100) / 100
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_planning_hours_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id,team_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Planning hours aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Planning hours aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Aggregate Revenue Days from revenue_days_raw
 */
export async function aggregateRevenueDays(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting revenue days aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('eitje_revenue_days_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for revenue days');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw revenue records`);
    
    // Group records by (date, environment_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      // Extract environment_id from raw_data.environment.id
      const environmentId = record.raw_data?.environment?.id || record.environment_id || 0;
      const key = `${record.date}-${environmentId}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group - COMPLIANCE: Extract from normalized columns, not JSONB
    const aggregatedRecords: RevenueDaysRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const parts = key.split('-');
        const date = `${parts[0]}-${parts[1]}-${parts[2]}`; // Reconstruct full date
        const environmentId = parts[3];
        
        // Initialize aggregations
        let totalRevenue = 0;
        let totalRevenueExclVat = 0;
        let totalRevenueInclVat = 0;
        let totalVatAmount = 0;
        let totalCashRevenue = 0;
        let totalCardRevenue = 0;
        let totalDigitalRevenue = 0;
        let totalOtherRevenue = 0;
        let totalNetRevenue = 0;
        let totalGrossRevenue = 0;
        let transactionCount = 0;
        let vatRateSum = 0;
        let vatRateCount = 0;
        const transactionValues: number[] = [];
        let currency = 'EUR'; // Default currency
        
        records.forEach(record => {
          // COMPLIANCE: Extract from normalized columns first, fallback to raw_data JSONB
          const rawData = record.raw_data || {};
          
          // Helper to extract value: prioritize normalized column, then raw_data JSONB paths
          const extractValue = (normalizedValue: any, jsonPaths: string[], defaultValue: any = 0) => {
            if (normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== 0) {
              return Number(normalizedValue);
            }
            // Fallback to raw_data JSONB
            for (const path of jsonPaths) {
              const keys = path.split('.');
              let value = rawData;
              for (const key of keys) {
                value = value?.[key];
                if (value === null || value === undefined) break;
              }
              if (value !== null && value !== undefined) {
                return Number(value) || defaultValue;
              }
            }
            return defaultValue;
          };
          
          // Revenue: amt_in_cents is in cents, convert to euros (no decimals)
          const revenueInCents = extractValue(record.total_revenue || record.revenue, 
            ['amt_in_cents', 'amount', 'revenue', 'total', 'total_revenue'], 0);
          const revenue = Math.round(revenueInCents / 100); // Convert cents to euros, no decimals
          const revenueExclVat = extractValue(record.net_revenue || record.revenue_excl_vat,
            ['revenue_excl_vat', 'net_revenue', 'revenue_ex_vat', 'net'], 0);
          const revenueInclVat = extractValue(record.gross_revenue || record.revenue_incl_vat,
            ['revenue_incl_vat', 'gross_revenue', 'revenue', 'total'], 0);
          const vatAmount = extractValue(record.vat_amount,
            ['vat_amount', 'vat', 'tax_amount'], 0);
          const vatPercentage = extractValue(record.vat_percentage || record.vat_rate,
            ['vat_percentage', 'vat_rate', 'tax_rate', 'vat'], 0);
          const cashRev = extractValue(record.cash_revenue,
            ['cash_revenue', 'cash', 'payment_methods.cash', 'payments.cash'], 0);
          const cardRev = extractValue(record.card_revenue,
            ['card_revenue', 'card', 'payment_methods.card', 'payments.card'], 0);
          const digitalRev = extractValue(record.digital_revenue,
            ['digital_revenue', 'digital', 'payment_methods.digital', 'payments.digital'], 0);
          const otherRev = extractValue(record.other_revenue || 0,
            ['other_revenue', 'other', 'payment_methods.other', 'payments.other'], 0);
          const netRev = extractValue(record.net_revenue,
            ['net_revenue', 'net'], 0);
          const grossRev = extractValue(record.gross_revenue,
            ['gross_revenue', 'gross'], 0);
          
          totalRevenue += revenue;
          totalRevenueExclVat += revenueExclVat;
          totalRevenueInclVat += revenueInclVat;
          totalVatAmount += vatAmount;
          totalCashRevenue += cashRev;
          totalCardRevenue += cardRev;
          totalDigitalRevenue += digitalRev;
          totalOtherRevenue += otherRev;
          totalNetRevenue += netRev;
          totalGrossRevenue += grossRev;
          
          if (vatPercentage > 0) {
            vatRateSum += vatPercentage;
            vatRateCount += 1;
          }
          
          // Track transaction values for min/max
          if (revenue > 0) {
            transactionValues.push(revenue);
          }
          
          // Transaction count: prioritize normalized, fallback to raw_data
          const transactionCountForRecord = extractValue(record.transaction_count,
            ['transaction_count', 'transactions_count', 'count', 'number_of_transactions'], 1);
          transactionCount += transactionCountForRecord || 1;
          
          // Get currency from first record (assuming all records in group have same currency)
          if (!currency || currency === 'EUR') {
            currency = record.currency || 
              rawData.currency || 
              rawData.currency_code || 
              'EUR';
          }
        });
        
        // Calculate averages and percentages
        const avgRevenuePerTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        const avgVatRate = vatRateCount > 0 ? vatRateSum / vatRateCount : 0;
        const maxTransactionValue = transactionValues.length > 0 ? Math.max(...transactionValues) : 0;
        const minTransactionValue = transactionValues.length > 0 ? Math.min(...transactionValues) : 0;
        
        // Calculate payment method percentages
        const totalPaymentRevenue = totalCashRevenue + totalCardRevenue + totalDigitalRevenue + totalOtherRevenue;
        const cashPercentage = totalPaymentRevenue > 0 ? (totalCashRevenue / totalPaymentRevenue) * 100 : 0;
        const cardPercentage = totalPaymentRevenue > 0 ? (totalCardRevenue / totalPaymentRevenue) * 100 : 0;
        const digitalPercentage = totalPaymentRevenue > 0 ? (totalDigitalRevenue / totalPaymentRevenue) * 100 : 0;
        const otherPercentage = totalPaymentRevenue > 0 ? (totalOtherRevenue / totalPaymentRevenue) * 100 : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          total_revenue: Math.round(totalRevenue), // No decimals
          transaction_count: transactionCount,
          avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction), // No decimals
          // VAT fields
          total_revenue_excl_vat: Math.round(totalRevenueExclVat), // No decimals
          total_revenue_incl_vat: Math.round(totalRevenueInclVat), // No decimals
          total_vat_amount: Math.round(totalVatAmount), // No decimals
          avg_vat_rate: Math.round(avgVatRate * 100) / 100,
          // Payment method fields
          total_cash_revenue: Math.round(totalCashRevenue), // No decimals
          total_card_revenue: Math.round(totalCardRevenue), // No decimals
          total_digital_revenue: Math.round(totalDigitalRevenue), // No decimals
          total_other_revenue: Math.round(totalOtherRevenue), // No decimals
          // Payment method percentages
          cash_percentage: Math.round(cashPercentage * 100) / 100,
          card_percentage: Math.round(cardPercentage * 100) / 100,
          digital_percentage: Math.round(digitalPercentage * 100) / 100,
          other_percentage: Math.round(otherPercentage * 100) / 100,
          // Transaction metrics
          max_transaction_value: Math.round(maxTransactionValue), // No decimals
          min_transaction_value: Math.round(minTransactionValue), // No decimals
          // Additional fields
          currency: currency,
          net_revenue: Math.round(totalNetRevenue), // No decimals
          gross_revenue: Math.round(totalGrossRevenue) // No decimals
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_revenue_days_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Revenue days aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Revenue days aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}
