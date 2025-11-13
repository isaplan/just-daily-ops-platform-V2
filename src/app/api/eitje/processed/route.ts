import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

const ITEMS_PER_PAGE = 50;

/**
 * EITJE PROCESSED DATA API ENDPOINT
 * 
 * Returns processed data with all normalized columns (no JSONB parsing needed)
 * Supports filtering, pagination, and sorting
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const environmentId = searchParams.get('environmentId');
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);
    
    if (!endpoint) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameter: endpoint" 
      }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameters: startDate and endDate" 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Map endpoint to table name
    const tableMap: Record<string, string> = {
      'time_registration_shifts': 'eitje_time_registration_shifts_processed',
      'planning_shifts': 'eitje_planning_shifts_processed',
      'revenue_days': 'eitje_revenue_days_processed'
    };

    const tableName = tableMap[endpoint];
    if (!tableName) {
      return NextResponse.json({ 
        success: false, 
        error: `Unsupported endpoint: ${endpoint}` 
      }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // Apply filters
    if (environmentId) {
      query = query.eq('environment_id', parseInt(environmentId, 10));
    }

    if (teamId) {
      query = query.eq('team_id', parseInt(teamId, 10));
    }

    if (userId && endpoint !== 'revenue_days') {
      query = query.eq('user_id', parseInt(userId, 10));
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: records, error, count } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('[API /eitje/processed] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

