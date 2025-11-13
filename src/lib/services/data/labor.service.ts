/**
 * Data Labor Service Layer
 * Data fetching for labor data pages
 */

import { createClient } from "@/integrations/supabase/client";
import { safeFetch } from "@/lib/safe-fetch";
import { LaborQueryParams, LaborResponse, Location } from "@/models/data/labor.model";

/**
 * Fetch locations (filtered)
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
 * Fetch processed labor data
 */
export async function fetchProcessedLaborData(
  params: LaborQueryParams
): Promise<LaborResponse> {
  const urlParams = new URLSearchParams({
    endpoint: params.endpoint,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.environmentId) {
    urlParams.append("environmentId", params.environmentId);
  }

  const result = await safeFetch<LaborResponse>(
    `/api/eitje/processed?${urlParams.toString()}`,
    {
      timeout: 30000,
    }
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch labor data");
  }

  if (!result.data.success) {
    throw new Error(result.data.error || "API returned error");
  }

  return result.data;
}




