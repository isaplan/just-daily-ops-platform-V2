import { NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET() {
  try {
    console.log('[API /bork/status] Checking database status...');
    
    const supabase = await createClient();
    
    // Simple count query to test database connectivity
    const { count, error } = await supabase
      .from('bork_sales_data')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('[API /bork/status] Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        totalRecords: 0
      });
    }
    
    console.log('[API /bork/status] Database accessible, total records:', count);
    
    return NextResponse.json({
      success: true,
      totalRecords: count || 0,
      message: 'Database connection successful'
    });
    
  } catch (error) {
    console.error('[API /bork/status] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalRecords: 0
    }, { status: 500 });
  }
}

