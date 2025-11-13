/**
 * Finance Eitje Data Hours Service Layer
 * Data fetching functions for Eitje processed hours data
 */

import { createClient } from "@/integrations/supabase/client";
import { getEnvIdsForLocation } from "@/lib/eitje/env-utils";
import type {
  Location,
  LocationOption,
  ProcessedShiftRecord,
  ProcessedShiftsDataResponse,
  ProcessedShiftsQueryParams,
} from "@/models/finance/eitje-data-hours.model";

const ITEMS_PER_PAGE = 50;

/**
 * Fetch all locations (excluding "All HNHG Locations" and "All HNG Locations")
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .neq("name", "All HNHG Locations")
    .neq("name", "All HNG Locations")
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Generate location options from locations array
 */
export function generateLocationOptions(locations: Location[]): LocationOption[] {
  return [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];
}

/**
 * Fetch environment IDs for a given location using env-utils
 */
export async function fetchEnvironmentIds(locationId: string): Promise<number[] | null> {
  if (locationId === "all") return null;
  return await getEnvIdsForLocation(locationId);
}

/**
 * Fetch processed shifts data with pagination and filters
 */
export async function fetchProcessedShiftsData(
  params: ProcessedShiftsQueryParams
): Promise<ProcessedShiftsDataResponse> {
  const supabase = createClient();

  // Base query: processed shifts
  let query = supabase
    .from("eitje_time_registration_shifts_processed")
    .select(
      `
      id,
      eitje_id,
      date,
      environment_id,
      environment_name,
      team_id,
      team_name,
      user_id,
      user_name,
      start_time,
      end_time,
      hours_worked,
      break_minutes,
      break_minutes_actual,
      wage_cost,
      status,
      shift_type,
      type_name,
      notes,
      remarks,
      created_at,
      updated_at
    `,
      { count: "exact" }
    );

  // Apply date filters
  if (params.startDate && params.endDate) {
    query = query.gte("date", params.startDate).lte("date", params.endDate);
  }

  // Apply location filter - use environmentIds (Eitje environment IDs)
  if (params.environmentIds !== null && params.environmentIds && params.environmentIds.length > 0) {
    query = query.in("environment_id", params.environmentIds);
  } else if (params.environmentId && params.environmentId !== "all" && (!params.environmentIds || params.environmentIds.length === 0)) {
    // If location is selected but no environments found, return empty result
    query = query.eq("environment_id", -999);
  }

  // Apply ordering
  query = query.order("date", { ascending: false });

  // Apply pagination
  const from = (params.page - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;
  query = query.range(from, to);

  const { data: records, error: queryError, count } = await query;

  if (queryError) {
    console.error("Supabase query error:", queryError);
    throw queryError;
  }

  // Process records - calculate hourly rate and normalize data
  const recordsWithNames = (records || []).map((r: ProcessedShiftRecord) => {
    const hours = Number(r.hours_worked ?? 0);
    const breaks = r.break_minutes_actual ?? r.break_minutes ?? 0;
    const wage = r.wage_cost ?? null;
    // Calculate hourly rate
    const hourlyRate = hours > 0 && wage ? Number(wage) / hours : null;

    return {
      id: r.id,
      eitje_id: r.eitje_id,
      date: r.date,
      environment_id: r.environment_id,
      environment_name: r.environment_name || null,
      team_id: r.team_id,
      team_name: r.team_name || null,
      user_id: r.user_id,
      user_name: r.user_name || String(r.user_id),
      start_time: r.start_time,
      end_time: r.end_time,
      hours_worked: hours,
      break_minutes: breaks,
      wage_cost: wage,
      hourly_rate: hourlyRate,
      status: r.status,
      shift_type: r.shift_type,
      type_name: r.type_name,
      notes: r.notes,
      remarks: r.remarks,
      updated_at: r.updated_at ?? null,
    };
  });

  // Sort by date desc, then user name
  recordsWithNames.sort((a: ProcessedShiftRecord, b: ProcessedShiftRecord) => {
    const dc = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dc !== 0) return dc;
    return String(a.user_name || "").localeCompare(String(b.user_name || ""));
  });

  return {
    records: recordsWithNames,
    total: count || recordsWithNames.length,
  };
}



