import { NextRequest, NextResponse } from 'next/server';
import { fetchEitjeEnvironments } from '@/lib/eitje/api-service';

/**
 * EITJE API CONNECTION ENDPOINT - EXTREME DEFENSIVE MODE
 * 
 * This endpoint handles Eitje API connection testing and validation
 * with comprehensive error handling and security measures.
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/connect] Connection request received');
    
    const body = await request.json();
    const { baseUrl, apiKey, additional_config, timeout = 30000, retryAttempts = 3 } = body;
    
    // DEFENSIVE: Validate required parameters for Eitje
    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: baseUrl is required'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate Eitje 4-credential system
    if (!additional_config || 
        !additional_config.partner_username || 
        !additional_config.partner_password || 
        !additional_config.api_username || 
        !additional_config.api_password) {
      return NextResponse.json({
        success: false,
        error: 'Missing required Eitje credentials: partner_username, partner_password, api_username, and api_password are required'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Validate URL format
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid baseUrl: Must be a valid URL'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Test connection using simple function
    const credentials = additional_config;
    
    try {
      // Test connection by fetching environments
      const data = await fetchEitjeEnvironments(baseUrl, credentials);
      
      console.log('[API /eitje/connect] Connection successful');
      
      return NextResponse.json({
        success: true,
        connection: {
          baseUrl,
          status: 'connected',
          auth: 'verified',
          data: 'available'
        },
        message: 'Eitje API connection established successfully'
      });
      
    } catch (connectionError) {
      console.error('[API /eitje/connect] Connection test failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: `Connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`,
        details: {
          baseUrl,
          errorType: connectionError instanceof Error ? connectionError.constructor.name : 'Unknown'
        }
      }, { status: 502 });
    }
    
  } catch (error) {
    console.error('[API /eitje/connect] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to test connection.'
  }, { status: 405 });
}
