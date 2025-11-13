/**
 * Settings Bork API Service Layer
 * Data fetching for Bork API settings
 */

import { createClient } from "@/integrations/supabase/client";
import { safeFetch } from "@/lib/safe-fetch";
import type {
  ApiConnection,
  ConnectionTestResult,
  ValidationResult,
  RevenueValidationResult,
  SyncResult,
  ProcessResult,
  MonthlySyncStatus,
  SyncParams,
  ProcessParams,
} from "@/models/settings/bork-api.model";

/**
 * Fetch Bork API connections from database
 */
export async function fetchBorkConnections(): Promise<ApiConnection[]> {
  const result = await safeFetch<{ success: boolean; data?: any[] }>(
    "/api/bork/credentials"
  );

  if (!result.success || !result.data?.data) {
    return [];
  }

  const locationNames: Record<string, string> = {
    "550e8400-e29b-41d4-a716-446655440002": "Bar Bea",
    "550e8400-e29b-41d4-a716-446655440001": "Van Kinsbergen",
    "550e8400-e29b-41d4-a716-446655440003": "L'Amour Toujours",
  };

  return result.data.data.map(
    (cred: {
      id: string;
      location_id: string;
      api_key: string;
      api_url: string;
      is_active: boolean;
    }) => ({
      id: cred.id,
      location: locationNames[cred.location_id] || "Unknown",
      locationId: cred.location_id,
      apiKey: cred.api_key,
      baseUrl: cred.api_url,
      isActive: cred.is_active,
    })
  );
}

/**
 * Test Bork connection
 */
export async function testBorkConnection(
  locationId: string,
  testDate?: string
): Promise<ConnectionTestResult> {
  const result = await safeFetch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    recordCount?: number;
    errorMessage?: string;
  }>(`/api/bork/test?locationId=${locationId}`, {
    method: "POST",
    body: testDate ? JSON.stringify({ locationId, testDate }) : JSON.stringify({ locationId }),
    timeout: 30000,
  });

  const connection = await fetchBorkConnections().then(conns => 
    conns.find(c => c.locationId === locationId)
  );

  const message = result.success && result.data?.success === true
    ? `✅ ${connection?.location || "Location"} API Connection Successful! ${result.data?.recordCount || 0} records found.`
    : `❌ ${connection?.location || "Location"} API Connection Failed: ${result.data?.errorMessage || result.error || "Unknown error"}`;

  return {
    locationId,
    success: result.success && result.data?.success === true,
    message,
    data: result.data?.data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sync Bork data for a date range
 */
export async function syncBorkData(
  params: SyncParams
): Promise<SyncResult> {
  const result = await safeFetch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
  }>("/api/bork/sync", {
    method: "POST",
    body: JSON.stringify(params),
    timeout: 300000, // 5 minutes
  });

  return {
    success: result.success && result.data?.success === true,
    message: result.data?.message || result.error || "Sync failed",
    data: result.data?.data,
    error: result.error || result.data?.error,
  };
}

/**
 * Process Bork raw data
 */
export async function processBorkData(
  params: ProcessParams
): Promise<ProcessResult> {
  const result = await safeFetch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
  }>("/api/bork/process", {
    method: "POST",
    body: JSON.stringify(params),
    timeout: 300000, // 5 minutes
  });

  return {
    success: result.success && result.data?.success === true,
    message: result.data?.message || result.error || "Processing failed",
    data: result.data?.data,
    error: result.error || result.data?.error,
  };
}

/**
 * Validate Bork data
 */
export async function validateBorkData(params?: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ValidationResult[]> {
  const queryParams = new URLSearchParams();
  if (params?.locationId) queryParams.append("locationId", params.locationId);
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);

  const result = await safeFetch<{
    success: boolean;
    data?: ValidationResult[];
  }>(`/api/bork/validate?${queryParams.toString()}`);

  if (!result.success || !result.data?.data) {
    return [];
  }

  return result.data.data;
}

/**
 * Validate Bork revenue data
 */
export async function validateBorkRevenue(params?: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RevenueValidationResult[]> {
  const queryParams = new URLSearchParams();
  if (params?.locationId) queryParams.append("locationId", params.locationId);
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);

  const result = await safeFetch<{
    success: boolean;
    data?: RevenueValidationResult[];
  }>(`/api/bork/validate-revenue?${queryParams.toString()}`);

  if (!result.success || !result.data?.data) {
    return [];
  }

  return result.data.data;
}

/**
 * Fetch connection status from locations API
 */
export async function fetchConnectionStatus(): Promise<
  Map<string, ConnectionTestResult>
> {
  const result = await safeFetch<{
    success: boolean;
    data?: Array<{
      id: string;
      bork_connection_status: string;
      bork_connection_tested_at: string;
      bork_connection_message: string;
    }>;
  }>("/api/locations");

  const statusMap = new Map<string, ConnectionTestResult>();

  if (result.success && result.data?.data) {
    result.data.data.forEach((loc) => {
      if (loc.bork_connection_status !== "not_tested") {
        statusMap.set(loc.id, {
          locationId: loc.id,
          success: loc.bork_connection_status === "success",
          message: loc.bork_connection_message || "",
          testedAt: loc.bork_connection_tested_at,
        });
      }
    });
  }

  return statusMap;
}

/**
 * Fetch monthly sync status
 */
export async function fetchMonthlySyncStatus(
  locationId: string
): Promise<MonthlySyncStatus> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bork_raw_data")
    .select("date", { count: "exact" })
    .eq("location_id", locationId);

  if (error) {
    return { hasData: false, recordCount: 0 };
  }

  return {
    hasData: (data?.length || 0) > 0,
    recordCount: data?.length || 0,
  };
}

