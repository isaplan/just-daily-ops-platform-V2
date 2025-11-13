import { NextRequest, NextResponse } from 'next/server';
import { 
  getEitjeMonthlyProgress, 
  getAllEitjeMonthlyProgress,
  getEitjeMissingDateRanges,
  getEitjeMonthlySummary,
  isDateSynced
} from '@/lib/eitje/progress-tracker';

/**
 * EITJE PROGRESS TRACKING API
 * 
 * Tracks monthly sync progress and detects data changes
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const action = searchParams.get('action') || 'summary';

    console.log('[API /eitje/progress] Request:', { endpoint, year, month, action });

    switch (action) {
      case 'monthly':
        if (!endpoint) {
          return NextResponse.json({
            success: false,
            error: 'endpoint parameter is required for monthly progress'
          }, { status: 400 });
        }
        
        const progress = await getEitjeMonthlyProgress(endpoint, year, month);
        return NextResponse.json({
          success: true,
          data: progress
        });

      case 'all':
        const allProgress = await getAllEitjeMonthlyProgress(year, month);
        return NextResponse.json({
          success: true,
          data: allProgress
        });

      case 'missing':
        if (!endpoint) {
          return NextResponse.json({
            success: false,
            error: 'endpoint parameter is required for missing ranges'
          }, { status: 400 });
        }
        
        const missingRanges = await getEitjeMissingDateRanges(endpoint, year, month);
        return NextResponse.json({
          success: true,
          data: missingRanges
        });

      case 'summary':
        const summary = await getEitjeMonthlySummary(year, month);
        return NextResponse.json({
          success: true,
          data: summary
        });

      case 'check-date':
        const date = searchParams.get('date');
        if (!endpoint || !date) {
          return NextResponse.json({
            success: false,
            error: 'endpoint and date parameters are required for date check'
          }, { status: 400 });
        }
        
        const isSynced = await isDateSynced(endpoint, date);
        return NextResponse.json({
          success: true,
          data: { date, isSynced }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: monthly, all, missing, summary, or check-date'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[API /eitje/progress] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get progress data'
    }, { status: 500 });
  }
}

