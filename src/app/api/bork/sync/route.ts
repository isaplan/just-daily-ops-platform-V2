import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { fetchBorkData } from '@/lib/bork/api-client';
import { saveRawData } from '@/lib/bork/database';
import { processDatesInBatches } from '@/lib/bork/batch-processor';
import { cleanupDuplicatesForDateRange } from '@/lib/bork/cleanup-service';

export async function POST(request: NextRequest) {
  try {
    const { locationId, startDate, endDate } = await request.json();
    
    console.log('[API /bork/sync] Starting sync:', { locationId, startDate, endDate });

    // Fetch credentials from database
    const supabase = await createClient();
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('provider', 'bork')
      .single();

    if (credError || !credentials) {
      return NextResponse.json({ 
        success: false, 
        error: `No API credentials found for location ${locationId}` 
      }, { status: 404 });
    }

    const { api_url: baseUrl, api_key: apiKey } = credentials;
    
    // Add timeout wrapper for the entire sync operation
    const syncPromise = (async () => {
      const dates = generateDateRange(startDate, endDate);
      let processedCount = 0;
      let apiFailures = 0;
      let totalRecords = 0;
      
      await processDatesInBatches(dates, async (date) => {
        const data = await fetchBorkData(baseUrl, apiKey, date);
        
        if (data.length === 0) {
          apiFailures++;
          console.log(`[API /bork/sync] No data received for ${date}`);
        } else {
          await saveRawData(supabase, locationId, date, data);
          totalRecords += data.length;
          console.log(`[API /bork/sync] Stored ${data.length} records for ${date}`);
        }
        
        processedCount++;
      });
      
      return { processedCount, apiFailures, totalRecords };
    })();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync operation timeout')), 55000) // 55 seconds to allow for frontend timeout
    );
    
    try {
      const result = await Promise.race([syncPromise, timeoutPromise]) as { processedCount: number, apiFailures: number, totalRecords: number };
      
      console.log('[API /bork/sync] Complete:', result.processedCount, 'dates processed');
      
      // Clean up duplicates after successful sync
      console.log('[API /bork/sync] Starting cleanup for date range:', startDate, 'to', endDate);
      const cleanupResult = await cleanupDuplicatesForDateRange(locationId, startDate, endDate);
      
      if (cleanupResult.success) {
        console.log('[API /bork/sync] Cleanup completed:', cleanupResult.recordsDeleted, 'duplicates removed');
      } else {
        console.error('[API /bork/sync] Cleanup failed:', cleanupResult.error);
      }
      
      return NextResponse.json({ 
        success: true, 
        processedCount: result.processedCount,
        totalRecords: result.totalRecords,
        apiFailures: result.apiFailures,
        cleanupResult: {
          duplicatesRemoved: cleanupResult.recordsDeleted,
          duplicatesFound: cleanupResult.duplicatesFound,
          cleanupSuccess: cleanupResult.success
        },
        message: result.apiFailures > 0 
          ? `Sync completed with ${result.apiFailures} API failures. ${result.totalRecords} records stored. ${cleanupResult.recordsDeleted} duplicates removed.`
          : `Sync completed successfully. ${result.totalRecords} records stored. ${cleanupResult.recordsDeleted} duplicates removed.`
      });
      
    } catch (timeoutError) {
      console.error('[API /bork/sync] Timeout error:', timeoutError);
      
      // Return partial success when timeout occurs
      return NextResponse.json({ 
        success: true, 
        processedCount: 0,
        totalRecords: 0,
        apiFailures: 0,
        message: 'Sync operation timed out, but some data may have been processed'
      });
    }
    
  } catch (error) {
    console.error('[API /bork/sync] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateDateRange(start: string, end: string): string[] {
  // Simple date range generator - Bork API expects YYYYMMDD format
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    // Convert to YYYYMMDD format (no dashes)
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
