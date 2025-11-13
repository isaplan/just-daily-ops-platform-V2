/**
 * Finance Dashboard Service
 * Handles data fetching for Finance Dashboard
 */

import type {
  RevenueData,
  SalesIntelligenceData,
  Location,
  PeriodType,
  DailyRevenueBreakdown,
} from "@/models/finance/dashboard.model";
import { getPeriodRange, formatDateForQuery } from "@/lib/dateUtils";
import { createClient } from "@/integrations/supabase/client";

/**
 * Calculate date range based on period and current date
 */
function getDateRange(period: PeriodType, date: Date): { start: string; end: string } {
  const validDate = date && !isNaN(date.getTime()) ? date : new Date();
  
  const start = new Date(validDate);
  const end = new Date(validDate);
  
  try {
    switch (period) {
      case "day":
        // Same day
        break;
      case "week":
        // Get Monday of the week
        const dayOfWeek = validDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(validDate.getDate() + mondayOffset);
        end.setDate(start.getDate() + 6);
        break;
      case "month":
        start.setDate(1);
        end.setMonth(validDate.getMonth() + 1, 0);
        break;
      case "quarter":
        const quarter = Math.floor(validDate.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth(quarter * 3 + 3, 0);
        break;
      case "year":
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
    }
  } catch (error) {
    console.error("Error calculating date range:", error);
    const today = new Date();
    return {
      start: today.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  }
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const today = new Date();
    return {
      start: today.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  }
  
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/**
 * Fetch revenue data from Supabase
 */
export async function fetchRevenueData(
  period: PeriodType,
  currentDate: Date,
  selectedLocation: string | null
): Promise<RevenueData> {
  const { start, end } = getDateRange(period, currentDate);
  const supabase = createClient();
  
  // Fetch processed sales data
  let query = supabase
    .from("bork_sales_data")
    .select("*")
    .eq("category", "STEP6_PROCESSED_DATA")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });
  
  if (selectedLocation) {
    query = query.eq("location_id", selectedLocation);
  }
  
  const { data: salesData, error: salesError } = await query;
  
  if (salesError) {
    throw new Error(salesError.message);
  }
  
  // Calculate revenue metrics
  const totalRevenue =
    salesData?.reduce((sum, sale) => {
      const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
      return sum + revenue;
    }, 0) || 0;
  
  // Group by date for daily breakdown
  const dailyBreakdownMap = salesData?.reduce(
    (acc: Record<string, DailyRevenueBreakdown>, sale) => {
      const date = sale.date;
      const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
      const profit = revenue * 0.3; // Simplified profit calculation
      
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, profit: 0, transactions: 0 };
      }
      
      acc[date].revenue += revenue;
      acc[date].profit += profit;
      acc[date].transactions += 1;
      
      return acc;
    },
    {}
  ) || {};
  
  const dailyBreakdown = Object.values(dailyBreakdownMap).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate growth (simplified - would need historical data)
  const revenueGrowth = 12.5; // Placeholder
  
  return {
    totalRevenue,
    dailyBreakdown,
    revenueGrowth,
  };
}

/**
 * Fetch sales intelligence data from Supabase
 */
export async function fetchSalesIntelligence(
  period: PeriodType,
  currentDate: Date,
  locationId: string | null
): Promise<SalesIntelligenceData> {
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
  
  const importIds = imports?.map((i) => i.id) || [];
  
  if (importIds.length === 0) {
    return {
      topProducts: [],
      topCategories: [],
    };
  }
  
  // Get items data
  const { data: items, error: itemsError } = await supabase
    .from("sales_import_items")
    .select("product_name, quantity, total_price_inc_btw, main_category, sub_category")
    .in("sales_import_id", importIds);
  
  if (itemsError) throw itemsError;
  
  // Aggregate by product
  const productMap = new Map<
    string,
    { quantity: number; revenue: number; category: string }
  >();
  
  items?.forEach((item) => {
    const existing =
      productMap.get(item.product_name) || {
        quantity: 0,
        revenue: 0,
        category: item.main_category || "",
      };
    existing.quantity += item.quantity || 0;
    existing.revenue += item.total_price_inc_btw || 0;
    productMap.set(item.product_name, existing);
  });
  
  // Convert to array and sort by revenue
  const topProducts = Array.from(productMap.entries())
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
  
  const topCategories = Array.from(categoryMap.entries())
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
}

/**
 * Fetch locations from Supabase
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

