import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { PeriodType, getPeriodRange, formatDateForQuery } from "@/lib/dateUtils";
import { SourceType } from "@/pages/departments/FinanceDataViewer";

interface UseFinanceDataParams {
  sourceType: SourceType;
  locationIds: string[];
  periodType: PeriodType;
  currentDate: Date;
  searchQuery: string;
  page: number;
  limit: number;
}

export function useFinanceData({
  sourceType,
  locationIds,
  periodType,
  currentDate,
  searchQuery,
  page,
  limit,
}: UseFinanceDataParams) {
  const query = useQuery({
    queryKey: ["finance-data", sourceType, locationIds, periodType, currentDate, searchQuery, page, limit],
    queryFn: async () => {
      const supabase = createClient();
      const dateRange = getPeriodRange(periodType, currentDate);
      const offset = (page - 1) * limit;

      // Fetch data based on source type
      if (sourceType === "sales" || sourceType === "all") {
        const query = supabase
          .from("sales_import_items")
          .select(`
            *,
            sales_imports!inner(
              location_id,
              locations(name)
            )
          `, { count: "exact" })
          .gte("sale_timestamp", formatDateForQuery(dateRange.start))
          .lte("sale_timestamp", formatDateForQuery(dateRange.end))
          .order("sale_timestamp", { ascending: false });

        if (locationIds.length > 0) {
          query.in("sales_imports.location_id", locationIds);
        }

        if (searchQuery) {
          query.ilike("product_name", `%${searchQuery}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        // Transform data to include location name
        const transformedData = data?.map(item => ({
          ...item,
          location_name: (item.sales_imports as any)?.locations?.name || "Unknown",
        })) || [];

        return { data: transformedData, totalCount: count || 0 };
      }

      // Labor and productivity data removed - use Eitje API sync instead
      if (sourceType === "labor" || sourceType === "productivity") {
        return { data: [], totalCount: 0 };
      }

      if (sourceType === "pnl") {
        const query = supabase
          .from("powerbi_pnl_data")
          .select(`
            *,
            locations(name)
          `, { count: "exact" })
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (locationIds.length > 0) {
          query.in("location_id", locationIds);
        }

        if (searchQuery) {
          query.or(`category.ilike.%${searchQuery}%,subcategory.ilike.%${searchQuery}%,gl_account.ilike.%${searchQuery}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        const transformedData = data?.map(item => ({
          ...item,
          location_name: (item.locations as any)?.name || "Unknown",
        })) || [];

        return { data: transformedData, totalCount: count || 0 };
      }

      if (sourceType === "warehouse_summary") {
        const query = supabase
          .from("view_finance_summary" as any)
          .select("*", { count: "exact" })
          .order("full_date", { ascending: false });

        if (locationIds.length > 0) {
          query.in("location_id", locationIds);
        }

        if (searchQuery) {
          query.ilike("location_name", `%${searchQuery}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        return { data: data || [], totalCount: count || 0 };
      }

      if (sourceType === "warehouse_facts") {
        const query = supabase
          .from("fact_financial_monthly" as any)
          .select(`
            *,
            dim_date!inner(full_date, year, month, period_name),
            dim_location!inner(location_name),
            dim_gl_account!inner(category, subcategory, account_type)
          `, { count: "exact" })
          .order("date_key", { ascending: false });

        if (locationIds.length > 0) {
          query.in("location_key", locationIds);
        }

        if (searchQuery) {
          query.or(`dim_location.location_name.ilike.%${searchQuery}%,dim_gl_account.category.ilike.%${searchQuery}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        const transformedData = (data as any)?.map((item: any) => ({
          ...item,
          location_name: item.dim_location?.location_name || "Unknown",
          category: item.dim_gl_account?.category || "Unknown",
          subcategory: item.dim_gl_account?.subcategory || "-",
          account_type: item.dim_gl_account?.account_type || "-",
          period_name: item.dim_date?.period_name || "-",
        })) || [];

        return { data: transformedData, totalCount: count || 0 };
      }

      if (sourceType === "warehouse_kpis") {
        const query = supabase
          .from("agg_finance_kpis_monthly" as any)
          .select(`
            *,
            dim_date!inner(full_date, period_name),
            dim_location!inner(location_name)
          `, { count: "exact" })
          .order("date_key", { ascending: false });

        if (locationIds.length > 0) {
          query.in("location_key", locationIds);
        }

        if (searchQuery) {
          query.ilike("dim_location.location_name", `%${searchQuery}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        const transformedData = (data as any)?.map((item: any) => ({
          ...item,
          location_name: item.dim_location?.location_name || "Unknown",
          period_name: item.dim_date?.period_name || "-",
        })) || [];

        return { data: transformedData, totalCount: count || 0 };
      }

      return { data: [], totalCount: 0 };
    },
  });

  return {
    data: query.data?.data || [],
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}