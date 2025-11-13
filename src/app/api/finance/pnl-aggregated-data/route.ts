import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-aggregated-data] P&L aggregated data request received');
    
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2025');
    const location = searchParams.get('location') || 'all';
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    
    console.log(`[API /finance/pnl-aggregated-data] Fetching data for year: ${year}, location: ${location}, month: ${month || 'all'}`);
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('powerbi_pnl_aggregated')
      .select('*')
      .eq('year', year);
    
    // Filter by location if not 'all'
    if (location !== 'all') {
      query = query.eq('location_id', location);
    }
    
    // Filter by month if specified
    if (month !== null) {
      query = query.eq('month', month);
    }
    
    // Order by location, month
    query = query.order('location_id').order('month');
    
    const { data: aggregatedData, error } = await query;
    
    if (error) {
      console.error('[API /finance/pnl-aggregated-data] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`[API /finance/pnl-aggregated-data] Found ${aggregatedData?.length || 0} aggregated records`);
    
    // If no data found, return empty result
    if (!aggregatedData || aggregatedData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          totalRecords: 0,
          locations: [],
          months: [],
          totalRevenue: 0,
          totalCosts: 0,
          totalResultaat: 0
        }
      });
    }
    
    // Calculate summary statistics
    const summary = {
      totalRecords: aggregatedData.length,
      locations: [...new Set(aggregatedData.map(d => d.location_id))],
      months: [...new Set(aggregatedData.map(d => d.month))].sort((a, b) => a - b),
      totalRevenue: aggregatedData.reduce((sum, d) => sum + (d.revenue_total || 0), 0),
      totalCosts: aggregatedData.reduce((sum, d) => sum + (d.total_costs || 0), 0),
      totalResultaat: aggregatedData.reduce((sum, d) => sum + (d.resultaat || 0), 0)
    };
    
    console.log('[API /finance/pnl-aggregated-data] Summary:', summary);
    
    return NextResponse.json({
      success: true,
      data: aggregatedData,
      summary
    });
    
  } catch (error) {
    console.error('[API /finance/pnl-aggregated-data] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}