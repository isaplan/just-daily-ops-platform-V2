import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * API endpoint to retrieve the latest PNL Balance
 * Returns the most recent PNL Balance record based on year and month
 * 
 * Query parameters:
 * - location (optional): Filter by location ID, or 'all' for all locations
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-balance/latest] Latest PNL Balance request received');
    
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'all';
    
    console.log(`[API /finance/pnl-balance/latest] Fetching latest data for location: ${location}`);
    
    const supabase = await createClient();
    
    // Build query to get the latest record
    // Order by year DESC, month DESC to get the most recent
    let query = supabase
      .from('powerbi_pnl_aggregated')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1);
    
    // Filter by location if not 'all'
    if (location !== 'all') {
      query = query.eq('location_id', location);
    }
    
    const { data: latestRecord, error } = await query;
    
    if (error) {
      console.error('[API /finance/pnl-balance/latest] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`[API /finance/pnl-balance/latest] Found latest record:`, latestRecord?.[0] ? {
      year: latestRecord[0].year,
      month: latestRecord[0].month,
      location_id: latestRecord[0].location_id,
      resultaat: latestRecord[0].resultaat
    } : 'No records found');
    
    // If no data found, return null
    if (!latestRecord || latestRecord.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No PNL Balance data found'
      });
    }
    
    const record = latestRecord[0];
    
    // Return the latest record with summary
    return NextResponse.json({
      success: true,
      data: {
        ...record,
        // Include calculated fields for convenience
        revenue_total: record.revenue_total || 0,
        total_costs: record.total_costs || 0,
        resultaat: record.resultaat || 0
      },
      meta: {
        year: record.year,
        month: record.month,
        location_id: record.location_id,
        isLatest: true
      }
    });
    
  } catch (error) {
    console.error('[API /finance/pnl-balance/latest] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}




