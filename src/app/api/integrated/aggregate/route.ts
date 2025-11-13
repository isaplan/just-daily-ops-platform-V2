import { NextRequest, NextResponse } from 'next/server';
import { createIntegratedAggregationService, IntegratedAggregationConfig } from '@/lib/integrated/aggregation-service';

/**
 * INTEGRATED AGGREGATION API - EXTREME DEFENSIVE MODE
 * 
 * This endpoint handles aggregation from both Bork and Eitje data sources
 * with comprehensive error handling and validation.
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /integrated/aggregate] Integrated aggregation request received');
    
    const body = await request.json();
    const {
      borkEnabled = true,
      eitjeEnabled = false,
      eitjeConfig,
      dateRange,
      locationIds
    } = body;

    // DEFENSIVE: Validate configuration
    if (!borkEnabled && !eitjeEnabled) {
      return NextResponse.json({
        success: false,
        error: 'At least one data source must be enabled (borkEnabled or eitjeEnabled)'
      }, { status: 400 });
    }

    if (eitjeEnabled && !eitjeConfig) {
      console.log('[API /integrated/aggregate] Eitje config not provided, will fetch from database');
    }

    // DEFENSIVE: Validate Eitje config if provided
    if (eitjeConfig) {
      if (!eitjeConfig.baseUrl || !eitjeConfig.apiKey) {
        return NextResponse.json({
          success: false,
          error: 'Eitje configuration must include baseUrl and apiKey'
        }, { status: 400 });
      }

      if (eitjeConfig.apiKey.length < 10) {
        return NextResponse.json({
          success: false,
          error: 'Eitje API key must be at least 10 characters'
        }, { status: 400 });
      }
    }

    // DEFENSIVE: Validate date range if provided
    if (dateRange) {
      if (dateRange.start && !isValidDate(dateRange.start)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid startDate format. Use YYYY-MM-DD'
        }, { status: 400 });
      }

      if (dateRange.end && !isValidDate(dateRange.end)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid endDate format. Use YYYY-MM-DD'
        }, { status: 400 });
      }

      if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
        return NextResponse.json({
          success: false,
          error: 'startDate cannot be after endDate'
        }, { status: 400 });
      }
    }

    // DEFENSIVE: Create configuration
    const config: IntegratedAggregationConfig = {
      borkEnabled,
      eitjeEnabled,
      eitjeConfig: eitjeConfig ? {
        baseUrl: eitjeConfig.baseUrl,
        apiKey: eitjeConfig.apiKey,
        timeout: Math.min(Math.max(eitjeConfig.timeout || 30000, 1000), 60000),
        retryAttempts: Math.min(Math.max(eitjeConfig.retryAttempts || 3, 1), 10),
        enableLogging: eitjeConfig.enableLogging !== false,
        validateData: eitjeConfig.validateData !== false
      } : undefined,
      dateRange,
      locationIds
    };

    console.log('[API /integrated/aggregate] Configuration:', {
      ...config,
      eitjeConfig: eitjeConfig ? { ...eitjeConfig, apiKey: '***' } : undefined
    });

    // DEFENSIVE: Create service and run aggregation
    const service = createIntegratedAggregationService();
    const result = await service.aggregateAllSources(config);

    console.log('[API /integrated/aggregate] Aggregation result:', {
      success: result.success,
      dataSource: result.dataSource,
      totalRecords: result.totalRecords,
      totalRevenue: result.totalRevenue,
      processingTime: result.processingTime,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    // DEFENSIVE: Return appropriate response
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Integrated aggregation completed successfully. ${result.totalRecords} records processed from ${result.dataSource} source(s).`,
        data: {
          dataSource: result.dataSource,
          totalRecords: result.totalRecords,
          totalRevenue: result.totalRevenue,
          totalQuantity: result.totalQuantity,
          processingTime: result.processingTime,
          details: result.details
        },
        warnings: result.warnings.length > 0 ? result.warnings : undefined
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Integrated aggregation failed',
        details: {
          errors: result.errors,
          warnings: result.warnings,
          processingTime: result.processingTime
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API /integrated/aggregate] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown aggregation error'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Get aggregation status
 */
export async function GET() {
  try {
    console.log('[API /integrated/aggregate] Status request received');
    
    const service = createIntegratedAggregationService();
    const status = await service.getAggregationStatus();
    
    return NextResponse.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('[API /integrated/aggregate] Status error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown status error'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}
