/**
 * PNL Balance Analysis Service Layer
 * Data fetching functions for PNL Balance Analysis page
 */

import { createClient } from "@/integrations/supabase/client";
import {
  Location,
  ComparisonData,
  HierarchyData,
  AnalysisQueryParams,
} from "@/models/finance/pnl-balance-analysis.model";

/**
 * Fetch all locations
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("locations").select("*").order("name");
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch comparison data
 */
export async function fetchComparisonData(params: AnalysisQueryParams): Promise<ComparisonData> {
  const urlParams = new URLSearchParams({
    location: params.location,
    year: params.year.toString(),
    month: params.month.toString(),
  });
  
  const response = await fetch(`/api/finance/pnl-balance/compare-cogs?${urlParams}`);
  if (!response.ok) throw new Error("Failed to fetch comparison data");
  
  return response.json();
}

/**
 * Fetch hierarchy data
 */
export async function fetchHierarchyData(params: AnalysisQueryParams): Promise<HierarchyData> {
  const urlParams = new URLSearchParams({
    location: params.location,
    year: params.year.toString(),
    month: params.month.toString(),
  });
  
  const response = await fetch(`/api/finance/pnl-balance/cogs-hierarchy?${urlParams}`);
  if (!response.ok) throw new Error("Failed to fetch hierarchy data");
  
  return response.json();
}
