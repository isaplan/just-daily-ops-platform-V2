/**
 * POST /api/eitje/v2/reaggregate-hierarchical
 * Reaggregate all existing labor records to populate hierarchical time-series data
 * 
 * Body:
 * - locationIds?: string[] // Optional: specific locations, or all if empty
 * - startDate?: string // Optional: start date for reaggregation
 * - endDate?: string // Optional: end date for reaggregation
 * - force?: boolean // Force reaggregation even if hierarchical data exists
 * 
 * Returns: { success: boolean, processed: number, updated: number, errors: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { locationIds, startDate, endDate, force } = body;

    const db = await getDatabase();

    // Build query for records to reaggregate
    let query: any = {};
    
    if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
      query.locationId = { $in: locationIds.map((id: string) => new ObjectId(id)) };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // If not forcing, only process records without hierarchical data
    if (!force) {
      query.$or = [
        { hoursByYear: { $exists: false } },
        { hoursByYear: { $eq: [] } },
        { hoursByYear: null },
      ];
    }

    // Find records to process
    const recordsToProcess = await db.collection('eitje_aggregated')
      .find(query)
      .project({ locationId: 1, date: 1, _id: 1 })
      .toArray();

    if (recordsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No labor records found to reaggregate',
        processed: 0,
        updated: 0,
        errors: [],
      });
    }

    console.log(`[Reaggregate Hierarchical] Found ${recordsToProcess.length} labor records to process`);

    // Group by location for batch processing
    const recordsByLocation = new Map<string, typeof recordsToProcess>();
    recordsToProcess.forEach(record => {
      const locKey = record.locationId.toString();
      if (!recordsByLocation.has(locKey)) {
        recordsByLocation.set(locKey, []);
      }
      recordsByLocation.get(locKey)!.push(record);
    });

    // Reaggregate using the existing aggregation endpoint logic
    // For now, we'll trigger a full reaggregation for the date range
    const aggregationStartDate = startDate || '2020-01-01';
    const aggregationEndDate = endDate || new Date().toISOString().split('T')[0];

    // Call the aggregation endpoint internally
    const aggregationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/eitje/v2/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: aggregationStartDate,
        endDate: aggregationEndDate,
      }),
    });

    if (!aggregationResponse.ok) {
      const errorData = await aggregationResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reaggregate labor data');
    }

    const aggregationResult = await aggregationResponse.json();

    return NextResponse.json({
      success: true,
      message: `Reaggregated ${aggregationResult.recordsAggregated} labor records with hierarchical data`,
      processed: recordsToProcess.length,
      updated: aggregationResult.recordsAggregated || 0,
      errors: [],
    });

  } catch (error: any) {
    console.error('[API /eitje/v2/reaggregate-hierarchical] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reaggregate hierarchical data',
        processed: 0,
        updated: 0,
        errors: [error.message || 'Unknown error'],
      },
      { status: 500 }
    );
  }
}


