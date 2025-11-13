import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/test-insert] Testing database insert...');
    
    const supabase = await createClient();
    
    // Try to insert a test record
    const testRecord = {
      location_id: '550e8400-e29b-41d4-a716-446655440001',
      bork_id: 999,
      name: 'Test Product Group',
      description: 'Test description',
      raw_data: { test: true },
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert test record:', testRecord);

    const { data, error } = await supabase
      .from('bork_product_groups')
      .insert(testRecord)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('Insert successful:', data);

    // Clean up the test record
    await supabase
      .from('bork_product_groups')
      .delete()
      .eq('bork_id', 999)
      .eq('location_id', '550e8400-e29b-41d4-a716-446655440001');

    return NextResponse.json({
      success: true,
      message: 'Database insert test successful',
      data: data
    });

  } catch (error) {
    console.error('[API /bork/test-insert] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
