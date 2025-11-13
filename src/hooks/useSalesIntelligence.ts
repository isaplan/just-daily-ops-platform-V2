import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { PeriodType, getPeriodRange, formatDateForQuery } from "@/lib/dateUtils";

interface ProductPerformance {
  productName: string;
  quantity: number;
  revenue: number;
  profit?: number;
  category?: string;
}

export function useSalesIntelligence(
  period: PeriodType,
  currentDate: Date,
  locationId: string | null
) {
  return useQuery({
    queryKey: ["sales-intelligence", period, currentDate, locationId],
    queryFn: async () => {
      const supabase = createClient();
      const range = getPeriodRange(period, currentDate);

      // Get sales imports in range
      let importsQuery = supabase
        .from("sales_imports")
        .select("id")
        .gte("sales_date", formatDateForQuery(range.start))
        .lte("sales_date", formatDateForQuery(range.end));

      if (locationId) {
        importsQuery = importsQuery.eq("location_id", locationId);
      }

      const { data: imports, error: importsError } = await importsQuery;
      if (importsError) throw importsError;

      const importIds = imports?.map(i => i.id) || [];

      if (importIds.length === 0) {
        return {
          topProducts: [] as ProductPerformance[],
          topCategories: [] as ProductPerformance[],
        };
      }

      // Get items data
      const { data: items, error: itemsError } = await supabase
        .from("sales_import_items")
        .select("product_name, quantity, total_price_inc_btw, main_category, sub_category")
        .in("sales_import_id", importIds);

      if (itemsError) throw itemsError;

      // Aggregate by product
      const productMap = new Map<string, { quantity: number; revenue: number; category: string }>();
      
      items?.forEach((item) => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0, category: item.main_category || "" };
        existing.quantity += item.quantity || 0;
        existing.revenue += item.total_price_inc_btw || 0;
        productMap.set(item.product_name, existing);
      });

      // Convert to array and sort by revenue
      const topProducts: ProductPerformance[] = Array.from(productMap.entries())
        .map(([name, data]) => ({
          productName: name,
          quantity: data.quantity,
          revenue: data.revenue,
          category: data.category,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Aggregate by category
      const categoryMap = new Map<string, { quantity: number; revenue: number }>();
      
      items?.forEach((item) => {
        const category = item.main_category || "Unknown";
        const existing = categoryMap.get(category) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 0;
        existing.revenue += item.total_price_inc_btw || 0;
        categoryMap.set(category, existing);
      });

      const topCategories: ProductPerformance[] = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          productName: name,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        topProducts,
        topCategories,
      };
    },
    enabled: true,
  });
}