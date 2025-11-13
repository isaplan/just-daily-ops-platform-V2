/**
 * Finance Labor Analytics Service Layer
 * Data fetching functions for labor analytics
 */

import { createClient } from "@/integrations/supabase/client";
import type { Location, LaborData, LaborQueryParams } from "@/models/finance/labor.model";

/**
 * Fetch all locations
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
 * Fetch labor data for a given date range and location
 * TODO: Replace mock data with actual labor data queries
 */
export async function fetchLaborData(
  params: LaborQueryParams
): Promise<LaborData> {
  // Mock data for now - replace with actual labor data queries
  // This should query from labor-related tables (e.g., eitje_processed_hours, labor_costs, etc.)
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



