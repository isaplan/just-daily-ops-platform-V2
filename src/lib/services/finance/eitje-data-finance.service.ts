/**
 * Finance Eitje Data Finance Service Layer
 * Data fetching functions for Eitje finance data
 */

import { createClient } from "@/integrations/supabase/client";
import type {
  Location,
  LocationOption,
  Environment,
  FinanceRecord,
  FinanceDataResponse,
  FinanceQueryParams,
} from "@/models/finance/eitje-data-finance.model";

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
 * Fetch finance data with pagination and filters
 */
export async function fetchFinanceData(
  params: FinanceQueryParams
): Promise<FinanceDataResponse> {
  const supabase = createClient();

  // Build query
  let query = supabase
    .from("eitje_revenue_days_aggregated")
    .select(
      `
      id, 
      date, 
      environment_id,
      total_revenue, 
      transaction_count, 
      avg_revenue_per_transaction,
      total_revenue_excl_vat,
      total_revenue_incl_vat,
      total_vat_amount,
      avg_vat_rate,
      total_cash_revenue,
      total_card_revenue,
      total_digital_revenue,
      total_other_revenue,
      cash_percentage,
      card_percentage,
      digital_percentage,
      other_percentage,
      max_transaction_value,
      min_transaction_value,
      currency,
      net_revenue,
      gross_revenue,
      created_at, 
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
    // by filtering for an impossible value
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
    console.error("Supabase query error:", {
      message: queryError.message,
      details: queryError.details,
      hint: queryError.hint,
      code: queryError.code,
      error: queryError,
    });
    throw queryError;
  }

  // Fetch environment names separately
  // Filter out null/undefined and ensure we have valid integers
  const recordEnvironmentIds = [
    ...new Set(
      (records || [])
        .map((r: FinanceRecord) => r.environment_id)
        .filter((id: unknown) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: unknown) => Number(id))
    ),
  ];

  let environmentMap: Record<number, string> = {};

  if (recordEnvironmentIds.length > 0) {
    try {
      // Tables use id (not eitje_environment_id) and name is in raw_data
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
        // Extract name from raw_data
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

  // Merge environment names into records
  const recordsWithNames = (records || []).map((record: FinanceRecord) => ({
    ...record,
    environment_name: environmentMap[record.environment_id] || null,
  }));

  return {
    records: recordsWithNames,
    total: count || 0,
  };
}



