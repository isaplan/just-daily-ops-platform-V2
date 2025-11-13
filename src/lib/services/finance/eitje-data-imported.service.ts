/**
 * Finance Eitje Data Imported Service Layer
 * Data fetching functions for Eitje raw time registration data
 */

import { createClient } from "@/integrations/supabase/client";
import type {
  Location,
  LocationOption,
  Environment,
  Team,
  User,
  TimeRegistrationRecord,
  TimeRegistrationDataResponse,
  TimeRegistrationQueryParams,
} from "@/models/finance/eitje-data-imported.model";

const ITEMS_PER_PAGE = 50;

/**
 * Helper to detect network errors
 */
export function isNetworkError(error: unknown): boolean {
  const message = (error as { message?: string; details?: string })?.message || 
                  (error as { details?: string })?.details || "";
  return (
    message.includes("Failed to fetch") ||
    message.includes("ERR_CONNECTION_RESET") ||
    message.includes("ERR_TIMED_OUT") ||
    message.includes("ERR_NETWORK_CHANGED") ||
    message.includes("NetworkError") ||
    message.includes("network")
  );
}

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

  if (error) {
    if (isNetworkError(error)) {
      throw new Error("Network connection issue. Please check your internet connection and try again.");
    }
    throw error;
  }
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
      if (isNetworkError(error)) {
        throw new Error("Network connection issue. Please check your internet connection and try again.");
      }
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
    // Re-throw network errors for retry handling
    if (isNetworkError(error)) {
      throw error;
    }
    console.error("Error in environment ID query:", error);
    return [];
  }
}

/**
 * Helper to extract value from raw_data with multiple path attempts
 */
function getFromRawData(rawData: Record<string, unknown>, paths: string[], fallback: unknown = null): unknown {
  for (const path of paths) {
    const keys = path.split(".");
    let value: unknown = rawData;
    for (const key of keys) {
      value = (value as Record<string, unknown>)?.[key];
      if (value === undefined || value === null) break;
    }
    if (value !== undefined && value !== null) {
      // If it's an object, try to extract a primitive value
      if (typeof value === "object" && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        // Try common object properties
        if (obj.name !== undefined) return obj.name;
        if (obj.id !== undefined) return obj.id;
        if (obj.value !== undefined) return obj.value;
        if (obj.label !== undefined) return obj.label;
        // If no common property, return the object (will be handled by toPrimitive)
        return value;
      }
      return value;
    }
  }
  return fallback;
}

/**
 * Helper to ensure we always return a primitive value (never an object)
 */
function toPrimitive(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    // Extract from object
    if (obj.name !== undefined) return String(obj.name);
    if (obj.id !== undefined) return String(obj.id);
    if (obj.value !== undefined) return String(obj.value);
    if (obj.label !== undefined) return String(obj.label);
    // Fallback: stringify
    return JSON.stringify(value).substring(0, 100);
  }
  if (Array.isArray(value)) return value.join(", ");
  return value as string | number;
}

/**
 * Fetch time registration data with pagination and filters
 */
export async function fetchTimeRegistrationData(
  params: TimeRegistrationQueryParams
): Promise<TimeRegistrationDataResponse> {
  const supabase = createClient();

  // Validate that we have date filters
  if (!params.startDate || !params.endDate) {
    console.warn("Missing date filters, returning empty result");
    return {
      records: [],
      total: 0,
    };
  }

  // Build query
  let query = supabase
    .from("eitje_time_registration_shifts_raw")
    .select(
      `
      id,
      eitje_id,
      date,
      user_id,
      team_id,
      environment_id,
      start_time,
      end_time,
      start_datetime,
      end_datetime,
      hours_worked,
      hours,
      total_hours,
      break_minutes,
      breaks,
      break_minutes_actual,
      wage_cost,
      status,
      skill_set,
      shift_type,
      notes,
      raw_data,
      created_at,
      updated_at
    `,
      { count: "exact" }
    );

  // Apply date filters
  query = query.gte("date", params.startDate).lte("date", params.endDate);

  // Apply location filter
  if (params.environmentIds !== null && params.environmentIds && params.environmentIds.length > 0) {
    query = query.in("environment_id", params.environmentIds);
  } else if (params.environmentId && params.environmentId !== "all" && (!params.environmentIds || params.environmentIds.length === 0)) {
    // If location is selected but no environments found, return empty result
    query = query.eq("environment_id", -999);
  }

  // Apply ordering (latest date first)
  query = query.order("date", { ascending: false });

  // Apply pagination
  const from = (params.page - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;
  query = query.range(from, to);

  const { data: records, error: queryError, count } = await query;

  if (queryError) {
    // Check if it's a network error
    const isNetwork = isNetworkError(queryError);

    // Log the error
    console.error("Supabase query error (raw):", queryError);

    // Create a more descriptive error
    const errorMessage = queryError?.message || queryError?.details || "Unknown Supabase error";
    const userMessage = isNetwork
      ? "Network connection issue. Please check your internet connection and try again."
      : `Failed to fetch raw data: ${errorMessage}`;

    throw new Error(userMessage);
  }

  if (!records) {
    console.warn("No records returned from query");
    return {
      records: [],
      total: 0,
    };
  }

  // Fetch environment, team, and user names separately
  const recordEnvironmentIds = [
    ...new Set((records || []).map((r: TimeRegistrationRecord) => r.environment_id).filter(Boolean)),
  ];
  const recordTeamIds = [
    ...new Set((records || []).map((r: TimeRegistrationRecord) => r.team_id).filter(Boolean)),
  ];
  const recordUserIds = [
    ...new Set((records || []).map((r: TimeRegistrationRecord) => r.user_id).filter(Boolean)),
  ];

  let environmentMap: Record<number, string> = {};
  let teamMap: Record<number, string> = {};
  let userMap: Record<number, string> = {};

  // Fetch environments
  if (recordEnvironmentIds.length > 0) {
    try {
      const { data: environments, error: envError } = await supabase
        .from("eitje_environments")
        .select("id, raw_data")
        .in("id", recordEnvironmentIds);

      if (envError) {
        // Only log non-network errors
        if (!isNetworkError(envError)) {
          console.error("Error fetching environments:", envError);
        }
      } else if (environments) {
        environmentMap = Object.fromEntries(
          environments.map((env: Environment) => [
            env.id,
            env.raw_data?.name || `Environment ${env.id}`,
          ])
        );
      }
    } catch (error) {
      // Only log non-network errors
      if (!isNetworkError(error)) {
        console.error("Error in environment query:", error);
      }
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
        // Only log non-network errors
        if (!isNetworkError(teamError)) {
          console.error("Error fetching teams:", teamError);
        }
      } else if (teams) {
        teamMap = Object.fromEntries(
          teams.map((team: Team) => [team.id, team.raw_data?.name || `Team ${team.id}`])
        );
      }
    } catch (error) {
      // Only log non-network errors
      if (!isNetworkError(error)) {
        console.error("Error in team query:", error);
      }
    }
  }

  // Fetch users
  if (recordUserIds.length > 0) {
    try {
      const { data: users, error: userError } = await supabase
        .from("eitje_users")
        .select("eitje_user_id, raw_data")
        .in("eitje_user_id", recordUserIds);

      if (userError) {
        // Only log non-network errors
        if (!isNetworkError(userError)) {
          console.error("Error fetching users:", userError);
        }
      } else if (users) {
        userMap = Object.fromEntries(
          users.map((user: User) => [
            user.eitje_user_id,
            user.raw_data?.name || user.raw_data?.firstName || `User ${user.eitje_user_id}`,
          ])
        );
      }
    } catch (error) {
      // Only log non-network errors
      if (!isNetworkError(error)) {
        console.error("Error in user query:", error);
      }
    }
  }

  // Merge names into records and map raw_data to existing columns
  const recordsWithNames = (records || []).map((record: TimeRegistrationRecord) => {
    const rawData = (record.raw_data || {}) as Record<string, unknown>;

    // Map raw_data fields to existing column structure
    const rawUser = getFromRawData(rawData, ["user.id", "user_id", "user", "employee.id", "employee_id"]);
    const rawTeam = getFromRawData(rawData, ["team.id", "team_id", "team"]);
    const rawEnvironment = getFromRawData(rawData, ["environment.id", "environment_id", "environment", "location.id", "location_id"]);
    const rawStartTime = getFromRawData(rawData, ["start_time", "start", "startDateTime", "start_datetime"]);
    const rawEndTime = getFromRawData(rawData, ["end_time", "end", "endDateTime", "end_datetime"]);
    const rawHours = getFromRawData(rawData, ["hours_worked", "hours", "totalHours", "total_hours"]);
    const rawBreaks = getFromRawData(rawData, ["break_minutes", "breaks", "breakMinutes", "break_minutes_actual"]);
    const rawWageCost = getFromRawData(rawData, ["wage_cost", "wageCost", "costs.wage", "costs.wage_cost", "labor_cost", "laborCost"]);
    const rawShiftType = getFromRawData(rawData, ["shift_type", "shiftType", "type"]);
    const rawStatus = getFromRawData(rawData, ["status", "state"]);

    return {
      ...record,
      // Use normalized values first, fallback to raw_data, ensure primitives
      environment_id: record.environment_id || (rawEnvironment as number) || null,
      team_id: record.team_id || (rawTeam as number) || null,
      user_id: record.user_id || (rawUser as number) || null,
      start_time: record.start_time || record.start_datetime || (rawStartTime as string) || null,
      end_time: record.end_time || record.end_datetime || (rawEndTime as string) || null,
      hours_worked: record.hours_worked || record.hours || record.total_hours || (rawHours as number) || 0,
      break_minutes: record.break_minutes || record.breaks || record.break_minutes_actual || (rawBreaks as number) || 0,
      wage_cost: record.wage_cost || (rawWageCost as number) || null,
      shift_type: toPrimitive(record.shift_type || rawShiftType),
      status: toPrimitive(record.status || rawStatus),
      // Names from lookups
      environment_name: environmentMap[record.environment_id || (rawEnvironment as number)] || null,
      team_name: (record.team_id || (rawTeam as number)) ? (teamMap[record.team_id || (rawTeam as number)] || null) : null,
      user_name: (record.user_id || (rawUser as number)) ? (userMap[record.user_id || (rawUser as number)] || null) : null,
      // Keep full raw_data for inspection
      raw_data_full: rawData,
    };
  });

  return {
    records: recordsWithNames,
    total: count || 0,
  };
}



