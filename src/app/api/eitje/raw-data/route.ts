import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE RAW DATA ENDPOINT
 * 
 * Handles fetching and managing raw Eitje data from database
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /eitje/raw-data] Fetching raw Eitje data...');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');

    // DEFENSIVE: Build query
    const supabase = await createClient();
    let query = supabase
      .from('eitje_sales_data')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // DEFENSIVE: Add date filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /eitje/raw-data] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch raw data'
      }, { status: 500 });
    }

    // DEFENSIVE: Get total count for pagination
    const { count, error: countError } = await supabase
      .from('eitje_sales_data')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('[API /eitje/raw-data] Count query failed:', countError);
    }

    console.log(`[API /eitje/raw-data] Fetched ${data?.length || 0} raw records`);

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('[API /eitje/raw-data] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch raw data'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[API /eitje/raw-data] Deleting raw Eitje data...');
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');

    // DEFENSIVE: Build delete query
    const supabase = await createClient();
    let query = supabase
      .from('eitje_sales_data')
      .delete();

    // DEFENSIVE: Add filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { error } = await query;

    if (error) {
      console.error('[API /eitje/raw-data] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete raw data'
      }, { status: 500 });
    }

    console.log('[API /eitje/raw-data] Raw data deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Raw data deleted successfully'
    });

  } catch (error) {
    console.error('[API /eitje/raw-data] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete raw data'
    }, { status: 500 });
  }
}
