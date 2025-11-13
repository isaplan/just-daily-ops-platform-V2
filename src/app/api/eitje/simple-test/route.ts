import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * SIMPLE EITJE TEST ENDPOINT
 * 
 * Direct test without complex API service
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/simple-test] Simple test request received');
    
    const body = await request.json();
    const { endpoint = 'environments' } = body;

    // DEFENSIVE: Get Eitje credentials
    const supabase = await createClient();
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (credError || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'No active Eitje credentials found'
      }, { status: 404 });
    }

    // DEFENSIVE: Simple direct fetch test
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${credentials.base_url}/${endpoint}`, {
        method: 'GET',
        headers: {
          'Partner-Username': credentials.additional_config.partner_username,
          'Partner-Password': credentials.additional_config.partner_password,
          'Api-Username': credentials.additional_config.api_username,
          'Api-Password': credentials.additional_config.api_password,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            endpoint,
            statusCode: response.status,
            responseTime
          }
        }, { status: 502 });
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        message: `Endpoint ${endpoint} test successful`,
        result: {
          endpoint,
          success: true,
          responseTime,
          statusCode: response.status,
          dataCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
        }
      });

    } catch (fetchError) {
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: false,
        error: `Fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        details: {
          endpoint,
          responseTime,
          errorType: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'
        }
      }, { status: 502 });
    }

  } catch (error) {
    console.error('[API /eitje/simple-test] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform simple test'
    }, { status: 500 });
  }
}

