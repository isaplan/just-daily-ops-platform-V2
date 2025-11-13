/**
 * V2 Progress Tracker
 * Functions for tracking V2 processing status
 */

import { createClient } from '@/integrations/supabase/server';

export interface EndpointStatus {
  endpoint: string;
  processedV2Count: number;
  isProcessed: boolean;
  lastProcessed: string | null;
  error?: string;
}

export interface MonthlyProgress {
  year: number;
  month: number;
  endpoints: Record<string, EndpointStatus>;
  allProcessed: boolean;
}

/**
 * Get monthly progress for all endpoints
 */
export async function getMonthlyProgressV2(
  year: number,
  month: number
): Promise<MonthlyProgress | null> {
  try {
    const supabase = await createClient();

    // Endpoints to check (only time_registration_shifts for now)
    const endpoints = ['time_registration_shifts'];
    const endpointData: Record<string, EndpointStatus> = {};

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Check each endpoint
    for (const endpoint of endpoints) {
      const tableName = 'eitje_time_registration_shifts_processed_v2';

      // Count records in processed_v2 for this month
      let allProcessedData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const result = await supabase
          .from(tableName)
          .select('id, date, created_at')
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0])
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (result.error) {
          console.error(`[Progress Tracker V2] Error for ${endpoint}:`, result.error);
          endpointData[endpoint] = {
            endpoint,
            processedV2Count: 0,
            isProcessed: false,
            lastProcessed: null,
            error: result.error.message
          };
          break;
        }

        if (result.data && result.data.length > 0) {
          allProcessedData = [...allProcessedData, ...result.data];
          page++;
          hasMore = result.data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const processedV2Count = allProcessedData.length;
      const lastProcessed = allProcessedData.length > 0
        ? allProcessedData[allProcessedData.length - 1].created_at
        : null;

      endpointData[endpoint] = {
        endpoint,
        processedV2Count,
        isProcessed: processedV2Count > 0,
        lastProcessed
      };
    }

    // Check if all endpoints are processed
    const allProcessed = Object.values(endpointData).every(
      (data) => data.isProcessed === true
    );

    return {
      year,
      month,
      endpoints: endpointData,
      allProcessed
    };

  } catch (error) {
    console.error('[Progress Tracker V2] Error:', error);
    return null;
  }
}

/**
 * Check if all endpoints are processed for a month
 */
export async function areAllEndpointsProcessedV2(
  year: number,
  month: number
): Promise<boolean> {
  const progress = await getMonthlyProgressV2(year, month);
  return progress?.allProcessed || false;
}

