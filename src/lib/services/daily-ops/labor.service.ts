/**
 * Daily Ops Labor Service Layer
 * Data fetching for labor analytics
 */

import { createClient } from "@/integrations/supabase/client";
import { LaborData, LaborQueryParams, Location } from "@/models/daily-ops/labor.model";

/**
 * Fetch locations
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch labor data
 * Currently returns mock data - will be replaced with actual queries
 */
export async function fetchLaborData(
  params: LaborQueryParams
): Promise<LaborData> {
  // Mock data for now - replace with actual labor data queries
  return {
    totalHours: 1240,
    totalCost: 18600,
    totalRevenue: 45000,
    productivity: 3.63,
    avgRate: 15.0,
    efficiency: 87.5,
    peakHours: 18,
    activeStaff: 12,
  };
}




