/**
 * Settings Eitje API Service
 * Handles data fetching and operations for Eitje API settings
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  EitjeCredentials,
  SyncResult,
  RawDataRecord,
  DataStats,
  MonthlyProgress,
  DateChunk,
} from "@/models/settings/eitje-api.model";

/**
 * Load credentials from API
 */
export async function fetchCredentials(): Promise<EitjeCredentials | null> {
  const result = await safeFetch<{ credentials: EitjeCredentials }>("/api/eitje/credentials");
  
  if (result.success && result.data?.credentials) {
    return result.data.credentials;
  }
  return null;
}

/**
 * Save credentials to API
 */
export async function saveCredentials(credentials: EitjeCredentials): Promise<boolean> {
  const result = await safeFetch("/api/eitje/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  
  return result.success === true;
}

/**
 * Test connection to Eitje API
 */
export async function testConnection(credentials: EitjeCredentials): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await safeFetch<{ success: boolean; error?: string }>("/api/eitje/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: credentials.base_url,
      apiKey: credentials.api_key,
      additional_config: credentials.additional_config,
    }),
  });
  
  return {
    success: result.success === true && result.data?.success === true,
    error: result.error || result.data?.error,
  };
}

/**
 * Load raw data from API
 */
export async function fetchRawData(): Promise<RawDataRecord[]> {
  const result = await safeFetch<{ data: RawDataRecord[] }>("/api/eitje/raw-data");
  
  if (result.success && result.data) {
    return result.data.data || [];
  }
  return [];
}

/**
 * Calculate data statistics
 */
export function calculateDataStats(data: RawDataRecord[]): DataStats {
  if (data.length === 0) {
    return {
      totalRecords: 0,
      totalRevenue: 0,
      totalQuantity: 0,
      dateRange: { start: "", end: "" },
    };
  }

  const totalRevenue = data.reduce((sum, record) => sum + record.revenue, 0);
  const totalQuantity = data.reduce((sum, record) => sum + record.quantity, 0);
  const dates = data.map((record) => record.date).sort();

  return {
    totalRecords: data.length,
    totalRevenue,
    totalQuantity,
    dateRange: {
      start: dates[0] || "",
      end: dates[dates.length - 1] || "",
    },
  };
}

/**
 * Chunk large date ranges into 7-day chunks
 */
export function chunkDateRange(startDate: string, endDate: string): DateChunk[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const chunks: DateChunk[] = [];

  const currentStart = new Date(start);

  while (currentStart <= end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6); // 7 days total

    // Don't go beyond the original end date
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }

    chunks.push({
      start: currentStart.toISOString().split("T")[0],
      end: currentEnd.toISOString().split("T")[0],
    });

    // Move to next chunk
    currentStart.setDate(currentStart.getDate() + 7);
  }

  return chunks;
}

/**
 * Load monthly progress for a specific month with detailed endpoint data
 */
export async function fetchMonthProgress(
  year: number,
  month: number
): Promise<any> {
  try {
    const endpoints = [
      "environments",
      "teams",
      "users",
      "shift_types",
      "time_registration_shifts",
      "revenue_days",
    ];
    const endpointData: Record<string, any> = {};

    // Load data for each endpoint
    for (const endpoint of endpoints) {
      try {
        const result = await safeFetch(
          `/api/eitje/endpoint-status?endpoint=${endpoint}&year=${year}&month=${month}`
        );

        if (result.success && result.data?.data) {
          const endpointDataObj = result.data.data;
          const hasRawData = endpointDataObj.rawDataCount > 0;
          const hasAggregatedData = endpointDataObj.aggregatedDataCount > 0;

          let status = "not_synced";
          if (hasAggregatedData) {
            status = "processed";
          } else if (hasRawData) {
            status = "synced";
          }

          endpointData[endpoint] = {
            recordsCount: endpointDataObj.rawDataCount || 0,
            status,
            lastSync: endpointDataObj.lastSync,
          };
        } else {
          endpointData[endpoint] = {
            recordsCount: 0,
            status: "not_synced",
          };
        }
      } catch (endpointError) {
        console.error(
          `Failed to load ${endpoint} for ${year}-${month}:`,
          endpointError
        );
        endpointData[endpoint] = {
          recordsCount: 0,
          status: "not_synced",
        };
      }
    }

    return { endpoints: endpointData };
  } catch (error) {
    console.error(`Failed to load progress for ${year}-${month}:`, error);
    return null;
  }
}

/**
 * Load V2 progress for a specific month
 */
export async function fetchMonthProgressV2(
  year: number,
  month: number
): Promise<any> {
  const result = await safeFetch(
    `/api/eitje/v2/progress?year=${year}&month=${month}`
  );

  if (result.success && result.data) {
    return result.data;
  }
  return null;
}

/**
 * Process V2 data for a specific month
 */
export async function processV2Month(
  year: number,
  month: number
): Promise<{ success: boolean; error?: string }> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Process raw → processed_v2
  const processResult = await safeFetch<{ success: boolean; error?: string }>(
    `/api/eitje/v2/process?startDate=${startDate}&endDate=${endDate}`,
    {
      method: "POST",
    }
  );

  if (!processResult.success || !processResult.data?.success) {
    return {
      success: false,
      error: processResult.error || processResult.data?.error || "Failed to process data",
    };
  }

  // Aggregate processed_v2 → aggregated_v2
  // Use a longer timeout for aggregation (can take time with batching)
  const aggregateController = new AbortController();
  const aggregateTimeout = setTimeout(() => aggregateController.abort(), 5 * 60 * 1000); // 5 minutes timeout

  try {
    const aggregateResult = await safeFetch<{ success: boolean; error?: string }>(
      `/api/eitje/v2/aggregate?startDate=${startDate}&endDate=${endDate}`,
      {
        method: "POST",
        signal: aggregateController.signal,
      }
    );

    clearTimeout(aggregateTimeout);

    if (!aggregateResult.success || !aggregateResult.data?.success) {
      return {
        success: false,
        error: aggregateResult.error || aggregateResult.data?.error || "Failed to aggregate data",
      };
    }

    return { success: true };
  } catch (fetchError) {
    clearTimeout(aggregateTimeout);
    if (fetchError instanceof Error && fetchError.name === "AbortError") {
      return {
        success: false,
        error:
          "Aggregation timed out after 5 minutes. The operation may still be processing in the background. Please check the server logs.",
      };
    }
    throw fetchError;
  }
}
