/**
 * Finance Eitje Data Locations & Teams Service Layer
 * Data fetching functions for Eitje locations and teams data
 */

import { createClient } from "@/integrations/supabase/client";
import type {
  LocationRecord,
  TeamRecord,
  LocationsDataResponse,
  TeamsDataResponse,
  LocationsQueryParams,
  TeamsQueryParams,
} from "@/models/finance/eitje-data-locations-teams.model";

const ITEMS_PER_PAGE = 50;

/**
 * Fetch locations data with pagination
 */
export async function fetchLocationsData(params: LocationsQueryParams): Promise<LocationsDataResponse> {
  const supabase = createClient();

  const from = (params.page - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;

  const { data: records, error: queryError, count } = await supabase
    .from("eitje_environments")
    .select(
      `
      id,
      eitje_id,
      name,
      description,
      city,
      country,
      is_active,
      raw_data,
      created_at,
      updated_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (queryError) throw queryError;

  return {
    records: records || [],
    total: count || 0,
  };
}

/**
 * Fetch teams data with pagination
 */
export async function fetchTeamsData(params: TeamsQueryParams): Promise<TeamsDataResponse> {
  const supabase = createClient();

  const from = (params.page - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;

  const { data: records, error: queryError, count } = await supabase
    .from("eitje_teams")
    .select(
      `
      id,
      eitje_id,
      name,
      description,
      environment_id,
      is_active,
      raw_data,
      created_at,
      updated_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (queryError) throw queryError;

  return {
    records: records || [],
    total: count || 0,
  };
}



