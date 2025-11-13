/**
 * Finance Sales Performance Service
 * Handles data fetching for Sales Performance page
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  SalesDataRecord,
  Location,
  DateRange,
  CategorySelection,
  CategoryData,
  DataSourceStatus,
  TimeGranularity,
} from "@/models/finance/sales.model";
import { createClient } from "@/integrations/supabase/client";

/**
 * Fetch aggregated sales data from API
 */
export async function fetchAggregatedSalesData(
  locationFilter: string | string[] | "all",
  dateRange: DateRange | null,
  includeVat: boolean = false
): Promise<SalesDataRecord[]> {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return [];
  }

  const params = new URLSearchParams();

  // Add location filter
  if (locationFilter !== "all") {
    if (Array.isArray(locationFilter)) {
      if (locationFilter.length > 0 && locationFilter.every((id) => id && id.trim() !== "")) {
        params.append("locationIds", locationFilter.join(","));
      }
    } else {
      if (locationFilter && locationFilter.trim() !== "") {
        params.append("locationIds", locationFilter);
      }
    }
  }

  // Add date range
  params.append("startDate", dateRange.start.toISOString().split("T")[0]);
  params.append("endDate", dateRange.end.toISOString().split("T")[0]);

  // Add VAT preference
  params.append("includeVat", includeVat.toString());

  // Add pagination
  params.append("limit", "1000");
  params.append("page", "1");

  const response = await safeFetch(`/api/sales/aggregated?${params.toString()}`);
  const result = await response.json();

  if (!result.success) {
    // If the table doesn't exist yet, return empty data instead of throwing
    if (
      result.error?.includes("Could not find the table") ||
      result.error?.includes("relation") ||
      result.error?.includes("does not exist")
    ) {
      console.log("[fetchAggregatedSalesData] Aggregated table not found, returning empty data");
      return [];
    }
    throw new Error(result.error || "Failed to fetch sales data");
  }

  return result.data || [];
}

/**
 * Fetch sales data by category from Supabase
 */
export async function fetchSalesByCategory(
  locationFilter: string | string[] | null,
  dateRange: DateRange | null,
  selectedCategories: CategorySelection[],
  granularity: TimeGranularity = "month",
  includeVat: boolean = false
): Promise<CategoryData[]> {
  if (!dateRange || selectedCategories.length === 0) {
    return [];
  }

  const supabase = createClient();
  const results: CategoryData[] = [];
  const revenueField = includeVat ? "revenue_inc_vat" : "revenue_ex_vat";

  // Fetch data for each selected category
  for (const selection of selectedCategories) {
    // Fetch all data with pagination
    let allCategoryData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("bork_sales_data")
        .select(`date, category, ${revenueField}`)
        .range(from, from + pageSize - 1);

      // Date range filter
      query = query
        .gte("date", dateRange.start.toISOString().split("T")[0])
        .lte("date", dateRange.end.toISOString().split("T")[0]);

      // Location filter
      if (Array.isArray(locationFilter) && locationFilter.length > 0) {
        query = query.in("location_id", locationFilter as string[]);
      } else if (locationFilter && locationFilter !== "all") {
        query = query.eq("location_id", locationFilter as string);
      }

      // Category filter - use ilike for flexible matching
      query = query.ilike("category", `%${selection.category}%`);

      // Subcategory filter if specified
      if (selection.subcategory) {
        query = query.ilike("category", `%${selection.subcategory}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allCategoryData = [...allCategoryData, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Group by time period and sum revenue
    const grouped = groupByTimePeriod(allCategoryData, granularity, revenueField);

    results.push({
      category: selection.category,
      subcategory: selection.subcategory,
      data: grouped,
    });
  }

  return results;
}

/**
 * Group sales by time period and sum revenue
 */
function groupByTimePeriod(
  data: any[],
  granularity: TimeGranularity,
  revenueField: string
): Array<{ period: string; value: number }> {
  const grouped = new Map<string, number>();

  data.forEach((row) => {
    const date = new Date(row.date);
    let periodKey: string;

    if (granularity === "month") {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (granularity === "quarter") {
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      periodKey = `${date.getFullYear()}-Q${quarter}`;
    } else {
      periodKey = `${date.getFullYear()}`;
    }

    const currentValue = grouped.get(periodKey) || 0;
    grouped.set(periodKey, currentValue + (Number(row[revenueField]) || 0));
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}

/**
 * Fetch locations from Supabase
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("locations").select("*").order("name");
  if (error) throw error;
  return data || [];
}

/**
 * Check data source status
 */
export async function fetchDataSourceStatus(): Promise<DataSourceStatus> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bork_sales_aggregated")
    .select("id")
    .limit(1);

  if (error) {
    // If table doesn't exist, return empty status
    if (
      error.message?.includes("Could not find the table") ||
      error.message?.includes("relation") ||
      error.message?.includes("does not exist")
    ) {
      return {
        hasProcessedData: false,
        recordCount: 0,
      };
    }
    throw error;
  }

  return {
    hasProcessedData: data && data.length > 0,
    recordCount: data ? data.length : 0,
  };
}

/**
 * Trigger sales data refresh/aggregation
 */
export async function refreshSalesData(): Promise<{
  success: boolean;
  summary?: {
    totalAggregatedDates: number;
    [key: string]: unknown;
  };
  error?: string;
}> {
  const response = await safeFetch("/api/bork/aggregate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return await response.json();
}



