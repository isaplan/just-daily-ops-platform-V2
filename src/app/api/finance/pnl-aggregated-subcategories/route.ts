import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-aggregated-subcategories] Subcategories request received');
    
    const { searchParams } = new URL(request.url);
    const aggregatedId = searchParams.get('aggregatedId');
    const mainCategory = searchParams.get('mainCategory');
    
    if (!aggregatedId) {
      return NextResponse.json({
        success: false,
        error: 'aggregatedId parameter is required'
      }, { status: 400 });
    }
    
    console.log(`[API /finance/pnl-aggregated-subcategories] Fetching subcategories for aggregatedId: ${aggregatedId}, mainCategory: ${mainCategory || 'all'}`);
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('powerbi_pnl_aggregated_subcategories')
      .select('*')
      .eq('aggregated_id', aggregatedId);
    
    // Filter by main category if specified
    if (mainCategory) {
      query = query.eq('main_category', mainCategory);
    }
    
    // Order by main category, subcategory
    query = query.order('main_category').order('subcategory');
    
    const { data: subcategories, error } = await query;
    
    if (error) {
      console.error('[API /finance/pnl-aggregated-subcategories] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`[API /finance/pnl-aggregated-subcategories] Found ${subcategories?.length || 0} subcategory records`);
    
    // Group by main category
    const groupedSubcategories = subcategories?.reduce((acc, sub) => {
      if (!acc[sub.main_category]) {
        acc[sub.main_category] = [];
      }
      acc[sub.main_category].push(sub);
      return acc;
    }, {} as Record<string, any[]>) || {};
    
    return NextResponse.json({
      success: true,
      data: subcategories || [],
      grouped: groupedSubcategories,
      summary: {
        totalRecords: subcategories?.length || 0,
        mainCategories: Object.keys(groupedSubcategories),
        totalAmount: subcategories?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0
      }
    });
    
  } catch (error) {
    console.error('[API /finance/pnl-aggregated-subcategories] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


