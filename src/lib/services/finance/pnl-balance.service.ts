/**
 * P&L Balance Service Layer
 * Handles data fetching for P&L Balance page
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  PnLBalanceQueryParams,
  PnLBalanceResponse,
} from "@/models/finance/pnl-balance.model";

/**
 * Fetch aggregated P&L data
 */
export async function fetchPnLAggregatedData(
  params: PnLBalanceQueryParams
): Promise<PnLBalanceResponse> {
  const queryParams = new URLSearchParams({
    year: params.year.toString(),
    location: params.location,
  });

  if (params.month !== undefined) {
    queryParams.append("month", params.month.toString());
  }

  const result = await safeFetch<PnLBalanceResponse>(
    `/api/finance/pnl-aggregated-data?${queryParams.toString()}`
  );

  if (!result.success) {
    return {
      success: false,
      data: [],
      error: result.error || "Failed to fetch P&L data",
    };
  }

  return result.data || { success: true, data: [] };
}



