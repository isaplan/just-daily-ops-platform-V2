import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, year, month, startDate, endDate } = body;
    
    if (!endpoint) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameter: endpoint" 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Calculate date range from year/month or use provided dates
    let actualStartDate: string;
    let actualEndDate: string;
    
    if (body.startDate && body.endDate) {
      actualStartDate = body.startDate;
      actualEndDate = body.endDate;
    } else if (year && month) {
      const now = new Date();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
      
      actualStartDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      if (isCurrentMonth) {
        // Use "now" (1 hour ago for safety) if current month
        const endDate = new Date();
        endDate.setHours(endDate.getHours() - 1);
        actualEndDate = endDate.toISOString().split('T')[0];
      } else {
        // Use full month for past months
        const lastDay = new Date(year, month, 0).getDate();
        actualEndDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameters: either (year, month) or (startDate, endDate) must be provided" 
      }, { status: 400 });
    }
    
    // Process based on endpoint
    if (endpoint === 'time_registration_shifts') {
      await processTimeRegistrationShifts(supabase, actualStartDate, actualEndDate);
    } else if (endpoint === 'planning_shifts') {
      await processPlanningShifts(supabase, actualStartDate, actualEndDate);
    } else if (endpoint === 'revenue_days') {
      await processRevenueDays(supabase, actualStartDate, actualEndDate);
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Unsupported endpoint: ${endpoint}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${endpoint} for ${actualStartDate} to ${actualEndDate}` 
    });
    
  } catch (error) {
    console.error('[API /eitje/aggregate] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Process time registration shifts into aggregated format
 */
async function processTimeRegistrationShifts(
  supabase: any,
  startDate: string,
  endDate: string
) {
  console.log(`[API /eitje/aggregate] Processing time registration shifts for ${startDate} to ${endDate}`);
  
  // Read from processed table (all fields already normalized)
  const { data: processedData, error } = await supabase
    .from('eitje_time_registration_shifts_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }
  
  console.log(`[API /eitje/aggregate] Found ${processedData?.length || 0} processed records`);
  
  if (!processedData || processedData.length === 0) {
    console.log('[API /eitje/aggregate] No processed data found, skipping aggregation');
    return;
  }
  
  // Group by date, environment_id, team_id, and user_id (per worker per day)
  const groupedData = new Map();
  
  for (const record of processedData) {
    const date = record.date;
    const environmentId = record.environment_id;
    const teamId = record.team_id;
    const userId = record.user_id;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping record without environment_id:`, record.id);
      continue;
    }
    
    // Log if user_id is missing for debugging
    if (!userId) {
      console.warn(`[API /eitje/aggregate] Record ${record.id} missing user_id`);
      // Still process but with null user_id - will be grouped separately
    }
    
    // Group by date, environment, team, and user (one row per worker per day)
    // Use 'null-user' as placeholder if user_id is missing
    const key = `${date}-${environmentId}-${teamId || 'null'}-${userId || 'null-user'}`;
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        team_id: teamId,
        user_id: userId,
        total_hours_worked: 0,
        total_breaks_minutes: 0,
        total_wage_cost: 0,
        shift_count: 0
      });
    }
    
    const group = groupedData.get(key);
    
    // Use normalized columns directly (no JSONB parsing needed)
    const hoursWorked = Number(record.hours_worked || record.hours || record.total_hours || 0) ||
      (record.start && record.end 
        ? (new Date(record.end).getTime() - new Date(record.start).getTime()) / (1000 * 60 * 60)
        : 0);
    
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_actual || 0);
    const actualHours = Math.max(0, hoursWorked - (breakMinutes / 60));
    
    group.total_hours_worked += actualHours;
    group.total_breaks_minutes += breakMinutes;
    
    // Extract wage cost from normalized columns
    let wageCost = Number(record.wage_cost || record.costs_wage || record.costs_wage_cost || 
      record.labor_cost || record.total_cost || 0);
    
    // If still no cost, use fallback calculation (€15/hour)
    if (!wageCost || wageCost === 0) {
      wageCost = actualHours * 15;
    }
    
    group.total_wage_cost += wageCost;
    group.shift_count += 1;
  }
  
  // Convert to array - each row represents one worker per day
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgWagePerHour = group.total_hours_worked > 0
      ? group.total_wage_cost / group.total_hours_worked
      : 0;
    
    return {
      date: group.date,
      environment_id: group.environment_id,
      team_id: group.team_id,
      user_id: group.user_id,
      total_hours_worked: Math.round(group.total_hours_worked * 100) / 100,
      total_breaks_minutes: group.total_breaks_minutes,
      total_wage_cost: Math.round(group.total_wage_cost * 100) / 100,
      shift_count: group.shift_count,
      employee_count: 1, // Always 1 since this is per worker
      avg_hours_per_employee: Math.round(group.total_hours_worked * 100) / 100, // Same as total_hours for single worker
      avg_wage_per_hour: Math.round(avgWagePerHour * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated records`);
  
  // Upsert aggregated data (handle duplicates) - now grouped by user_id too
  if (aggregatedData.length > 0) {
    console.log(`[API /eitje/aggregate] Upserting ${aggregatedData.length} records with user_id`);
    const { error: upsertError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id,team_id,user_id'
      });
      
    if (upsertError) {
      console.error('[API /eitje/aggregate] Upsert error:', upsertError);
      // If constraint doesn't exist, try with old constraint
      if (upsertError.message?.includes('constraint') || upsertError.code === '42P10') {
        console.log('[API /eitje/aggregate] Trying with old constraint (without user_id)...');
        const { error: retryError } = await supabase
          .from('eitje_labor_hours_aggregated')
          .upsert(aggregatedData.map(({ user_id, ...rest }) => rest), {
            onConflict: 'date,environment_id,team_id'
          });
        if (retryError) {
          throw new Error(`Failed to upsert aggregated data: ${retryError.message}`);
        }
      } else {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log('[API /eitje/aggregate] Successfully processed time registration shifts');
  } else {
    console.log('[API /eitje/aggregate] No data to upsert');
  }
}

/**
 * Process planning shifts into aggregated format
 */
async function processPlanningShifts(
  supabase: any,
  startDate: string,
  endDate: string
) {
  console.log(`[API /eitje/aggregate] Processing planning shifts for ${startDate} to ${endDate}`);
  
  // Read from processed table (all fields already normalized)
  const { data: processedData, error } = await supabase
    .from('eitje_planning_shifts_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }
  
  console.log(`[API /eitje/aggregate] Found ${processedData?.length || 0} processed planning shift records`);
  
  if (!processedData || processedData.length === 0) {
    console.log('[API /eitje/aggregate] No processed planning shift data found, skipping aggregation');
    return;
  }
  
  // Group by date, environment_id, team_id, and user_id (per worker per day)
  const groupedData = new Map();
  
  for (const record of processedData) {
    const date = record.date;
    const environmentId = record.environment_id;
    const teamId = record.team_id;
    const userId = record.user_id;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping planning shift record without environment_id:`, record.id);
      continue;
    }
    
    // Group by date, environment, team, and user (one row per worker per day)
    const key = `${date}-${environmentId}-${teamId || 'null'}-${userId || 'null-user'}`;
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        team_id: teamId,
        user_id: userId,
        planned_hours_total: 0,
        total_breaks_minutes: 0,
        total_planned_cost: 0,
        shift_count: 0,
        confirmed_count: 0,
        cancelled_count: 0,
        planned_count: 0
      });
    }
    
    const group = groupedData.get(key);
    
    // Use normalized columns directly
    const plannedHours = Number(record.planned_hours || record.hours_planned || record.hours || record.total_hours || 0);
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_planned || 0);
    
    group.planned_hours_total += plannedHours;
    group.total_breaks_minutes += breakMinutes;
    
    // Extract planned cost from normalized columns
    let plannedCost = Number(record.planned_cost || record.wage_cost || record.costs_wage || record.costs_wage_cost || 0);
    
    // If still no cost, use fallback calculation (€15/hour)
    if (!plannedCost || plannedCost === 0) {
      plannedCost = plannedHours * 15;
    }
    
    group.total_planned_cost += plannedCost;
    group.shift_count += 1;
    
    // Count status
    if (record.confirmed === true) {
      group.confirmed_count += 1;
    } else if (record.cancelled === true) {
      group.cancelled_count += 1;
    } else {
      group.planned_count += 1;
    }
  }
  
  // Convert to array - each row represents one worker per day
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgHoursPerEmployee = group.planned_hours_total; // Same as total for single worker
    const avgCostPerHour = group.planned_hours_total > 0
      ? group.total_planned_cost / group.planned_hours_total
      : 0;
    
    return {
      date: group.date,
      environment_id: group.environment_id,
      team_id: group.team_id,
      user_id: group.user_id,
      planned_hours_total: Math.round(group.planned_hours_total * 100) / 100,
      total_breaks_minutes: group.total_breaks_minutes,
      total_planned_cost: Math.round(group.total_planned_cost * 100) / 100,
      shift_count: group.shift_count,
      employee_count: 1, // Always 1 since this is per worker
      confirmed_count: group.confirmed_count,
      cancelled_count: group.cancelled_count,
      planned_count: group.planned_count,
      avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
      avg_cost_per_hour: Math.round(avgCostPerHour * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated planning shift records`);
  
  // Upsert aggregated data (handle duplicates) - grouped by user_id
  if (aggregatedData.length > 0) {
    console.log(`[API /eitje/aggregate] Upserting ${aggregatedData.length} planning shift records with user_id`);
    const { error: upsertError } = await supabase
      .from('eitje_planning_hours_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id,team_id,user_id'
      });
      
    if (upsertError) {
      console.error('[API /eitje/aggregate] Upsert error:', upsertError);
      // If constraint doesn't exist, try with old constraint
      if (upsertError.message?.includes('constraint') || upsertError.code === '42P10') {
        console.log('[API /eitje/aggregate] Trying with old constraint (without user_id)...');
        const { error: retryError } = await supabase
          .from('eitje_planning_hours_aggregated')
          .upsert(aggregatedData.map(({ user_id, ...rest }) => rest), {
            onConflict: 'date,environment_id,team_id'
          });
        if (retryError) {
          throw new Error(`Failed to upsert aggregated planning shift data: ${retryError.message}`);
        }
      } else {
        throw new Error(`Failed to upsert aggregated planning shift data: ${upsertError.message}`);
      }
    }
    
    console.log('[API /eitje/aggregate] Successfully processed planning shifts');
  } else {
    console.log('[API /eitje/aggregate] No planning shift data to upsert');
  }
}

/**
 * Process revenue days into aggregated format
 */
async function processRevenueDays(supabase: any, startDate: string, endDate: string) {
  console.log(`[API /eitje/aggregate] Processing revenue days for ${startDate} to ${endDate}`);
  
  // Read from processed table (all fields already normalized)
  const { data: processedData, error } = await supabase
    .from('eitje_revenue_days_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }
  
  console.log(`[API /eitje/aggregate] Found ${processedData?.length || 0} processed revenue records`);
  
  if (!processedData || processedData.length === 0) {
    console.log('[API /eitje/aggregate] No processed revenue data found, skipping aggregation');
    return;
  }
  
  // Group by date and environment_id - Use normalized columns directly
  const groupedData = new Map();
  
  for (const record of processedData) {
    // Use normalized columns directly (no JSONB parsing needed)
    const date = record.date;
    const environmentId = record.environment_id;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping revenue record without environment_id:`, record.id);
      continue;
    }
    
    const key = `${date}-${environmentId}`;
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        total_revenue: 0,
        total_revenue_excl_vat: 0,
        total_revenue_incl_vat: 0,
        total_vat_amount: 0,
        total_cash_revenue: 0,
        total_card_revenue: 0,
        total_digital_revenue: 0,
        total_other_revenue: 0,
        total_net_revenue: 0,
        total_gross_revenue: 0,
        transaction_count: 0,
        vat_rate_sum: 0,
        vat_rate_count: 0,
        transaction_values: [],
        currency: 'EUR'
      });
    }
    
    const group = groupedData.get(key);
    
    // Use normalized columns directly (no JSONB parsing needed)
    // Revenue: amt_in_cents is in cents, convert to euros
    const amtInCents = Number(record.amt_in_cents || 0);
    const revenue = amtInCents > 0 ? Math.round(amtInCents / 100) : Number(record.total_revenue || record.revenue || 0);
    const revenueExclVat = Number(record.net_revenue || record.revenue_excl_vat || 0);
    const revenueInclVat = Number(record.gross_revenue || record.revenue_incl_vat || 0);
    const vatAmount = Number(record.vat_amount || 0);
    const vatPercentage = Number(record.vat_percentage || record.vat_rate || 0);
    const cashRev = Number(record.cash_revenue || 0);
    const cardRev = Number(record.card_revenue || 0);
    const digitalRev = Number(record.digital_revenue || 0);
    const otherRev = Number(record.other_revenue || 0);
    const netRev = Number(record.net_revenue || 0);
    const grossRev = Number(record.gross_revenue || 0);
    
    group.total_revenue += revenue;
    group.total_revenue_excl_vat += revenueExclVat;
    group.total_revenue_incl_vat += revenueInclVat;
    group.total_vat_amount += vatAmount;
    group.total_cash_revenue += cashRev;
    group.total_card_revenue += cardRev;
    group.total_digital_revenue += digitalRev;
    group.total_other_revenue += otherRev;
    group.total_net_revenue += netRev;
    group.total_gross_revenue += grossRev;
    
    if (vatPercentage > 0) {
      group.vat_rate_sum += vatPercentage;
      group.vat_rate_count += 1;
    }
    
    if (revenue > 0) {
      group.transaction_values.push(revenue);
    }
    
    // Transaction count: use normalized column
    const transactionCount = Number(record.transaction_count || record.transactions_count || record.count || 1);
    group.transaction_count += transactionCount || 1;
    
    // Currency: use normalized column
    if (!group.currency || group.currency === 'EUR') {
      group.currency = record.currency || 'EUR';
    }
  }
  
  // Convert to array and calculate all metrics
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgRevenuePerTransaction = group.transaction_count > 0
      ? group.total_revenue / group.transaction_count
      : 0;
    
    const avgVatRate = group.vat_rate_count > 0
      ? group.vat_rate_sum / group.vat_rate_count
      : 0;
    
    const maxTransactionValue = group.transaction_values.length > 0
      ? Math.max(...group.transaction_values)
      : 0;
    
    const minTransactionValue = group.transaction_values.length > 0
      ? Math.min(...group.transaction_values)
      : 0;
    
    // Calculate payment method percentages
    const totalPaymentRevenue = group.total_cash_revenue + group.total_card_revenue + 
                                group.total_digital_revenue + group.total_other_revenue;
    const cashPercentage = totalPaymentRevenue > 0 
      ? (group.total_cash_revenue / totalPaymentRevenue) * 100 
      : 0;
    const cardPercentage = totalPaymentRevenue > 0 
      ? (group.total_card_revenue / totalPaymentRevenue) * 100 
      : 0;
    const digitalPercentage = totalPaymentRevenue > 0 
      ? (group.total_digital_revenue / totalPaymentRevenue) * 100 
      : 0;
    const otherPercentage = totalPaymentRevenue > 0 
      ? (group.total_other_revenue / totalPaymentRevenue) * 100 
      : 0;
    
    return {
      date: group.date,
      environment_id: group.environment_id,
      total_revenue: Math.round(group.total_revenue), // No decimals
      transaction_count: group.transaction_count,
      avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction), // No decimals
      // VAT fields
      total_revenue_excl_vat: Math.round(group.total_revenue_excl_vat), // No decimals
      total_revenue_incl_vat: Math.round(group.total_revenue_incl_vat), // No decimals
      total_vat_amount: Math.round(group.total_vat_amount), // No decimals
      avg_vat_rate: Math.round(avgVatRate * 100) / 100, // Percentage keeps 2 decimals
      // Payment method fields
      total_cash_revenue: Math.round(group.total_cash_revenue), // No decimals
      total_card_revenue: Math.round(group.total_card_revenue), // No decimals
      total_digital_revenue: Math.round(group.total_digital_revenue), // No decimals
      total_other_revenue: Math.round(group.total_other_revenue), // No decimals
      // Payment method percentages
      cash_percentage: Math.round(cashPercentage * 100) / 100, // Keep 2 decimals
      card_percentage: Math.round(cardPercentage * 100) / 100,
      digital_percentage: Math.round(digitalPercentage * 100) / 100,
      other_percentage: Math.round(otherPercentage * 100) / 100,
      // Transaction metrics
      max_transaction_value: Math.round(maxTransactionValue), // No decimals
      min_transaction_value: Math.round(minTransactionValue), // No decimals
      // Additional fields
      currency: group.currency,
      net_revenue: Math.round(group.total_net_revenue), // No decimals
      gross_revenue: Math.round(group.total_gross_revenue), // No decimals
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated revenue records`);
  
  // Upsert into aggregated table
  const { error: insertError } = await supabase
    .from('eitje_revenue_days_aggregated')
    .upsert(aggregatedData, {
      onConflict: 'date,environment_id'
    });
    
  if (insertError) {
    throw new Error(`Failed to insert aggregated revenue data: ${insertError.message}`);
  }
  
  console.log('[API /eitje/aggregate] Successfully processed revenue days');
}