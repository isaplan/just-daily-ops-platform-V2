/**
 * Finance Eitje Data Labor Costs Service Layer
 * Data fetching functions for Eitje aggregated labor costs data
 */

import { createClient } from "@/integrations/supabase/client";
import type {
  Location,
  LocationOption,
  Environment,
  Team,
  LaborCostRecord,
  LaborCostsDataResponse,
  LaborCostsQueryParams,
} from "@/models/finance/eitje-data-labor-costs.model";

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
 * Fetch environment IDs for a given location (matched by name)
 */
export async function fetchEnvironmentIds(
  locationId: string,
  locations: Location[]
): Promise<number[] | null> {
  if (locationId === "all") return null;

  const supabase = createClient();
  try {
    // Get the selected location name
    const selectedLoc = locations.find((loc) => loc.id === locationId);
    if (!selectedLoc) return [];

    // Fetch all environments and match by name
    const { data: allEnvs, error } = await supabase
      .from("eitje_environments")
      .select("id, raw_data");

    if (error) {
      console.error("Error fetching environments:", error);
      return [];
    }

    // Match environment names to location name (case-insensitive)
    const matchedIds = (allEnvs || [])
      .filter((env: Environment) => {
        const envName = env.raw_data?.name || "";
        return envName.toLowerCase() === selectedLoc.name.toLowerCase();
      })
      .map((env: Environment) => env.id);

    return matchedIds;
  } catch (error) {
    console.error("Error in environment ID query:", error);
    return [];
  }
}

/**
 * Fetch aggregated labor costs data with pagination and filters
 */
export async function fetchLaborCostsData(
  params: LaborCostsQueryParams
): Promise<LaborCostsDataResponse> {
  const supabase = createClient();

  // Build query
  let query = supabase
    .from("eitje_labor_hours_aggregated")
    .select(
      `
      id, 
      date, 
      environment_id,
      team_id,
      total_wage_cost, 
      total_hours_worked, 
      total_breaks_minutes, 
      employee_count, 
      shift_count, 
      avg_hours_per_employee, 
      avg_wage_per_hour, 
      updated_at
    `,
      { count: "exact" }
    );

  // Apply date filters
  if (params.startDate && params.endDate) {
    query = query.gte("date", params.startDate).lte("date", params.endDate);
  }

  // Apply location filter - use environmentIds (mapped from location UUID)
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

  // Fetch environment and team names separately
  const recordEnvironmentIds = [
    ...new Set(
      (records || [])
        .map((r: LaborCostRecord) => r.environment_id)
        .filter((id: unknown) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: unknown) => Number(id))
    ),
  ];
  const recordTeamIds = [
    ...new Set(
      (records || [])
        .map((r: LaborCostRecord) => r.team_id)
        .filter((id: unknown) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: unknown) => Number(id))
    ),
  ];

  let environmentMap: Record<number, string> = {};
  let teamMap: Record<number, string> = {};

  // Fetch environments
  if (recordEnvironmentIds.length > 0) {
    try {
      const { data: environments, error: envError } = await supabase
        .from("eitje_environments")
        .select("id, raw_data")
        .in("id", recordEnvironmentIds);

      if (envError) {
        console.error("Error fetching environments:", {
          message: envError.message,
          details: envError.details,
          hint: envError.hint,
          code: envError.code,
        });
      } else if (environments) {
        environmentMap = Object.fromEntries(
          environments.map((env: Environment) => [
            env.id,
            env.raw_data?.name || `Environment ${env.id}`,
          ])
        );
      }
    } catch (error) {
      console.error("Error in environment query:", error);
    }
  }

  // Fetch teams
  if (recordTeamIds.length > 0) {
    try {
      const { data: teams, error: teamError } = await supabase
        .from("eitje_teams")
        .select("id, raw_data")
        .in("id", recordTeamIds);

      if (teamError) {
        console.error("Error fetching teams:", {
          message: teamError.message,
          details: teamError.details,
          hint: teamError.hint,
          code: teamError.code,
        });
      } else if (teams) {
        teamMap = Object.fromEntries(
          teams.map((team: Team) => [team.id, team.raw_data?.name || `Team ${team.id}`])
        );
      }
    } catch (error) {
      console.error("Error in team query:", error);
    }
  }

  // Merge names into records
  const recordsWithNames = (records || []).map((record: LaborCostRecord) => ({
    ...record,
    environment_name: environmentMap[record.environment_id || 0] || null,
    team_name: record.team_id ? (teamMap[record.team_id] || null) : null,
  }));

  // Note: The original page had aggregation logic that grouped by date and team
  // This is kept in the service for now, but could be moved to a utility if needed

  return {
    records: recordsWithNames,
    total: count || recordsWithNames.length,
  };
}



