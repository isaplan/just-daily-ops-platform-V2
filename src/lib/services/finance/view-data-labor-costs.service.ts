/**
 * Finance View Data Labor Costs Service Layer
 * Data fetching functions for labor costs data view
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  LaborCostRecord,
  LaborCostsDataResponse,
  LaborCostsTotals,
  LaborCostsQueryParams,
} from "@/models/finance/view-data-labor-costs.model";

/**
 * Fetch aggregated labor costs data from API
 */
export async function fetchLaborCostsData(params: LaborCostsQueryParams): Promise<LaborCostsDataResponse> {
  const urlParams = new URLSearchParams({
    table: "eitje_labor_hours_aggregated",
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  const result = await safeFetch<{
    success: boolean;
    data?: LaborCostRecord[];
    pagination?: {
      total: number;
      totalPages: number;
    };
    error?: string;
  }>(`/api/raw-data?${urlParams}`);

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch labor costs data");
  }

  const apiData = result.data;

  if (!apiData.success) {
    throw new Error(apiData.error || "Failed to fetch labor costs data");
  }

  // Filter by date if provided
  let records = apiData.data || [];
  if (params.dateFilter) {
    records = records.filter((r: LaborCostRecord) => r.date?.startsWith(params.dateFilter || ""));
  }

  // Calculate totals
  const totalCost = records.reduce((sum: number, r: LaborCostRecord) => sum + (r.total_wage_cost || 0), 0);
  const totalHours = records.reduce((sum: number, r: LaborCostRecord) => sum + (r.total_hours_worked || 0), 0);
  const avgCostPerHour = totalHours > 0 ? totalCost / totalHours : 0;

  const totals: LaborCostsTotals = {
    totalCost,
    totalHours,
    avgCostPerHour,
  };

  return {
    records,
    total: apiData.pagination?.total || 0,
    totalPages: apiData.pagination?.totalPages || 1,
    totals,
  };
}



