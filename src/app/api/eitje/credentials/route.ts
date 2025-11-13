import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE CREDENTIALS MANAGEMENT ENDPOINT
 * 
 * Handles CRUD operations for Eitje API credentials
 */

export async function GET() {
  try {
    console.log('[API /eitje/credentials] Fetching Eitje credentials...');
    
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[API /eitje/credentials] Database error:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log('[API /eitje/credentials] No Eitje credentials found');
      return NextResponse.json({
        success: false,
        error: 'No Eitje credentials found in database'
      }, { status: 404 });
    }

    // Get the first (most recent) record
    const credentials = Array.isArray(data) ? data[0] : data;

    console.log('[API /eitje/credentials] Credentials fetched successfully');

    return NextResponse.json({
      success: true,
      credentials: {
        id: credentials.id,
        provider: credentials.provider,
        api_key: credentials.api_key,
        base_url: credentials.base_url,
        additional_config: credentials.additional_config,
        is_active: credentials.is_active,
        created_at: credentials.created_at,
        updated_at: credentials.updated_at
      }
    });

  } catch (error) {
    console.error('[API /eitje/credentials] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch credentials'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/credentials] Saving Eitje credentials...');
    
    const supabase = await createClient();
    const body = await request.json();
    const { 
      api_key, 
      base_url, 
      additional_config, 
      is_active = true 
    } = body;

    // DEFENSIVE: Validate required fields for Eitje
    if (!base_url) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: base_url is required'
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
      new URL(base_url);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid base_url: Must be a valid URL'
      }, { status: 400 });
    }

    // DEFENSIVE: Prepare credentials data for Eitje
    const credentialsData = {
      provider: 'eitje',
      location_id: null,
      api_key: api_key || '', // Keep for compatibility but not used for auth
      base_url,
      additional_config: additional_config || {},
      is_active,
      updated_at: new Date().toISOString()
    };

    // DEFENSIVE: Upsert credentials (insert or update)
    const { data, error } = await supabase
      .from('api_credentials')
      .upsert(credentialsData, {
        onConflict: 'provider,location_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[API /eitje/credentials] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save credentials'
      }, { status: 500 });
    }

    console.log('[API /eitje/credentials] Credentials saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully',
      credentials: {
        id: data.id,
        provider: data.provider,
        api_key: data.api_key,
        base_url: data.base_url,
        additional_config: data.additional_config,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    });

  } catch (error) {
    console.error('[API /eitje/credentials] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save credentials'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('[API /eitje/credentials] Deleting Eitje credentials...');
    
    const supabase = await createClient();
    const { error } = await supabase
      .from('api_credentials')
      .delete()
      .eq('provider', 'eitje');

    if (error) {
      console.error('[API /eitje/credentials] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete credentials'
      }, { status: 500 });
    }

    console.log('[API /eitje/credentials] Credentials deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Credentials deleted successfully'
    });

  } catch (error) {
    console.error('[API /eitje/credentials] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete credentials'
    }, { status: 500 });
  }
}
