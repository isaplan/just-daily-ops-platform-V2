import { NextRequest, NextResponse } from 'next/server';
import { aggregatePnLData, storeAggregatedData, aggregateAllDataForLocation } from '@/lib/finance/powerbi/aggregation-service';

export async function POST(request: NextRequest) {
  try {
    const { locationId, year, month, aggregateAll = false } = await request.json();
    
    if (!locationId || !year) {
      return NextResponse.json({
        success: false,
        error: 'locationId and year are required'
      }, { status: 400 });
    }
    
    if (aggregateAll) {
      // Aggregate all months for the location and year
      console.log(`[API /finance/pnl-aggregate] Aggregating all data for location ${locationId}, year ${year}`);
      const results = await aggregateAllDataForLocation(locationId, year);
      
      return NextResponse.json({
        success: true,
        message: `Successfully aggregated ${results.length} months of data`,
        data: results
      });
    } else {
      // Aggregate specific month
      if (!month) {
        return NextResponse.json({
          success: false,
          error: 'month is required when aggregateAll is false'
        }, { status: 400 });
      }
      
      console.log(`[API /finance/pnl-aggregate] Aggregating data for location ${locationId}, year ${year}, month ${month}`);
      const aggregated = await aggregatePnLData(locationId, year, month);
      
      return NextResponse.json({
        success: true,
        message: 'Data aggregated successfully',
        data: aggregated
      });
    }
  } catch (error) {
    console.error('[API /finance/pnl-aggregate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    if (!locationId || !year) {
      return NextResponse.json({
        success: false,
        error: 'locationId and year are required'
      }, { status: 400 });
    }
    
    if (month) {
      // Get specific month
      const aggregated = await aggregatePnLData(locationId, parseInt(year), parseInt(month));
      return NextResponse.json({
        success: true,
        data: aggregated
      });
    } else {
      // Get all months for the year
      const results = await aggregateAllDataForLocation(locationId, parseInt(year));
      return NextResponse.json({
        success: true,
        data: results
      });
    }
  } catch (error) {
    console.error('[API /finance/pnl-aggregate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}