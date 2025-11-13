import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import {
  aggregateLaborHours,
  aggregatePlanningHours,
  aggregateRevenueDays,
} from '@/lib/eitje/aggregation-service';

/**
 * Process raw data for a specific endpoint and month
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, year, month } = body;

    if (!endpoint || !year || !month) {
      return NextResponse.json({
        success: false,
        error: 'endpoint, year, and month are required'
      }, { status: 400 });
    }

    // Calculate date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    console.log(`[API /eitje/process-endpoint] Processing ${endpoint} for ${year}-${month} (${startDate} to ${endDate})`);

    let result;
    
    switch (endpoint) {
      case 'time_registration_shifts':
        result = await aggregateLaborHours({
          startDate,
          endDate
        });
        break;
        
      case 'planning_shifts':
        result = await aggregatePlanningHours({
          startDate,
          endDate
        });
        break;
        
      case 'revenue_days':
        result = await aggregateRevenueDays({
          startDate,
          endDate
        });
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Processing not supported for endpoint: ${endpoint}`
        }, { status: 400 });
    }

    console.log(`[API /eitje/process-endpoint] Processing completed for ${endpoint}:`, result);

    return NextResponse.json({
      success: true,
      message: `Processing completed for ${endpoint}`,
      result
    });

  } catch (error) {
    console.error('[API /eitje/process-endpoint] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process endpoint data'
    }, { status: 500 });
  }
}


