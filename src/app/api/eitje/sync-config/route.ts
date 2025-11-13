import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Eitje Sync Configuration API
 * Get and update eitje_sync_config settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: config, error } = await supabase
      .from('eitje_sync_config')
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
    console.error('[API /eitje/sync-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, incremental_interval_minutes, worker_interval_minutes, enabled_endpoints } = body;

    const supabase = await createClient();

    // Upsert config (update or insert)
    const { data: existing } = await supabase
      .from('eitje_sync_config')
      .select('id')
      .single();

    const configData: any = {
      mode: mode || 'manual',
      incremental_interval_minutes: incremental_interval_minutes || 60,
      worker_interval_minutes: worker_interval_minutes || 5,
      enabled_endpoints: enabled_endpoints || ['time_registration_shifts', 'planning_shifts', 'revenue_days'],
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('eitje_sync_config')
        .update(configData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('eitje_sync_config')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Toggle cron jobs based on mode
    if (mode === 'incremental') {
      await supabase.rpc('toggle_eitje_cron_jobs', { enabled: true });
    } else {
      await supabase.rpc('toggle_eitje_cron_jobs', { enabled: false });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[API /eitje/sync-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

