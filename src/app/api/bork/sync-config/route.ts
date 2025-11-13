import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Bork Sync Configuration API
 * Get and update bork_sync_config settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: config, error } = await supabase
      .from('bork_sync_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: config || null
    });

  } catch (error) {
    console.error('[API /bork/sync-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, sync_interval_minutes, sync_hour, enabled_locations } = body;

    const supabase = await createClient();

    // Upsert config (update or insert)
    const { data: existing } = await supabase
      .from('bork_sync_config')
      .select('id')
      .single();

    const configData: any = {
      mode: mode || 'paused',
      sync_interval_minutes: sync_interval_minutes || 1440,
      sync_hour: sync_hour ?? 6,
      enabled_locations: enabled_locations || [],
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('bork_sync_config')
        .update(configData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('bork_sync_config')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Toggle cron jobs based on mode
    if (mode === 'active') {
      await supabase.rpc('toggle_bork_cron_jobs', { enabled: true });
    } else {
      await supabase.rpc('toggle_bork_cron_jobs', { enabled: false });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[API /bork/sync-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

