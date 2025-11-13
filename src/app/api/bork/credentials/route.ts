import { NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET() {
  try {
    console.log('[API /bork/credentials] Fetching credentials...');
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('api_credentials')
      .select('id, location_id, api_key, api_url, is_active')
      .eq('is_active', true)
      .eq('provider', 'bork');
    
    if (error) {
      console.error('[API /bork/credentials] Database error:', error);
      throw error;
    }
    
    console.log('[API /bork/credentials] Found', data?.length || 0, 'active credentials');
    
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[API /bork/credentials] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
