/**
 * Finance P&L Analysis Service
 * Handles data fetching for P&L Analysis page
 */

import type {
  Location,
  DateRange,
  CategorySelection,
  CategoryData,
  PnLData,
  PnLTimeSeriesPoint,
  MetricType,
} from "@/models/finance/pnl.model";
import { createClient } from "@/integrations/supabase/client";

/**
 * Aggregate P&L data from raw records
 */
function aggregatePnLData(data: any[]): PnLData {
  const totals = data.reduce(
    (acc, record) => {
      const amount = Number(record.amount) || 0;
      const category = record.category?.toLowerCase() || "";

      // Map PowerBI categories to P&L structure
      // Revenue categories: keep amounts as-is
      // Cost/Expense categories: multiply by -1 to convert negative to positive
      if (
        category === "netto-omzet" ||
        category === "overige bedrijfsopbrengsten" ||
        category ===
          "opbrengst van vorderingen die tot de vaste activa behoren en van effecten"
      ) {
        acc.revenue += amount; // Revenue: keep as-is
      } else if (category === "kostprijs van de omzet") {
        acc.cogs += -1 * amount; // COGS: convert negative to positive
      } else if (category === "lasten uit hoofde van personeelsbeloningen") {
        acc.labor += -1 * amount; // Labor: convert negative to positive
      } else if (category === "overige bedrijfskosten") {
        acc.opex += -1 * amount; // OPEX: convert negative to positive
      } else if (
        category === "afschrijvingen op immateriële en materiële vaste activa"
      ) {
        acc.depreciation += -1 * amount; // Depreciation: convert negative to positive
      } else if (category === "financiële baten en lasten") {
        acc.financial += -1 * amount; // Financial: convert negative to positive
      }

      return acc;
    },
    {
      revenue: 0,
      cogs: 0,
      labor: 0,
      opex: 0,
      depreciation: 0,
      financial: 0,
    }
  );

  const gross_profit = totals.revenue - totals.cogs;
  const ebitda = gross_profit - totals.labor - totals.opex + totals.depreciation;

  return {
    revenue: totals.revenue,
    gross_profit,
    ebitda,
    labor_cost: totals.labor,
    other_costs: totals.opex,
    cogs: totals.cogs,
    financial_costs: totals.financial,
  };
}

/**
 * Fetch P&L summary data from Supabase
 */
export async function fetchPnLSummary(
  locationId: string | null,
  dateRange: DateRange | null
): Promise<PnLData | null> {
  if (!dateRange) return null;

  const supabase = createClient();
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;

  let query = supabase.from("powerbi_pnl_data").select("*");

  // Filter by year and month range
  if (startYear === endYear) {
    query = query.eq("year", startYear).gte("month", startMonth).lte("month", endMonth);
  } else {
    query = query.or(
      `and(year.eq.${startYear},month.gte.${startMonth}),` +
        `and(year.eq.${endYear},month.lte.${endMonth})` +
        (endYear - startYear > 1
          ? `,and(year.gt.${startYear},year.lt.${endYear})`
          : "")
    );
  }

  // Location filter
  if (locationId && locationId !== "all") {
    query = query.eq("location_id", locationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return aggregatePnLData(data || []);
}

/**
 * Group data by month
 */
function groupByMonth(data: any[]) {
  const grouped = new Map<string, any>();

  data.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, "0")}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        revenue: 0,
        cogs: 0,
        labor: 0,
        opex: 0,
        depreciation: 0,
        financial: 0,
      });
    }

    const totals = grouped.get(monthKey);
    const amount = Number(row.amount) || 0;
    const category = row.category?.toLowerCase() || "";

    // Map PowerBI categories to P&L structure
    if (
      category === "netto-omzet" ||
      category === "overige bedrijfsopbrengsten" ||
      category ===
        "opbrengst van vorderingen die tot de vaste activa behoren en van effecten"
    ) {
      totals.revenue += amount;
    } else if (category === "kostprijs van de omzet") {
      totals.cogs += -1 * amount;
    } else if (category === "lasten uit hoofde van personeelsbeloningen") {
      totals.labor += -1 * amount;
    } else if (category === "overige bedrijfskosten") {
      totals.opex += -1 * amount;
    } else if (
      category === "afschrijvingen op immateriële en materiële vaste activa"
    ) {
      totals.depreciation += -1 * amount;
    } else if (category === "financiële baten en lasten") {
      totals.financial += -1 * amount;
    }
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({ period, totals }));
}

/**
 * Extract metric value from summary totals
 */
function extractMetricFromSummary(totals: any, metric: MetricType): number {
  switch (metric) {
    case "revenue":
      return totals.revenue;
    case "gross_profit":
      return totals.revenue - totals.cogs;
    case "ebitda":
      return totals.revenue - totals.cogs - totals.labor - totals.opex + totals.depreciation;
    case "labor_cost":
      return totals.labor;
    case "other_costs":
      return totals.opex;
    default:
      return 0;
  }
}

/**
 * Fetch P&L time series data
 * Uses aggregated table for consistency with P&L balance page
 */
export async function fetchPnLTimeSeries(
  locationId: string | null,
  dateRange: DateRange | null,
  metric: MetricType
): Promise<PnLTimeSeriesPoint[]> {
  if (!dateRange) return [];

  const supabase = createClient();
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;

  // Use aggregated table (same as P&L balance page)
  // Query for each year separately to avoid complex OR queries
  const allData: any[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    let query = supabase
      .from("powerbi_pnl_aggregated")
      .select("year, month, location_id, revenue_total, cost_of_sales_total, inkoopwaarde_handelsgoederen, labor_total, lonen_en_salarissen, other_costs_total, overige_bedrijfskosten, resultaat")
      .eq("year", year);

        // Filter by month range for this year
        if (year === startYear && year === endYear) {
          // Same year: filter by month range
          if (startMonth === 1 && endMonth === 12) {
            // All months - no filter needed
          } else if (startMonth === endMonth) {
            // Single month
            query = query.eq("month", startMonth);
          } else {
            // Month range - use both filters
            query = query.gte("month", startMonth).lte("month", endMonth);
          }
        } else if (year === startYear) {
          // First year: from startMonth to December
          if (startMonth > 1) {
            query = query.gte("month", startMonth);
          }
          // If startMonth is 1, no filter needed (get all months)
        } else if (year === endYear) {
          // Last year: from January to endMonth
          if (endMonth < 12) {
            query = query.lte("month", endMonth);
          }
          // If endMonth is 12, no filter needed (get all months)
        }
        // Middle years: no month filter (get all months)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data) {
      allData.push(...data);
    }
  }

  // Group by month and extract metric from aggregated fields
  const grouped = new Map<string, any>();

  allData.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        revenue: 0,
        cogs: 0,
        labor: 0,
        opex: 0,
        depreciation: 0,
        financial: 0
      });
    }

    const totals = grouped.get(monthKey);
    
    // Use aggregated fields directly
    totals.revenue += row.revenue_total || 0;
    totals.cogs += Math.abs(row.cost_of_sales_total || row.inkoopwaarde_handelsgoederen || 0);
    totals.labor += Math.abs(row.labor_total || row.lonen_en_salarissen || 0);
    totals.opex += Math.abs(row.other_costs_total || row.overige_bedrijfskosten || 0);
    // Note: depreciation and financial costs might not be in aggregated table
    // If needed, we can add them later
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({
      period,
      value: extractMetricFromSummary(totals, metric),
    }));
}

/**
 * Map subcategory to GL account patterns for precise filtering
 */
function getGLAccountPatterns(category: string, subcategory: string): string[] {
  const patterns: Record<string, Record<string, string[]>> = {
    Labor: {
      "Contract Workers": ["601", "602", "603", "604", "605", "606"],
      "Flex Workers": ["607", "608"],
      "Kitchen (Contract)": ["601", "602"],
      "Service (Contract)": ["603", "604"],
      "Kitchen (Flex)": ["607"],
      "Service (Flex)": ["608"],
    },
    Revenue: {
      "Food": ["800", "801", "802", "803"],
      "Beverages": ["810", "811", "812", "813", "814"],
    },
    COGS: {
      "Kitchen": ["400", "401", "402"],
      "Beverages": ["410", "411", "412", "413"],
    },
  };

  return patterns[category]?.[subcategory] || [];
}

/**
 * Group line items by month and sum amounts
 */
function groupByMonthForCategory(
  data: any[]
): Array<{ period: string; value: number }> {
  const grouped = new Map<string, number>();

  data.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, "0")}`;
    const currentValue = grouped.get(monthKey) || 0;
    grouped.set(monthKey, currentValue + (Number(row.amount) || 0));
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}

/**
 * Fetch P&L data by category
 */
export async function fetchPnLByCategory(
  locationId: string | null,
  dateRange: DateRange | null,
  selectedCategories: CategorySelection[]
): Promise<CategoryData[]> {
  if (!dateRange || selectedCategories.length === 0) {
    return [];
  }

  const supabase = createClient();
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;

  const results: CategoryData[] = [];

  // Fetch data for each selected category
  for (const selection of selectedCategories) {
    let query = supabase
      .from("pnl_line_items")
      .select(
        "year, month, category_level_1, category_level_2, category_level_3, gl_account, amount"
      );

    // Date range filter
    if (startYear === endYear) {
      query = query
        .eq("year", startYear)
        .gte("month", startMonth)
        .lte("month", endMonth);
    } else {
      query = query.or(
        `and(year.eq.${startYear},month.gte.${startMonth}),` +
          `and(year.eq.${endYear},month.lte.${endMonth})` +
          (endYear - startYear > 1
            ? `,and(year.gt.${startYear},year.lt.${endYear})`
            : "")
      );
    }

    // Location filter
    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    // Category filter
    query = query.eq("category_level_1", selection.category);

    // Subcategory filter using GL account patterns
    if (selection.subcategory) {
      const glPatterns = getGLAccountPatterns(selection.category, selection.subcategory);
      if (glPatterns.length > 0) {
        const orConditions = glPatterns.map((pattern) => `gl_account.ilike.%${pattern}%`).join(",");
        query = query.or(orConditions);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by month and sum amounts
    const grouped = groupByMonthForCategory(data || []);

    results.push({
      category: selection.category,
      subcategory: selection.subcategory,
      data: grouped,
    });
  }

  return results;
}

/**
 * Fetch locations from Supabase (excluding HNHG locations)
 */
export async function fetchLocations(): Promise<Location[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []).filter((loc) => !loc.name.toLowerCase().includes("hnhg"));
}

/**
 * Get unique location/year/month combinations for reprocessing
 */
export async function getReprocessCombinations(): Promise<
  Array<{ locationId: string; year: number; month: number; importId: string }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("powerbi_pnl_data")
    .select("location_id, year, month, import_id");

  if (error) throw error;

  // Create unique combinations
  const uniqueCombinations = Array.from(
    new Set(
      (data || []).map((d) => `${d.location_id}|${d.year}|${d.month}|${d.import_id}`)
    )
  ).map((key) => {
    const [locationId, year, month, importId] = key.split("|");
    return {
      locationId,
      year: parseInt(year),
      month: parseInt(month),
      importId,
    };
  });

  return uniqueCombinations;
}

