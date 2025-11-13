/**
 * Operations Locations Service Layer
 * Data fetching for locations management
 */

import { createClient } from "@/integrations/supabase/client";
import { Location } from "@/models/operations/locations.model";

/**
 * Fetch all locations
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");
  
  if (error) throw error;
  return (data || []).map((loc) => ({
    id: loc.id,
    name: loc.name,
  }));
}




