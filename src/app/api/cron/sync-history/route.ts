import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Get sync history for Bork and Eitje cron jobs
 * Returns last N sync attempts with success/failure status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const provider = searchParams.get('provider'); // 'bork', 'eitje', or null for both

    const supabase = await createClient();

    // Build query for api_sync_logs
    // Start with absolute minimum columns that should always exist
    // Test each optional column individually to see what exists
    const baseColumns = ['id', 'location_id', 'sync_type', 'status', 'started_at', 'completed_at'];
    const optionalColumns: string[] = [];
    
    // Test which optional columns exist
    const columnsToTest = [
      'error_message',
      'records_inserted',
      'records_fetched',
      'provider',
      'metadata'
    ];
    
    for (const col of columnsToTest) {
      try {
        const testResult = await supabase
          .from('api_sync_logs')
          .select(col)
          .limit(1);
        
        if (!testResult.error) {
          optionalColumns.push(col);
          console.log(`[API /cron/sync-history] Found column: ${col}`);
        } else {
          console.log(`[API /cron/sync-history] Column ${col} does not exist`);
        }
      } catch (e) {
        console.log(`[API /cron/sync-history] Could not test column ${col}`);
      }
    }
    
    // Build select query with only existing columns
    const allColumns = [...baseColumns, ...optionalColumns];
    let selectFields = allColumns.join(', ');
    
    // Always try to include location name if location_id exists
    if (baseColumns.includes('location_id')) {
      selectFields += ', locations:location_id (name)';
    }
    
    // Build query
    let query = supabase.from('api_sync_logs').select(selectFields);
    
    // Apply provider filter if provider column exists
    if (optionalColumns.includes('provider')) {
      if (provider) {
        query = query.eq('provider', provider);
      } else {
        query = query.in('provider', ['bork', 'eitje']);
      }
    }

    // Get all sync logs (we'll filter by recent activity - cron jobs run hourly)
    // Note: sync_trigger column may not exist in all schemas, so we get all and filter in code
    const { data: syncLogs, error } = await query
      .order('started_at', { ascending: false })
      .limit(limit * 2); // Get more to filter manually

    // Filter to show recent automated syncs (last 24 hours for hourly cron jobs)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filteredLogs = (syncLogs || []).filter(log => {
      const logDate = new Date(log.started_at);
      return logDate >= oneDayAgo; // Show logs from last 24 hours
    }).slice(0, limit); // Limit to requested number

    if (error) {
      console.error('[API /cron/sync-history] Error fetching sync logs:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Get cron job status from config tables (infer from mode)
    let cronStatus = { bork: false, eitje: false };
    try {
      const { data: borkConfig } = await supabase
        .from('bork_sync_config')
        .select('mode')
        .single();
      
      const { data: eitjeConfig } = await supabase
        .from('eitje_sync_config')
        .select('mode')
        .single();

      cronStatus = {
        bork: borkConfig?.mode === 'active',
        eitje: eitjeConfig?.mode === 'incremental'
      };
    } catch (e) {
      console.log('[API /cron/sync-history] Could not determine cron job status');
    }

    // Format results
    const history = filteredLogs.map((log: any) => {
      // Infer provider from metadata or sync_type if provider column doesn't exist
      let inferredProvider: 'bork' | 'eitje' | 'unknown' = 'unknown';
      if (log.provider) {
        inferredProvider = log.provider;
      } else if (log.sync_type) {
        // Try to infer from sync_type
        const syncType = String(log.sync_type).toLowerCase();
        if (syncType.includes('bork')) {
          inferredProvider = 'bork';
        } else if (syncType.includes('eitje')) {
          inferredProvider = 'eitje';
        }
      } else if (log.metadata?.provider) {
        inferredProvider = log.metadata.provider;
      }
      
      // Safely extract records_inserted from various possible locations
      let recordsInserted = 0;
      if (log.records_inserted !== undefined) {
        recordsInserted = log.records_inserted;
      } else if (log.metadata && typeof log.metadata === 'object') {
        recordsInserted = (log.metadata as any)?.records_inserted ?? 
                          (log.metadata as any)?.recordsInserted ?? 
                          (log.metadata as any)?.records_inserted ?? 0;
      }
      
      return {
        id: log.id,
        provider: inferredProvider,
        location: log.locations?.name || log.location_id,
        locationId: log.location_id,
        syncType: log.sync_type,
        status: log.status,
        success: log.status === 'completed',
        recordsInserted: recordsInserted,
        errorMessage: log.error_message || null,
        startedAt: log.started_at,
        completedAt: log.completed_at || null,
        duration: log.completed_at && log.started_at
          ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
          : null,
        metadata: log.metadata || null
      };
    });

    // cronStatus is already set above

    return NextResponse.json({
      success: true,
      data: {
        history,
        cronStatus,
        total: history.length
      }
    });

  } catch (error) {
    console.error('[API /cron/sync-history] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

