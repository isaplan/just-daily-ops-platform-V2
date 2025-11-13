import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

// Increase timeout for aggregation operations (can take time with batching)
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime for longer operations

/**
 * POST /api/eitje/v2/aggregate
 * Aggregate processed_v2 → aggregated_v2
 * 
 * Flow:
 * 1. Fetch processed data in batches of 100 rows
 * 2. For each batch, aggregate and insert into aggregated_v2
 * 
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * 
 * Returns: { success: boolean, recordsAggregated: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = await createClient();
    const batchSizeRecords = 100; // Aggregate in batches of 100 rows
    let offset = 0;
    let hasMoreRecords = true;
    let batchNumber = 0;
    let totalAggregated = 0;

    console.log(`[API /eitje/v2/aggregate] Starting batch aggregation with date range: ${startDate || 'all'} to ${endDate || 'all'}`);

    // Step 4: Fetch processed data in batches of 100, aggregate each batch
    while (hasMoreRecords) {
      batchNumber++;
      const batchStartTime = Date.now();

      console.log(`[API /eitje/v2/aggregate] Fetching batch ${batchNumber}: offset ${offset}, limit ${batchSizeRecords}`);

      // Fetch processed records in batches
      let query = supabase
        .from('eitje_time_registration_shifts_processed_v2')
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
        console.log(`[API /eitje/v2/aggregate] No more records`);
        hasMoreRecords = false;
        break;
      }

      console.log(`[API /eitje/v2/aggregate] Batch ${batchNumber}: fetched ${batchRecords.length} records`);

      // Determine date range for this batch
      const batchDates = batchRecords.map(r => r.date).filter(Boolean).sort();
      if (batchDates.length === 0) {
        // No dates in batch, skip
        offset += batchSizeRecords;
        continue;
      }

      const batchStartDate = batchDates[0];
      const batchEndDate = batchDates[batchDates.length - 1];

      console.log(`[API /eitje/v2/aggregate] Batch ${batchNumber}: aggregating date range ${batchStartDate} to ${batchEndDate}`);

      // Aggregate this batch using SQL function
      try {
        const { data, error } = await supabase.rpc('aggregate_hours_v2', {
          start_date: batchStartDate,
          end_date: batchEndDate
        });

        if (error) {
          console.error(`[API /eitje/v2/aggregate] Error aggregating batch ${batchNumber}:`, error);
          // Continue with next batch instead of failing
          console.warn(`[API /eitje/v2/aggregate] Skipping batch ${batchNumber} and continuing...`);
        } else {
          const batchAggregated = data || 0;
          totalAggregated += batchAggregated;
          console.log(`[API /eitje/v2/aggregate] Batch ${batchNumber} completed: ${batchAggregated} records aggregated in ${Date.now() - batchStartTime}ms`);
        }
      } catch (batchError) {
        console.error(`[API /eitje/v2/aggregate] Exception in batch ${batchNumber}:`, batchError);
        // Continue with next batch
      }

      // Move to next batch
      offset += batchSizeRecords;

      // DEFENSIVE: Add small delay between batches to avoid overwhelming Supabase
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
    }

    console.log(`[API /eitje/v2/aggregate] Completed batch aggregation: ${totalAggregated} total records across ${batchNumber} batches`);

    return NextResponse.json({
      success: true,
      recordsAggregated: totalAggregated,
      message: `Successfully aggregated ${totalAggregated} records in ${batchNumber} batches`
    });

  } catch (error) {
    console.error('[API /eitje/v2/aggregate] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to aggregate data',
      recordsAggregated: 0
    }, { status: 500 });
  }
}
