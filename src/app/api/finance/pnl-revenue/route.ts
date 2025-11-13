import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2025');
    const location = searchParams.get('location') || 'all';

    console.log(`[API /finance/pnl-revenue] Revenue data request for year ${year}, location ${location}`);

    // DEFENSIVE: Create Supabase client
    const supabase = await createClient();

    // DEFENSIVE: Build query specifically for revenue data
    let query = supabase
      .from('powerbi_pnl_data')
      .select('category, subcategory, gl_account, amount, month, location_id, year, import_id')
      .eq('year', year)
      .or('category.ilike.%Netto-omzet%,gl_account.eq.Overige bedrijfskosten')
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('month', { ascending: true });

    // Apply location filter if not 'all'
    if (location !== 'all') {
      query = query.eq('location_id', location);
    }

    console.log('[API /finance/pnl-revenue] Executing revenue query...');
    const { data, error } = await query;
    console.log('[API /finance/pnl-revenue] Revenue query executed. Error:', error);

    if (error) {
      console.error('[API /finance/pnl-revenue] Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log(`[API /finance/pnl-revenue] Fetched ${data.length} revenue records for year ${year}, location ${location}`);

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        year,
        location,
        recordCount: data?.length || 0
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-revenue] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


