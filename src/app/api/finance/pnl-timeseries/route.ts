import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-timeseries] Time series request received');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || 'all';
    const startYear = parseInt(searchParams.get('startYear') || '2024');
    const startMonth = parseInt(searchParams.get('startMonth') || '1');
    const endYear = parseInt(searchParams.get('endYear') || '2025');
    const endMonth = parseInt(searchParams.get('endMonth') || '12');
    
    console.log(`[API /finance/pnl-timeseries] Fetching data for location: ${locationId}, range: ${startYear}-${startMonth} to ${endYear}-${endMonth}`);
    
    // DEFENSIVE: Validate parameters
    if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date parameters'
      }, { status: 400 });
    }

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return NextResponse.json({
        success: false,
        error: 'Invalid month values. Must be between 1 and 12'
      }, { status: 400 });
    }

    // DEFENSIVE: Create Supabase client
    const supabase = await createClient();
    if (!supabase) {
      throw new Error('Failed to create Supabase client');
    }
    
    // Query for each year separately to avoid complex OR queries
    const allData: any[] = [];
    
    for (let year = startYear; year <= endYear; year++) {
      console.log(`[API /finance/pnl-timeseries] Querying year ${year}...`);
      
      // Use select('*') for safety - let Supabase return all columns
      let query = supabase
        .from('powerbi_pnl_aggregated')
        .select('*')
        .eq('year', year);

      // Filter by month range for this year
      if (year === startYear && year === endYear) {
        // Same year: filter by month range
        if (startMonth === 1 && endMonth === 12) {
          // All months - no filter needed
        } else if (startMonth === endMonth) {
          // Single month
          query = query.eq('month', startMonth);
        } else {
          // Month range - use both filters
          query = query.gte('month', startMonth).lte('month', endMonth);
        }
      } else if (year === startYear) {
        // First year: from startMonth to December
        if (startMonth > 1) {
          query = query.gte('month', startMonth);
        }
        // If startMonth is 1, no filter needed (get all months)
      } else if (year === endYear) {
        // Last year: from January to endMonth
        if (endMonth < 12) {
          query = query.lte('month', endMonth);
        }
        // If endMonth is 12, no filter needed (get all months)
      }
      // Middle years: no month filter (get all months)

      // Filter by location if not 'all'
      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      // Order by month for consistency
      query = query.order('month', { ascending: true });

      const { data, error } = await query;
      
      if (error) {
        console.error(`[API /finance/pnl-timeseries] Database error for year ${year}:`, error);
        return NextResponse.json({
          success: false,
          error: `Database error for year ${year}: ${error.message}`,
          details: error
        }, { status: 500 });
      }
      
      if (data && data.length > 0) {
        console.log(`[API /finance/pnl-timeseries] Found ${data.length} records for year ${year}`);
        allData.push(...data);
      } else {
        console.log(`[API /finance/pnl-timeseries] No data found for year ${year}`);
      }
    }

    console.log(`[API /finance/pnl-timeseries] Total records found: ${allData.length}`);

    return NextResponse.json({
      success: true,
      data: allData
    });
    
  } catch (error) {
    console.error('[API /finance/pnl-timeseries] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}


