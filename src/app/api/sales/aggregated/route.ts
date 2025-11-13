import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export interface AggregatedSalesResponse {
  data: AggregatedSalesRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalRevenue: number;
    totalQuantity: number;
    avgPrice: number;
    totalVatAmount: number;
    vatBreakdown: {
      vat9Base: number;
      vat9Amount: number;
      vat21Base: number;
      vat21Amount: number;
    };
  };
}

export interface AggregatedSalesRecord {
  id: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  unique_products: number;
  top_category: string | null;
  category_breakdown: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const locationIds = searchParams.get('locationIds')?.split(',') || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeVat = searchParams.get('includeVat') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('[API /sales/aggregated] Request params:', {
      locationIds,
      startDate,
      endDate,
      includeVat,
      page,
      limit
    });
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('bork_sales_aggregated')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (locationIds.length > 0) {
      query = query.in('location_id', locationIds);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // Order by date descending (most recent first)
    query = query.order('date', { ascending: false });
    
    // Execute query with timeout protection
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    );
    
    const { data, error, count } = await Promise.race([queryPromise, timeoutPromise]) as { data: AggregatedSalesRecord[] | null; error: any; count: number | null };
    
    if (error) {
      console.error('[API /sales/aggregated] Query error:', error);
      return NextResponse.json({
        success: false,
        error: `Database query failed: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`[API /sales/aggregated] Found ${data?.length || 0} records (total: ${count})`);
    
    // Calculate summary metrics
    const summary = calculateSummaryMetrics(data || []);
    
    // Transform data based on includeVat parameter
    const transformedData = data?.map((record: AggregatedSalesRecord) => ({
      ...record,
      // Use appropriate revenue field based on includeVat
      display_revenue: includeVat ? record.total_revenue_incl_vat : record.total_revenue_excl_vat
    })) || [];
    
    const response: AggregatedSalesResponse = {
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      summary
    };
    
    return NextResponse.json({
      success: true,
      ...response
    });
    
  } catch (error) {
    console.error('[API /sales/aggregated] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Calculate summary metrics from aggregated sales data
 */
function calculateSummaryMetrics(data: AggregatedSalesRecord[]) {
  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalQuantity: 0,
      avgPrice: 0,
      totalVatAmount: 0,
      vatBreakdown: {
        vat9Base: 0,
        vat9Amount: 0,
        vat21Base: 0,
        vat21Amount: 0
      }
    };
  }
  
  const totalRevenue = data.reduce((sum, record) => sum + record.total_revenue_incl_vat, 0);
  const totalQuantity = data.reduce((sum, record) => sum + record.total_quantity, 0);
  const totalVatAmount = data.reduce((sum, record) => sum + record.total_vat_amount, 0);
  const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
  
  const vatBreakdown = {
    vat9Base: data.reduce((sum, record) => sum + record.vat_9_base, 0),
    vat9Amount: data.reduce((sum, record) => sum + record.vat_9_amount, 0),
    vat21Base: data.reduce((sum, record) => sum + record.vat_21_base, 0),
    vat21Amount: data.reduce((sum, record) => sum + record.vat_21_amount, 0)
  };
  
  return {
    totalRevenue,
    totalQuantity,
    avgPrice,
    totalVatAmount,
    vatBreakdown
  };
}
