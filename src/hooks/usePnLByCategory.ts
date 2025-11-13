import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { CategorySelection } from "@/components/finance/CategoryFilterSheet";

interface DateRange {
  start: Date;
  end: Date;
}

interface CategoryData {
  category: string;
  subcategory?: string;
  data: Array<{ period: string; value: number }>;
}

/**
 * Fetch P&L data for multiple selected categories
 * Supports granular filtering by GL account patterns for Labor and Revenue
 */
export function usePnLByCategory(
  locationId: string | null,
  dateRange: DateRange | null,
  selectedCategories: CategorySelection[]
) {
  return useQuery({
    queryKey: ["pnl-by-category", locationId, dateRange, selectedCategories],
    enabled: !!dateRange && selectedCategories.length > 0,
    queryFn: async () => {
      if (!dateRange || selectedCategories.length === 0) return [];

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
          .select("year, month, category_level_1, category_level_2, category_level_3, gl_account, amount");

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
            (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : '')
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
            const orConditions = glPatterns.map(pattern => `gl_account.ilike.%${pattern}%`).join(',');
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
    },
  });
}

/**
 * Map subcategory to GL account patterns for precise filtering
 */
function getGLAccountPatterns(category: string, subcategory: string): string[] {
  const patterns: Record<string, Record<string, string[]>> = {
    Labor: {
      "Contract Workers": ["601", "602", "603", "604", "605", "606"], // Bruto salaris, social, pension
      "Flex Workers": ["607", "608"], // Inhuur via sandstep
      "Kitchen (Contract)": ["601", "602"], // Bruto keuken
      "Service (Contract)": ["603", "604"], // Bruto bediening
      "Kitchen (Flex)": ["607"], // Inhuur keuken
      "Service (Flex)": ["608"], // Inhuur bediening
    },
    Revenue: {
      "Food": ["800", "801", "802", "803"], // Food-related revenue
      "Beverages": ["810", "811", "812", "813", "814"], // Beverage revenue
    },
    COGS: {
      "Kitchen": ["400", "401", "402"], // Kitchen COGS
      "Beverages": ["410", "411", "412", "413"], // Beverage COGS
    },
  };

  return patterns[category]?.[subcategory] || [];
}

/**
 * Group line items by month and sum amounts
 */
function groupByMonth(data: any[]): Array<{ period: string; value: number }> {
  const grouped = new Map<string, number>();

  data.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;
    const currentValue = grouped.get(monthKey) || 0;
    grouped.set(monthKey, currentValue + (Number(row.amount) || 0));
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}