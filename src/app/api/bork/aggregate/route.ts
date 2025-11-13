import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { aggregateSalesDataForDateRange } from '@/lib/bork/aggregation-service';

export async function POST(request: NextRequest) {
  try {
    const { locationId, startDate, endDate, forceFull } = await request.json();
    
    console.log('[API /bork/aggregate] Manual aggregation request:', { 
      locationId, 
      startDate, 
      endDate, 
      forceFull 
    });

    const supabase = await createClient();

    // If no specific location, get all locations
    let locations = [];
    if (locationId) {
      locations = [{ id: locationId }];
    } else {
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name');
      
      if (locationsError) {
        console.error('[API /bork/aggregate] Error fetching locations:', locationsError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to fetch locations: ${locationsError.message}` 
        }, { status: 500 });
      }
      
      locations = locationsData || [];
    }

    const results: { [locationId: string]: { success: boolean; aggregatedDates: string[]; errors: string[]; incremental: boolean } } = {};
    let totalAggregatedDates = 0;
    let totalErrors = 0;

    // Process each location
    for (const location of locations) {
      try {
        console.log(`[API /bork/aggregate] Aggregating data for location ${location.id}...`);
        
        // If no date range specified, get the range from existing data
        let dateRange = { startDate, endDate };
        if (!startDate || !endDate) {
          const { data: dateData, error: dateError } = await supabase
            .from('bork_sales_data')
            .select('date')
            .eq('location_id', location.id)
            .order('date', { ascending: true });
          
          if (dateError || !dateData || dateData.length === 0) {
            console.log(`[API /bork/aggregate] No raw data found for location ${location.id}`);
            results[location.id] = { success: true, aggregatedDates: [], errors: [], incremental: false };
            continue;
          }
          
          const dates = dateData.map(d => d.date).sort();
          dateRange = { startDate: dates[0], endDate: dates[dates.length - 1] };
        }

        // Aggregate sales data for this location and date range
        const aggregationResult = await aggregateSalesDataForDateRange(
          location.id, 
          dateRange.startDate, 
          dateRange.endDate
        );
        
        results[location.id] = aggregationResult;
        totalAggregatedDates += aggregationResult.aggregatedDates.length;
        totalErrors += aggregationResult.errors.length;
        
        if (aggregationResult.success) {
          const mode = aggregationResult.incremental ? 'incremental' : 'full';
          console.log(`[API /bork/aggregate] Successfully aggregated ${aggregationResult.aggregatedDates.length} dates for location ${location.id} (${mode} mode)`);
        } else {
          console.error(`[API /bork/aggregate] Aggregation failed for location ${location.id}:`, aggregationResult.errors);
        }
        
      } catch (error) {
        console.error(`[API /bork/aggregate] Error aggregating location ${location.id}:`, error);
        results[location.id] = { 
          success: false, 
          aggregatedDates: [], 
          errors: [error instanceof Error ? error.message : 'Unknown aggregation error'],
          incremental: false
        };
        totalErrors++;
      }
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const totalLocations = locations.length;

    console.log(`[API /bork/aggregate] Manual aggregation complete: ${successCount}/${totalLocations} locations successful, ${totalAggregatedDates} dates aggregated, ${totalErrors} errors`);

    return NextResponse.json({ 
      success: totalErrors === 0,
      results,
      summary: {
        totalLocations,
        successfulLocations: successCount,
        totalAggregatedDates,
        totalErrors,
        incrementalCount: Object.values(results).filter(r => r.incremental).length,
        fullCount: Object.values(results).filter(r => !r.incremental).length
      },
      message: totalErrors === 0 
        ? `Successfully aggregated ${totalAggregatedDates} dates across ${successCount} locations`
        : `Aggregation completed with ${totalErrors} errors. ${totalAggregatedDates} dates aggregated across ${successCount} locations`
    });
    
  } catch (error) {
    console.error('[API /bork/aggregate] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

