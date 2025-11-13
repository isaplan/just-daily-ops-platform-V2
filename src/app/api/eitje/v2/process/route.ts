import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

// Increase timeout for processing operations (can take time with batching)
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime for longer operations

/**
 * POST /api/eitje/v2/process
 * Process raw data → processed_v2
 * 
 * Flow:
 * 1. Fetch raw data in batches of 100 rows
 * 2. For each batch, process and insert into processed_v2
 * 
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * 
 * Returns: { success: boolean, recordsProcessed: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = await createClient();
    const batchSizeRecords = 100; // Process in batches of 100 rows
    let offset = 0;
    let hasMoreRecords = true;
    let batchNumber = 0;
    let totalProcessed = 0;

    console.log(`[API /eitje/v2/process] Starting batch processing with date range: ${startDate || 'all'} to ${endDate || 'all'}`);

    // Step 3: Fetch raw data in batches of 100, process each batch
    while (hasMoreRecords) {
      batchNumber++;
      const batchStartTime = Date.now();

      console.log(`[API /eitje/v2/process] Fetching batch ${batchNumber}: offset ${offset}, limit ${batchSizeRecords}`);

      // Fetch raw records in batches
      let query = supabase
        .from('eitje_time_registration_shifts_raw')
        .select('*')
        .range(offset, offset + batchSizeRecords - 1);

      // Apply date filter if provided
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: batchRecords, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch records: ${fetchError.message}`);
      }

      if (!batchRecords || batchRecords.length === 0) {
        console.log(`[API /eitje/v2/process] No more records`);
        hasMoreRecords = false;
        break;
      }

      console.log(`[API /eitje/v2/process] Batch ${batchNumber}: fetched ${batchRecords.length} records`);

      // Determine date range for this batch
      const batchDates = batchRecords.map(r => r.date).filter(Boolean).sort();
      if (batchDates.length === 0) {
        // No dates in batch, skip
        offset += batchSizeRecords;
        continue;
      }

      const batchStartDate = batchDates[0];
      const batchEndDate = batchDates[batchDates.length - 1];

      console.log(`[API /eitje/v2/process] Batch ${batchNumber}: processing date range ${batchStartDate} to ${batchEndDate}`);

      // Process this batch using SQL function
      try {
        const { data, error } = await supabase.rpc('process_time_registration_shifts_v2', {
          start_date: batchStartDate,
          end_date: batchEndDate
        });

        if (error) {
          console.error(`[API /eitje/v2/process] Error processing batch ${batchNumber}:`, error);
          // Continue with next batch instead of failing
          console.warn(`[API /eitje/v2/process] Skipping batch ${batchNumber} and continuing...`);
        } else {
          const batchProcessed = data || 0;
          totalProcessed += batchProcessed;
          console.log(`[API /eitje/v2/process] Batch ${batchNumber} completed: ${batchProcessed} records processed in ${Date.now() - batchStartTime}ms`);
        }
      } catch (batchError) {
        console.error(`[API /eitje/v2/process] Exception in batch ${batchNumber}:`, batchError);
        // Continue with next batch
      }

      // Move to next batch
      offset += batchSizeRecords;

      // DEFENSIVE: Add small delay between batches to avoid overwhelming Supabase
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
    }

    console.log(`[API /eitje/v2/process] Completed batch processing: ${totalProcessed} total records across ${batchNumber} batches`);

    // Auto-sync worker_profiles after processing
    const { data: profilesSynced, error: syncError } = await supabase.rpc('sync_worker_profiles_v2');
    
    if (syncError) {
      console.warn('[API /eitje/v2/process] Warning: Failed to sync worker_profiles:', syncError);
    }

    return NextResponse.json({
      success: true,
      recordsProcessed: totalProcessed,
      profilesSynced: profilesSynced || 0,
      message: `Successfully processed ${totalProcessed} records in ${batchNumber} batches${profilesSynced ? ` and synced ${profilesSynced} worker profiles` : ''}`
    });

  } catch (error) {
    console.error('[API /eitje/v2/process] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process data',
      recordsProcessed: 0
    }, { status: 500 });
  }
}
