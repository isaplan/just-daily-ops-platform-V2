import { NextRequest, NextResponse } from 'next/server';
import { testBorkConnection } from '@/lib/bork/api-client';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { locationId, testDate } = await request.json();
    
    console.log('[API /bork/test] Request:', { locationId, testDate });

    // Fetch credentials from database
    const supabase = await createClient();
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('provider', 'bork')
      .single();

    if (credError || !credentials) {
      return NextResponse.json({ 
        success: false, 
        error: `No API credentials found for location ${locationId}` 
      }, { status: 404 });
    }

    const { api_url: baseUrl, api_key: apiKey } = credentials;
    
    const result = await testBorkConnection(baseUrl, apiKey, testDate);
    
    return NextResponse.json({ 
      success: true, 
      status: result.status,
      message: 'Connection successful'
    });
    
  } catch (error) {
    console.error('[API /bork/test] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
