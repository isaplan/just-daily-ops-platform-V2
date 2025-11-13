import { NextRequest, NextResponse } from 'next/server';
import { cleanupAllDuplicates } from '@/lib/bork/cleanup-service';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/cleanup] Starting database-wide cleanup');
    
    const cleanupResult = await cleanupAllDuplicates();
    
    if (cleanupResult.success) {
      console.log('[API /bork/cleanup] Cleanup completed successfully:', {
        recordsDeleted: cleanupResult.recordsDeleted,
        duplicatesFound: cleanupResult.duplicatesFound
      });
      
      return NextResponse.json({
        success: true,
        recordsDeleted: cleanupResult.recordsDeleted,
        duplicatesFound: cleanupResult.duplicatesFound,
        message: `Database cleanup completed. ${cleanupResult.recordsDeleted} duplicate records removed.`
      });
    } else {
      console.error('[API /bork/cleanup] Cleanup failed:', cleanupResult.error);
      
      return NextResponse.json({
        success: false,
        error: cleanupResult.error || 'Cleanup failed',
        message: `Database cleanup failed: ${cleanupResult.error}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API /bork/cleanup] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database cleanup failed due to unexpected error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /bork/cleanup] Cleanup endpoint available');
    
    return NextResponse.json({
      success: true,
      message: 'Bork data cleanup endpoint is available',
      endpoints: {
        'POST /api/bork/cleanup': 'Trigger database-wide cleanup of duplicate records',
        'GET /api/bork/cleanup': 'Check cleanup endpoint status'
      },
      usage: {
        description: 'Use POST to trigger cleanup of all duplicate Bork sales data records',
        method: 'POST',
        body: 'No body required',
        response: {
          success: 'boolean - whether cleanup succeeded',
          recordsDeleted: 'number - records removed',
          duplicatesFound: 'number - total duplicates found',
          message: 'string - status message'
        }
      }
    });
    
  } catch (error) {
    console.error('[API /bork/cleanup] Error in GET endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

