/**
 * Eitje Environment Utilities
 * 
 * This module provides utility functions for managing and resolving Eitje environment IDs.
 * Eitje environments represent different business locations or entities in the Eitje system.
 */

import { createClient } from "@/integrations/supabase/client";

/**
 * Resolve Eitje environment IDs (external ids) for a given location UUID by
 * matching the location name to eitje_environments.raw_data.name
 * (case-insensitive). Uses `eitje_id` to avoid schema mismatch errors.
 */
export async function getEnvIdsForLocation(locationId: string): Promise<number[]> {
  const supabase = createClient();

  // Fetch location name by id
  const { data: locs, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .limit(1);

  if (locErr || !locs?.[0]?.name) return [];
  const locationName = String(locs[0].name).toLowerCase();

  // Fetch all environments and match by raw_data.name
  const { data: envs, error: envErr } = await supabase
    .from("eitje_environments")
    .select("eitje_id, raw_data");

  if (envErr) return [];

  return (envs || [])
    .filter((e: { raw_data?: { name?: string } }) => (e.raw_data?.name || "").toLowerCase() === locationName)
    .map((e: { eitje_id: number }) => e.eitje_id)
    .filter((id: number | null | undefined): id is number => id != null);
}
