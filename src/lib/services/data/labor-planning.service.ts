/**
 * Labor Planning Service Layer
 * Data fetching functions for Labor Planning page
 */

import { createClient } from "@/integrations/supabase/client";
import {
  Location,
  LocationOption,
  PlanningRecord,
  PlanningDataResponse,
  PlanningQueryParams,
} from "@/models/data/labor-planning.model";

/**
 * Fetch locations (excluding HNHG locations)
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
 * Generate location options
 */
export function generateLocationOptions(locations: Location[]): LocationOption[] {
  return [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];
}

/**
 * Fetch environment IDs for a location
 */
export async function fetchEnvironmentIds(
  selectedLocation: string,
  locations: Location[]
): Promise<number[] | null> {
  if (selectedLocation === "all") return null;

  const supabase = createClient();
  try {
    const { data: locsData } = await supabase.from("locations").select("id, name");

    const selectedLoc = locsData?.find((loc: { id: string; name: string }) => loc.id === selectedLocation);
    if (!selectedLoc) return [];

    const { data: allEnvs, error } = await supabase.from("eitje_environments").select("id, raw_data");

    if (error) {
      console.error("Error fetching environments:", error);
      return [];
    }

    const matchedIds = (allEnvs || [])
      .filter((env: { id: number; raw_data?: { name?: string } }) => {
        const envName = env.raw_data?.name || "";
        return envName.toLowerCase() === selectedLoc.name.toLowerCase();
      })
      .map((env: { id: number }) => env.id);

    return matchedIds;
  } catch (error) {
    console.error("Error in environment ID query:", error);
    return [];
  }
}

/**
 * Fetch planning data
 */
export async function fetchPlanningData(params: PlanningQueryParams): Promise<PlanningDataResponse> {
  const supabase = createClient();

  let query = supabase.from("eitje_planning_shifts_processed").select("*", { count: "exact" });

  // Apply date filters
  if (params.startDate && params.endDate) {
    query = query.gte("date", params.startDate).lte("date", params.endDate);
  }

  // Apply location filter
  if (params.selectedLocation !== "all" && params.environmentIds) {
    if (params.environmentIds.length > 0) {
      query = query.in("environment_id", params.environmentIds);
    }
  }

  // Apply ordering
  query = query.order("date", { ascending: false });

  // Apply pagination
  const from = (params.currentPage - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;
  query = query.range(from, to);

  const { data: records, error: queryError, count } = await query;

  if (queryError) throw queryError;

  // Normalize records
  const recordsWithNames = (records || []).map((record: PlanningRecord) => ({
    ...record,
    user_name:
      record.user_name ||
      `${record.user_first_name || ""} ${record.user_last_name || ""}`.trim() ||
      `User ${record.user_id}`,
    environment_name: record.environment_name || `Location ${record.environment_id}`,
    team_name: record.team_name || (record.team_id ? `Team ${record.team_id}` : null),
  }));

  return {
    records: recordsWithNames,
    total: count || 0,
  };
}



