import { NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET() {
  try {
    console.log('[API /bork/simple-test] Testing minimal database query...');
    
    const supabase = await createClient();
    
    // Minimal query - just count records
    const { count, error } = await supabase
      .from('bork_sales_data')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('[API /bork/simple-test] Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        count: 0
      });
    }
    
    console.log('[API /bork/simple-test] Success! Total records:', count);
    
    return NextResponse.json({
      success: true,
      count: count || 0,
      message: 'Database connection successful'
    });
    
  } catch (error) {
    console.error('[API /bork/simple-test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    }, { status: 500 });
  }
}

