import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      start_date = '2024-01-01', 
      end_date = new Date().toISOString().split('T')[0]
    } = await req.json();

    console.log('[bork-backfill] Starting backfill orchestration', {
      start_date,
      end_date
    });

    // Get enabled locations from config
    const { data: config, error: configError } = await supabaseClient
      .from('bork_sync_config')
      .select('enabled_locations, worker_interval_minutes')
      .single();

    if (configError || !config) {
      throw new Error('Sync configuration not found');
    }

    const enabledLocations = config.enabled_locations || [];
    const workerInterval = config.worker_interval_minutes || 5;

    if (enabledLocations.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No locations enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[bork-backfill] Enabled locations:', enabledLocations.length);

    // Calculate daily chunks (one day per location per job)
    const chunks = calculateChunks(start_date, end_date, enabledLocations);
    
    console.log('[bork-backfill] Calculated chunks', {
      total_chunks: chunks.length,
      first_chunk: chunks[0],
      last_chunk: chunks[chunks.length - 1]
    });

    // Create progress tracking record
    const { data: progress, error: progressError } = await supabaseClient
      .from('bork_backfill_progress')
      .insert({
        start_date,
        end_date,
        total_chunks: chunks.length,
        status: 'in_progress'
      })
      .select()
      .single();

    if (progressError) {
      throw new Error(`Failed to create progress record: ${progressError.message}`);
    }

    console.log('[bork-backfill] Created progress record:', progress.id);

    // Enqueue chunks for processing (spread over time based on worker interval)
    const queueInserts = chunks.map((chunk, index) => ({
      progress_id: progress.id,
      chunk_start: chunk.date,
      chunk_end: chunk.date,
      location_id: chunk.location_id,
      status: 'pending',
      next_run_at: new Date(Date.now() + (index * workerInterval * 60 * 1000)).toISOString()
    }));

    const { error: queueError } = await supabaseClient
      .from('bork_backfill_queue')
      .insert(queueInserts);

    if (queueError) {
      throw new Error(`Failed to enqueue chunks: ${queueError.message}`);
    }

    console.log('[bork-backfill] Enqueued chunks', {
      total_chunks: chunks.length,
      first_run_at: queueInserts[0].next_run_at,
      last_run_at: queueInserts[queueInserts.length - 1].next_run_at
    });

    const estimatedHours = Math.ceil((chunks.length * workerInterval) / 60);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Backfill started',
        progress_id: progress.id,
        total_chunks: chunks.length,
        estimated_duration_hours: estimatedHours,
        worker_interval_minutes: workerInterval
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[bork-backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateChunks(
  startDate: string, 
  endDate: string, 
  locationIds: string[]
): Array<{ date: string; location_id: string }> {
  const chunks = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Create one chunk per location per day
    for (const locationId of locationIds) {
      chunks.push({
        date: dateStr,
        location_id: locationId
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return chunks;
}
