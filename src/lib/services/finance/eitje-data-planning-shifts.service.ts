/**
 * Finance Eitje Data Planning Shifts Service Layer
 * Data fetching functions for Eitje processed planning shifts data
 */

import { createClient } from "@/integrations/supabase/client";
import { getEnvIdsForLocation } from "@/lib/eitje/env-utils";
import type {
  Location,
  LocationOption,
  PlanningShiftRecord,
  PlanningShiftsDataResponse,
  PlanningShiftsQueryParams,
} from "@/models/finance/eitje-data-planning-shifts.model";

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
 * Fetch planning shifts data with pagination and filters
 */
export async function fetchPlanningShiftsData(
  params: PlanningShiftsQueryParams
): Promise<PlanningShiftsDataResponse> {
  const supabase = createClient();

  // Base query: processed planning shifts
  let query = supabase
    .from("eitje_planning_shifts_processed")
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
      planned_hours,
      hours,
      total_hours,
      break_minutes,
      break_minutes_planned,
      planned_cost,
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

  // Process records - normalize data
  const recordsWithNames = (records || []).map((r: PlanningShiftRecord) => ({
    ...r,
    environment_name: r.environment_name || null,
    team_name: r.team_name || null,
    user_name: r.user_name || String(r.user_id),
  }));

  // Sort by date desc, then user name
  recordsWithNames.sort((a: PlanningShiftRecord, b: PlanningShiftRecord) => {
    const dc = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dc !== 0) return dc;
    return String(a.user_name || "").localeCompare(String(b.user_name || ""));
  });

  return {
    records: recordsWithNames,
    total: count || recordsWithNames.length,
  };
}



