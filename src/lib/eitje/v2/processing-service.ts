/**
 * V2 Processing Service
 * Functions for processing raw → processed_v2
 */

import { createClient } from '@/integrations/supabase/server';

export interface ProcessOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface ProcessResult {
  success: boolean;
  recordsProcessed: number;
  error?: string;
}

/**
 * Process raw data → processed_v2
 */
export async function processTimeRegistrationShiftsV2(
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('process_time_registration_shifts_v2', {
      start_date: options.startDate || null,
      end_date: options.endDate || null
    });

    if (error) {
      console.error('[Processing Service V2] Error:', error);
      return {
        success: false,
        recordsProcessed: 0,
        error: error.message
      };
    }

    return {
      success: true,
      recordsProcessed: data || 0
    };

  } catch (error) {
    console.error('[Processing Service V2] Unexpected error:', error);
    return {
      success: false,
      recordsProcessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

