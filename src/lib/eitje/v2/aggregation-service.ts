/**
 * V2 Aggregation Service
 * Functions for aggregating processed_v2 → aggregated_v2
 */

import { createClient } from '@/integrations/supabase/server';

export interface AggregateOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface AggregateResult {
  success: boolean;
  recordsAggregated: number;
  error?: string;
}

/**
 * Aggregate processed_v2 → aggregated_v2
 */
export async function aggregateHoursV2(
  options: AggregateOptions = {}
): Promise<AggregateResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('aggregate_hours_v2', {
      start_date: options.startDate || null,
      end_date: options.endDate || null
    });

    if (error) {
      console.error('[Aggregation Service V2] Error:', error);
      return {
        success: false,
        recordsAggregated: 0,
        error: error.message
      };
    }

    return {
      success: true,
      recordsAggregated: data || 0
    };

  } catch (error) {
    console.error('[Aggregation Service V2] Unexpected error:', error);
    return {
      success: false,
      recordsAggregated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

