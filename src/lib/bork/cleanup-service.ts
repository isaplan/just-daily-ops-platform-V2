// Single responsibility: Clean up duplicate Bork sales data records
import { createClient } from '@/integrations/supabase/server';

interface CleanupResult {
  success: boolean;
  recordsDeleted: number;
  duplicatesFound: number;
  error?: string;
}

interface DuplicateRecord {
  id: string;
  location_id: string;
  date: string;
  created_at: string;
}

/**
 * Clean up duplicate records for a specific location and date range
 * Keeps only the most recent record for each (location_id, date) pair
 */
export async function cleanupDuplicatesForDateRange(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<CleanupResult> {
  try {
    console.log('[Cleanup] Starting cleanup for location:', locationId, 'date range:', startDate, 'to', endDate);
    
    const supabase = await createClient();
    
    // First, find all records for this location and date range with timeout protection
    const queryPromise = supabase
      .from('bork_sales_data')
      .select('id, location_id, raw_data, created_at')
      .eq('location_id', locationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );
    
    const { data: allRecords, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (fetchError) {
      console.error('[Cleanup] Error fetching records:', fetchError);
      return { success: false, recordsDeleted: 0, duplicatesFound: 0, error: fetchError.message };
    }
    
    if (!allRecords || allRecords.length === 0) {
      console.log('[Cleanup] No records found for cleanup');
      return { success: true, recordsDeleted: 0, duplicatesFound: 0 };
    }
    
    // Extract dates from raw_data and group by (location_id, date)
    const recordsWithDates: (DuplicateRecord & { raw_data: any })[] = allRecords.map(record => {
      const date = record.raw_data?.raw_response?.[0]?.Date;
      return {
        id: record.id,
        location_id: record.location_id,
        date: date ? date.toString() : 'unknown',
        created_at: record.created_at,
        raw_data: record.raw_data
      };
    });
    
    // Group by (location_id, date) and find duplicates
    const groupedRecords = new Map<string, (DuplicateRecord & { raw_data: any })[]>();
    
    recordsWithDates.forEach(record => {
      const key = `${record.location_id}-${record.date}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    // Find duplicates (groups with more than 1 record)
    const duplicatesToDelete: string[] = [];
    let totalDuplicates = 0;
    
    groupedRecords.forEach((records, key) => {
      if (records.length > 1) {
        totalDuplicates += records.length - 1; // All except the most recent
        
        // Sort by created_at DESC to keep the most recent
        const sortedRecords = records.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Mark all except the first (most recent) for deletion
        const toDelete = sortedRecords.slice(1);
        duplicatesToDelete.push(...toDelete.map(r => r.id));
        
        console.log(`[Cleanup] Found ${records.length} records for ${key}, keeping most recent, deleting ${toDelete.length}`);
      }
    });
    
    if (duplicatesToDelete.length === 0) {
      console.log('[Cleanup] No duplicates found');
      return { success: true, recordsDeleted: 0, duplicatesFound: 0 };
    }
    
    // Delete duplicates in batches to avoid timeouts
    const deleteBatchSize = 10;
    let deletedCount = 0;
    
    for (let i = 0; i < duplicatesToDelete.length; i += deleteBatchSize) {
      const batch = duplicatesToDelete.slice(i, i + deleteBatchSize);
      
      const { error: deleteError } = await supabase
        .from('bork_sales_data')
        .delete()
        .in('id', batch);
      
      if (deleteError) {
        console.error('[Cleanup] Error deleting batch:', deleteError);
        return { success: false, recordsDeleted: deletedCount, duplicatesFound: totalDuplicates, error: deleteError.message };
      }
      
      deletedCount += batch.length;
      console.log(`[Cleanup] Deleted batch ${Math.floor(i/deleteBatchSize) + 1}: ${batch.length} records`);
      
      // Small delay between batches
      if (i + deleteBatchSize < duplicatesToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[Cleanup] Cleanup complete: ${deletedCount} records deleted, ${totalDuplicates} duplicates found`);
    
    return {
      success: true,
      recordsDeleted: deletedCount,
      duplicatesFound: totalDuplicates
    };
    
  } catch (error) {
    console.error('[Cleanup] Unexpected error:', error);
    return {
      success: false,
      recordsDeleted: 0,
      duplicatesFound: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clean up all duplicate records in the database
 * Used for weekly cleanup job
 */
export async function cleanupAllDuplicates(): Promise<CleanupResult> {
  try {
    console.log('[Cleanup] Starting database-wide cleanup');
    
    const supabase = await createClient();
    
    // Get records in smaller batches to avoid timeout
    const allRecords: any[] = [];
    let offset = 0;
    const fetchBatchSize = 20;
    let hasMore = true;
    
    while (hasMore) {
      const queryPromise = supabase
        .from('bork_sales_data')
        .select('id, location_id, raw_data, created_at')
        .order('location_id')
        .range(offset, offset + fetchBatchSize - 1);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const { data: batchRecords, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (fetchError) {
        console.error('[Cleanup] Error fetching batch:', fetchError);
        return { success: false, recordsDeleted: 0, duplicatesFound: 0, error: fetchError.message };
      }
      
      if (!batchRecords || batchRecords.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...batchRecords);
        offset += fetchBatchSize;
        console.log(`[Cleanup] Fetched batch: ${batchRecords.length} records (total: ${allRecords.length})`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[Cleanup] Total records fetched: ${allRecords.length}`);
    
    if (!allRecords || allRecords.length === 0) {
      console.log('[Cleanup] No records found for cleanup');
      return { success: true, recordsDeleted: 0, duplicatesFound: 0 };
    }
    
    // Extract dates and group by (location_id, date)
    const recordsWithDates: (DuplicateRecord & { raw_data: any })[] = allRecords.map(record => {
      const date = record.raw_data?.raw_response?.[0]?.Date;
      return {
        id: record.id,
        location_id: record.location_id,
        date: date ? date.toString() : 'unknown',
        created_at: record.created_at,
        raw_data: record.raw_data
      };
    });
    
    // Group by (location_id, date)
    const groupedRecords = new Map<string, (DuplicateRecord & { raw_data: any })[]>();
    
    recordsWithDates.forEach(record => {
      const key = `${record.location_id}-${record.date}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    // Find duplicates
    const duplicatesToDelete: string[] = [];
    let totalDuplicates = 0;
    
    groupedRecords.forEach((records, key) => {
      if (records.length > 1) {
        totalDuplicates += records.length - 1;
        
        // Sort by created_at DESC to keep the most recent
        const sortedRecords = records.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Mark all except the first (most recent) for deletion
        const toDelete = sortedRecords.slice(1);
        duplicatesToDelete.push(...toDelete.map(r => r.id));
        
        console.log(`[Cleanup] Found ${records.length} records for ${key}, keeping most recent, deleting ${toDelete.length}`);
      }
    });
    
    if (duplicatesToDelete.length === 0) {
      console.log('[Cleanup] No duplicates found in database');
      return { success: true, recordsDeleted: 0, duplicatesFound: 0 };
    }
    
    // Delete duplicates in batches
    const deleteBatchSize = 10;
    let deletedCount = 0;
    
    for (let i = 0; i < duplicatesToDelete.length; i += deleteBatchSize) {
      const batch = duplicatesToDelete.slice(i, i + deleteBatchSize);
      
      const { error: deleteError } = await supabase
        .from('bork_sales_data')
        .delete()
        .in('id', batch);
      
      if (deleteError) {
        console.error('[Cleanup] Error deleting batch:', deleteError);
        return { success: false, recordsDeleted: deletedCount, duplicatesFound: totalDuplicates, error: deleteError.message };
      }
      
      deletedCount += batch.length;
      console.log(`[Cleanup] Deleted batch ${Math.floor(i/deleteBatchSize) + 1}: ${batch.length} records`);
      
      // Small delay between batches
      if (i + deleteBatchSize < duplicatesToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[Cleanup] Database-wide cleanup complete: ${deletedCount} records deleted, ${totalDuplicates} duplicates found`);
    
    return {
      success: true,
      recordsDeleted: deletedCount,
      duplicatesFound: totalDuplicates
    };
    
  } catch (error) {
    console.error('[Cleanup] Unexpected error in database-wide cleanup:', error);
    return {
      success: false,
      recordsDeleted: 0,
      duplicatesFound: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}