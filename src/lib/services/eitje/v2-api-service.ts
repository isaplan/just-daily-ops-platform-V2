/**
 * Eitje V2 API Service
 * 
 * Service layer for Eitje API operations (non-GraphQL REST endpoints)
 */

export interface MonthlyProgress {
  year: number;
  month: number;
  endpoints: Record<string, {
    processedV2Count: number;
    isProcessed: boolean;
    lastProcessed: string | null;
  }>;
  allProcessed: boolean;
}

export interface SyncResponse {
  success: boolean;
  recordsSaved: number;
  message?: string;
  error?: string;
}

export interface AggregateResponse {
  success: boolean;
  recordsAggregated: number;
  message?: string;
  error?: string;
}

/**
 * Get monthly progress for Eitje V2 data
 */
export async function getMonthlyProgressV2(
  year: number,
  month: number
): Promise<MonthlyProgress | null> {
  try {
    const response = await fetch(`/api/eitje/v2/progress?year=${year}&month=${month}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch progress: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[Eitje API Service] Error fetching progress:', error);
    return null;
  }
}

/**
 * Sync raw data from Eitje API
 */
export async function syncEitjeData(
  startDate: string,
  endDate: string,
  endpoint: string = 'time_registration_shifts'
): Promise<SyncResponse> {
  try {
    const response = await fetch('/api/eitje/v2/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        endpoint,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to sync data');
    }

    return result;
  } catch (error: any) {
    console.error('[Eitje API Service] Error syncing data:', error);
    return {
      success: false,
      recordsSaved: 0,
      error: error.message || 'Failed to sync data',
    };
  }
}

/**
 * Aggregate raw Eitje data
 */
export async function aggregateEitjeData(
  startDate: string,
  endDate: string
): Promise<AggregateResponse> {
  try {
    const response = await fetch('/api/eitje/v2/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to aggregate data');
    }

    return result;
  } catch (error: any) {
    console.error('[Eitje API Service] Error aggregating data:', error);
    return {
      success: false,
      recordsAggregated: 0,
      error: error.message || 'Failed to aggregate data',
    };
  }
}

/**
 * Test Eitje API connection
 */
export async function testEitjeConnection(credentials: {
  baseUrl: string;
  partnerUsername: string;
  partnerPassword: string;
  apiUsername: string;
  apiPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/eitje/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('[Eitje API Service] Error testing connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to test connection',
    };
  }
}











