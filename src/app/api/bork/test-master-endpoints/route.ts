import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/test-master-endpoints] Testing master data endpoints...');
    
    const { locationId } = await request.json();
    
    const supabase = await createClient();
    
    // Get credentials
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
    
    // Test each master data endpoint
    const endpoints = [
      { name: 'product_groups', url: '/catalog/productgrouplist.json' },
      { name: 'payment_methods', url: '/catalog/paymodegrouplist.json' },
      { name: 'cost_centers', url: '/centers.json' },
      { name: 'users', url: '/users.json' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint.url}?appid=${apiKey}`;
        console.log(`Testing ${endpoint.name}: ${url.replace(apiKey, '[API_KEY]')}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        results.push({
          endpoint: endpoint.name,
          success: response.ok,
          status: response.status,
          dataCount: Array.isArray(data) ? data.length : 'not array',
          hasData: !!data
        });
        
        console.log(`${endpoint.name}: ${response.status} - ${Array.isArray(data) ? data.length : 'not array'} items`);
        
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`${endpoint.name} failed:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('[API /bork/test-master-endpoints] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
