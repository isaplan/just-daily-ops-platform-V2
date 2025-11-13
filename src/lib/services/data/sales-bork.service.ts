/**
 * Sales Bork Service Layer
 * Data fetching functions for Bork Sales Data page
 */

import { createClient } from "@/integrations/supabase/client";
import { getEnvIdsForLocation } from "@/lib/eitje/env-utils";
import {
  Location,
  LocationOption,
  SalesRecord,
  SalesDataResponse,
  SalesQueryParams,
} from "@/models/data/sales-bork.model";

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
  return getEnvIdsForLocation(selectedLocation);
}

/**
 * Fetch sales data
 */
export async function fetchSalesData(params: SalesQueryParams): Promise<SalesDataResponse> {
  const supabase = createClient();

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

  // Apply location filter
  if (params.selectedLocation !== "all" && params.environmentIds) {
    if (params.environmentIds.length > 0) {
      query = query.in("environment_id", params.environmentIds);
    } else {
      query = query.eq("environment_id", -999);
    }
  }

  // Apply ordering
  query = query.order("date", { ascending: false });

  // Apply pagination
  const from = (params.currentPage - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;
  query = query.range(from, to);

  const { data: records, error: queryError, count } = await query;

  if (queryError) {
    console.error("Supabase query error:", queryError);
    throw queryError;
  }

  // Fetch environment names
  const recordEnvironmentIds = [
    ...new Set(
      (records || [])
        .map((r: any) => r.environment_id)
        .filter((id: any) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: any) => Number(id))
    ),
  ];
  let environmentMap: Record<number, string> = {};

  if (recordEnvironmentIds.length > 0) {
    try {
      const { data: environments, error: envError } = await supabase
        .from("eitje_environments")
        .select("id, raw_data")
        .in("id", recordEnvironmentIds);

      if (envError) {
        console.error("Error fetching environments:", envError);
      } else if (environments) {
        environmentMap = Object.fromEntries(
          environments.map((env: any) => [
            env.id,
            env.raw_data?.name || `Environment ${env.id}`,
          ])
        );
      }
    } catch (error) {
      console.error("Error in environment query:", error);
    }
  }

  const recordsWithNames: SalesRecord[] = (records || []).map((record: any) => ({
    ...record,
    environment_name: environmentMap[record.environment_id] || null,
  }));

  return {
    records: recordsWithNames,
    total: count || 0,
  };
}



