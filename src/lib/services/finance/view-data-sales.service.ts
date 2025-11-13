/**
 * Finance View Data Sales Service Layer
 * Data fetching functions for sales data view
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  RevenueRecord,
  SalesDataResponse,
  SalesTotals,
  SalesQueryParams,
} from "@/models/finance/view-data-sales.model";

/**
 * Fetch aggregated revenue data from API
 */
export async function fetchSalesData(params: SalesQueryParams): Promise<SalesDataResponse> {
  const urlParams = new URLSearchParams({
    table: "eitje_revenue_days_aggregated",
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  const result = await safeFetch<{
    success: boolean;
    data?: RevenueRecord[];
    pagination?: {
      total: number;
      totalPages: number;
    };
    error?: string;
  }>(`/api/raw-data?${urlParams}`);

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch revenue data");
  }

  const apiData = result.data;

  if (!apiData.success) {
    throw new Error(apiData.error || "Failed to fetch revenue data");
  }

  // Filter by date if provided
  let records = apiData.data || [];
  if (params.dateFilter) {
    records = records.filter((r: RevenueRecord) => r.date?.startsWith(params.dateFilter || ""));
  }

  // Calculate totals
  const totalRevenue = records.reduce((sum: number, r: RevenueRecord) => sum + (r.total_revenue || 0), 0);
  const totalTransactions = records.reduce((sum: number, r: RevenueRecord) => sum + (r.transaction_count || 0), 0);
  const totalCash = records.reduce((sum: number, r: RevenueRecord) => sum + (r.total_cash_revenue || 0), 0);
  const totalCard = records.reduce((sum: number, r: RevenueRecord) => sum + (r.total_card_revenue || 0), 0);
  const totalDigital = records.reduce((sum: number, r: RevenueRecord) => sum + (r.total_digital_revenue || 0), 0);

  const totals: SalesTotals = {
    totalRevenue,
    totalTransactions,
    totalCash,
    totalCard,
    totalDigital,
    avgTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
  };

  return {
    records,
    total: apiData.pagination?.total || 0,
    totalPages: apiData.pagination?.totalPages || 1,
    totals,
  };
}



