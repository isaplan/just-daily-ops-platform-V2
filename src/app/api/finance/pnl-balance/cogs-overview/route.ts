import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * COGS Overview API
 * Returns all MAIN, SUB, and SUB SUB COGS from powerbi_pnl_data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'all';
    const year = searchParams.get('year');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('powerbi_pnl_data')
      .select('category, subcategory, gl_account')
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('gl_account', { ascending: true });

    if (location !== 'all') {
      query = query.eq('location_id', location);
    }

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Group by MAIN -> SUB -> SUB SUB hierarchy
    const hierarchy: Record<string, Record<string, string[]>> = {};

    data?.forEach((record) => {
      const main = record.category || 'UNKNOWN';
      const sub = record.subcategory || 'NO_SUBCATEGORY';
      const subSub = record.gl_account || 'NO_GL_ACCOUNT';

      if (!hierarchy[main]) {
        hierarchy[main] = {};
      }
      if (!hierarchy[main][sub]) {
        hierarchy[main][sub] = [];
      }
      if (!hierarchy[main][sub].includes(subSub)) {
        hierarchy[main][sub].push(subSub);
      }
    });

    // Convert to array format for easier display
    const overview = Object.entries(hierarchy).map(([mainCategory, subCategories]) => ({
      main: mainCategory,
      subs: Object.entries(subCategories).map(([subCategory, glAccounts]) => ({
        sub: subCategory,
        glAccounts: glAccounts.sort()
      }))
    }));

    return NextResponse.json({
      success: true,
      totalRecords: data?.length || 0,
      overview,
      hierarchy
    });

  } catch (error) {
    console.error('[API /finance/pnl-balance/cogs-overview] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


