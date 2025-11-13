import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/progress-history
 * Get processing history (lazy loaded)
 * 
 * Query params:
 * - year: number (optional)
 * - month: number (optional)
 * - limit: number (default: 50)
 * 
 * Returns: { success: boolean, data: { history: [...] } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createClient();

    // For now, return empty history (can be extended later with actual history tracking)
    // This would require a history/audit table to track processing actions
    
    const history: any[] = [];

    // If year and month provided, could filter by date range
    // For now, return empty array as placeholder

    return NextResponse.json({
      success: true,
      data: {
        history,
        message: 'History tracking will be implemented in future update'
      }
    });

  } catch (error) {
    console.error('[API /eitje/v2/progress-history] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get progress history'
    }, { status: 500 });
  }
}

