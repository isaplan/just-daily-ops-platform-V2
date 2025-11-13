import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import {
  aggregateLaborHours,
  aggregatePlanningHours,
  aggregateRevenueDays,
  DateRange
} from '@/lib/eitje/aggregation-service';

/**
 * EITJE BATCH PROCESSING API
 * 
 * Processes all Eitje data in batches to avoid overloading Supabase
 * Uses record-based pagination (1000 records per batch) for efficient processing
 * Supports comprehensive date ranges (2024-2025) and different batch sizes
 */

export interface BatchProcessRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  batchSizeRecords?: number; // Default: 1000 records (Supabase limit)
  endpoints?: string[]; // Default: all data endpoints
  environmentId?: number;
  teamId?: number;
}

export interface BatchProcessResult {
  success: boolean;
  totalBatches: number;
  completedBatches: number;
  totalRecordsProcessed: number;
  totalRecordsAggregated: number;
  totalErrors: number;
  processingTime: number;
  batchResults: Array<{
    batchNumber: number;
    offset: number;
    limit: number;
    success: boolean;
    recordsProcessed: number;
    recordsAggregated: number;
    errors: string[];
    processingTime: number;
  }>;
  errors: string[];
}

// Available data endpoints (skip master data)
const DATA_ENDPOINTS = [
  'time_registration_shifts',
  'planning_shifts', 
  'revenue_days',
  'availability_shifts',
  'leave_requests',
  'events'
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: BatchProcessRequest = await request.json();
    
    // DEFENSIVE: Validate required parameters
    if (!body.startDate || !body.endDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: startDate and endDate are required'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.startDate) || !dateRegex.test(body.endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Validate date range
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    
    if (startDate >= endDate) {
      return NextResponse.json({
        success: false,
        error: 'startDate must be before endDate'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Set defaults
    const batchSizeRecords = body.batchSizeRecords || 1000; // Supabase limit
    const endpoints = body.endpoints || DATA_ENDPOINTS;
    const environmentId = body.environmentId;
    const teamId = body.teamId;
    
    console.log(`[Eitje Batch Process] Starting record-based batch processing:`, {
      startDate: body.startDate,
      endDate: body.endDate,
      batchSizeRecords,
      endpoints,
      environmentId,
      teamId
    });
    
    const result: BatchProcessResult = {
      success: true,
      totalBatches: 0, // Will be calculated dynamically
      completedBatches: 0,
      totalRecordsProcessed: 0,
      totalRecordsAggregated: 0,
      totalErrors: 0,
      processingTime: 0,
      batchResults: [],
      errors: []
    };
    
    // Process each endpoint with record-based pagination
    for (const endpoint of endpoints) {
      console.log(`[Eitje Batch Process] Processing ${endpoint} with record-based pagination`);
      
      try {
        const endpointResult = await processEndpointWithPagination(
          endpoint,
          body.startDate,
          body.endDate,
          batchSizeRecords,
          environmentId,
          teamId
        );
        
        result.totalBatches += endpointResult.totalBatches;
        result.completedBatches += endpointResult.completedBatches;
        result.totalRecordsProcessed += endpointResult.totalRecordsProcessed;
        result.totalRecordsAggregated += endpointResult.totalRecordsAggregated;
        result.totalErrors += endpointResult.totalErrors;
        result.batchResults.push(...endpointResult.batchResults);
        
        console.log(`[Eitje Batch Process] ${endpoint} completed: ${endpointResult.completedBatches}/${endpointResult.totalBatches} batches`);
        
      } catch (error) {
        console.error(`[Eitje Batch Process] ${endpoint} failed:`, error);
        result.errors.push(`${endpoint} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.processingTime = Date.now() - startTime;
    result.success = result.completedBatches === result.totalBatches;
    
    console.log(`[Eitje Batch Process] Completed:`, {
      success: result.success,
      totalBatches: result.totalBatches,
      completedBatches: result.completedBatches,
      totalRecordsProcessed: result.totalRecordsProcessed,
      totalRecordsAggregated: result.totalRecordsAggregated,
      totalErrors: result.totalErrors,
      processingTime: result.processingTime
    });
    
    return NextResponse.json({
      success: result.success,
      result
    });
    
  } catch (error) {
    console.error('[Eitje Batch Process] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during batch processing'
    }, { status: 500 });
  }
}

/**
 * Process an endpoint with record-based pagination
 */
async function processEndpointWithPagination(
  endpoint: string,
  startDate: string,
  endDate: string,
  batchSizeRecords: number,
  environmentId?: number,
  teamId?: number
): Promise<{
  totalBatches: number;
  completedBatches: number;
  totalRecordsProcessed: number;
  totalRecordsAggregated: number;
  totalErrors: number;
  batchResults: Array<{
    batchNumber: number;
    offset: number;
    limit: number;
    success: boolean;
    recordsProcessed: number;
    recordsAggregated: number;
    errors: string[];
    processingTime: number;
  }>;
}> {
  const supabase = await createClient();
  const tableName = getTableName(endpoint);
  
  if (!tableName) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  let offset = 0;
  let hasMoreRecords = true;
  let batchNumber = 0;
  const batchResults: any[] = [];
  let totalRecordsProcessed = 0;
  let totalRecordsAggregated = 0;
  let totalErrors = 0;
  
  console.log(`[Eitje Batch Process] Starting pagination for ${endpoint} (${tableName})`);
  
  while (hasMoreRecords) {
    batchNumber++;
    const batchStartTime = Date.now();
    
    console.log(`[Eitje Batch Process] Fetching batch ${batchNumber} for ${endpoint}: offset ${offset}, limit ${batchSizeRecords}`);
    
    // DEFENSIVE: Fetch records with pagination (without date filter first)
    // Similar to progress tracker approach - fetch all then filter
    let query = supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSizeRecords - 1);
    
    if (environmentId) {
      query = query.eq('environment_id', environmentId);
    }
    
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    
    const { data: allRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }
    
    if (!allRecords || allRecords.length === 0) {
      console.log(`[Eitje Batch Process] No more records for ${endpoint}`);
      hasMoreRecords = false;
      break;
    }
    
    // DEFENSIVE: Filter records by date range (similar to progress tracker)
    const records = allRecords.filter(record => {
      if (!record.date) {
        // If no date field, check raw_data for date
        const rawData = record.raw_data;
        if (rawData && rawData.date) {
          const recordDate = new Date(rawData.date);
          return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
        }
        // If no date anywhere, skip this record
        return false;
      }
      
      const recordDate = new Date(record.date);
      return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
    });
    
    console.log(`[Eitje Batch Process] Fetched ${allRecords.length} records, filtered to ${records.length} in date range for ${endpoint} batch ${batchNumber}`);
    
    if (records.length === 0) {
      // No records in this batch match the date range, continue to next batch
      offset += batchSizeRecords;
      continue;
    }
    
    // For now, just count the records fetched - aggregation will be done once at the end
    // This avoids the issue of processing the same date range multiple times
    const batchSuccess = true;
    const batchErrors: string[] = [];
    const batchRecordsProcessed = records.length;
    const batchRecordsAggregated = 0; // Will be calculated at the end
    
    console.log(`[Eitje Batch Process] ${endpoint} batch ${batchNumber}: fetched ${records.length} records`);
    
    const batchResult = {
      batchNumber,
      offset,
      limit: batchSizeRecords,
      success: batchSuccess,
      recordsProcessed: batchRecordsProcessed,
      recordsAggregated: batchRecordsAggregated,
      errors: batchErrors,
      processingTime: Date.now() - batchStartTime
    };
    
    batchResults.push(batchResult);
    totalRecordsProcessed += batchRecordsProcessed;
    totalRecordsAggregated += batchRecordsAggregated;
    totalErrors += batchErrors.length;
    
    console.log(`[Eitje Batch Process] ${endpoint} batch ${batchNumber} completed in ${batchResult.processingTime}ms`);
    
    // Move to next batch
    offset += batchSizeRecords;
    
    // DEFENSIVE: Add small delay between batches to avoid overwhelming Supabase
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
  }
  
  // Now perform aggregation for the entire date range
  console.log(`[Eitje Batch Process] Starting aggregation for ${endpoint} after fetching all records`);
  
  try {
    const dateRange: DateRange = {
      startDate,
      endDate,
      environmentId,
      teamId
    };
    
    let aggregationResult;
    
    switch (endpoint) {
      case 'time_registration_shifts':
        aggregationResult = await aggregateLaborHours(dateRange);
        break;
      case 'planning_shifts':
        aggregationResult = await aggregatePlanningHours(dateRange);
        break;
      case 'revenue_days':
        aggregationResult = await aggregateRevenueDays(dateRange);
        break;
      default:
        console.log(`[Eitje Batch Process] Skipping aggregation for ${endpoint} - no aggregation function`);
        aggregationResult = {
          recordsProcessed: totalRecordsProcessed,
          recordsAggregated: 0,
          errors: [`No aggregation function for ${endpoint}`]
        };
    }
    
    if (aggregationResult) {
      totalRecordsAggregated = aggregationResult.recordsAggregated;
      totalErrors += aggregationResult.errors.length;
      
      console.log(`[Eitje Batch Process] ${endpoint} aggregation completed: ${aggregationResult.recordsAggregated} records aggregated`);
      
      if (aggregationResult.errors.length > 0) {
        console.warn(`[Eitje Batch Process] ${endpoint} aggregation had ${aggregationResult.errors.length} errors:`, aggregationResult.errors);
      }
    }
    
  } catch (error) {
    console.error(`[Eitje Batch Process] ${endpoint} aggregation failed:`, error);
    totalErrors++;
  }
  
  return {
    totalBatches: batchNumber,
    completedBatches: batchNumber,
    totalRecordsProcessed,
    totalRecordsAggregated,
    totalErrors,
    batchResults
  };
}

/**
 * Get table name for endpoint
 */
function getTableName(endpoint: string): string | null {
  const tableMap: Record<string, string> = {
    'time_registration_shifts': 'eitje_time_registration_shifts_raw',
    'planning_shifts': 'eitje_planning_shifts_raw',
    'revenue_days': 'eitje_revenue_days_raw',
    'availability_shifts': 'eitje_availability_shifts_raw',
    'leave_requests': 'eitje_leave_requests_raw',
    'events': 'eitje_events_raw'
  };
  
  return tableMap[endpoint] || null;
}

/**
 * GET handler - Get batch processing status or available endpoints
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'endpoints') {
    return NextResponse.json({
      success: true,
      data: {
        availableEndpoints: DATA_ENDPOINTS,
        defaultBatchSize: 1000,
        maxBatchSize: 1000,
        description: 'Record-based pagination (Supabase limit: 1000 records per batch)'
      }
    });
  }
  
  if (action === 'status') {
    // TODO: Implement status tracking (could use Redis or database)
    return NextResponse.json({
      success: true,
      data: {
        status: 'idle',
        lastProcessed: null,
        activeBatches: 0
      }
    });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      message: 'Eitje Batch Processing API',
      endpoints: {
        'POST /api/eitje/process-all': 'Start batch processing',
        'GET /api/eitje/process-all?action=endpoints': 'Get available endpoints',
        'GET /api/eitje/process-all?action=status': 'Get processing status'
      }
    }
  });
}
