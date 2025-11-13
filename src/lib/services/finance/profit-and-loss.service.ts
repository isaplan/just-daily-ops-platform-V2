/**
 * Profit & Loss Service Layer
 * Data fetching functions for P&L Analysis page
 */

import { createClient } from "@/integrations/supabase/client";
import { Location, DateRange, PnLData, CategoryData, CategorySelection } from "@/models/finance/profit-and-loss.model";

/**
 * Fetch all locations (excluding HNHG locations)
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
 * Fetch P&L summary data from aggregated table
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
        (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : "")
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
 * Aggregate P&L data from raw records
 */
function aggregatePnLData(data: any[]): PnLData {
  const totals = data.reduce(
    (acc, record) => {
      const amount = Number(record.amount) || 0;
      const category = record.category?.toLowerCase() || "";

      // Map PowerBI categories to P&L structure
      if (
        category === "netto-omzet" ||
        category === "overige bedrijfsopbrengsten" ||
        category === "opbrengst van vorderingen die tot de vaste activa behoren en van effecten"
      ) {
        acc.revenue += amount;
      } else if (category === "kostprijs van de omzet") {
        acc.cogs += -1 * amount;
      } else if (category === "lasten uit hoofde van personeelsbeloningen") {
        acc.labor += -1 * amount;
      } else if (category === "overige bedrijfskosten") {
        acc.opex += -1 * amount;
      } else if (category === "afschrijvingen op immateriële en materiële vaste activa") {
        acc.depreciation += -1 * amount;
      } else if (category === "financiële baten en lasten") {
        acc.financial += -1 * amount;
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
 * Fetch P&L data by category
 */
export async function fetchPnLByCategory(
  locationId: string | null,
  dateRange: DateRange | null,
  selectedCategories: CategorySelection[]
): Promise<CategoryData[]> {
  if (!dateRange || selectedCategories.length === 0) return [];

  const supabase = createClient();
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;

  const results: CategoryData[] = [];

  for (const selection of selectedCategories) {
    let query = supabase
      .from("pnl_line_items")
      .select("year, month, category_level_1, category_level_2, category_level_3, gl_account, amount");

    // Date range filter
    if (startYear === endYear) {
      query = query.eq("year", startYear).gte("month", startMonth).lte("month", endMonth);
    } else {
      query = query.or(
        `and(year.eq.${startYear},month.gte.${startMonth}),` +
          `and(year.eq.${endYear},month.lte.${endMonth})` +
          (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : "")
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
    const grouped = groupByMonth(data || []);

    results.push({
      category: selection.category,
      subcategory: selection.subcategory,
      data: grouped,
    });
  }

  return results;
}

/**
 * Map subcategory to GL account patterns
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
      Food: ["800", "801", "802", "803"],
      Beverages: ["810", "811", "812", "813", "814"],
    },
    COGS: {
      Kitchen: ["400", "401", "402"],
      Beverages: ["410", "411", "412", "413"],
    },
  };

  return patterns[category]?.[subcategory] || [];
}

/**
 * Group line items by month
 */
function groupByMonth(data: any[]): Array<{ period: string; value: number }> {
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
 * Reprocess P&L data
 */
export async function reprocessPnLData(): Promise<{ periodsProcessed: number }> {
  const supabase = createClient();
  const { data: rawData, error } = await supabase
    .from("powerbi_pnl_data")
    .select("location_id, year, month, import_id");

  if (error) throw error;

  // Create unique combinations
  const uniqueCombinations = Array.from(
    new Set(rawData?.map((d) => `${d.location_id}|${d.year}|${d.month}|${d.import_id}`))
  ).map((key) => {
    const [locationId, year, month, importId] = key.split("|");
    return { locationId, year: parseInt(year), month: parseInt(month), importId };
  });

  // For now, just return the count - actual processing would be implemented
  return { periodsProcessed: uniqueCombinations.length };
}



