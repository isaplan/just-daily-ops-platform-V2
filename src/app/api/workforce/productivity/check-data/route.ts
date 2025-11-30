/**
 * Productivity Data Verification Endpoint
 * Verifies hierarchical productivity data exists in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = await getDatabase();
    
    const query: any = {};
    
    if (locationId && locationId !== 'all') {
      query.locationId = new ObjectId(locationId);
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = {
        $gte: start,
        $lte: end,
      };
    }

    // Count records
    const totalRecords = await db.collection('labor_productivity_hierarchical')
      .countDocuments(query);

    // Get sample record
    const sampleRecord = await db.collection('labor_productivity_hierarchical')
      .findOne(query);

    // Get breakdown by division
    const divisionBreakdown: Record<string, number> = {};
    if (sampleRecord && sampleRecord.byDivision) {
      for (const divisionName of Object.keys(sampleRecord.byDivision)) {
        divisionBreakdown[divisionName] = 1; // At least one record has this division
      }
    }

    // Get breakdown by location
    const locationBreakdown = await db.collection('labor_productivity_hierarchical')
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: '$locationId',
            locationName: { $first: '$locationName' },
            count: { $sum: 1 },
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        totalRecords,
        sampleRecord: sampleRecord ? {
          date: sampleRecord.date,
          locationId: sampleRecord.locationId,
          locationName: sampleRecord.locationName,
          divisions: Object.keys(sampleRecord.byDivision || {}),
          hasTeamCategories: Object.values(sampleRecord.byDivision || {}).some((div: any) => 
            Object.keys(div.byTeamCategory || {}).length > 0
          ),
          hasWorkers: Object.values(sampleRecord.byDivision || {}).some((div: any) => 
            Object.values(div.byTeamCategory || {}).some((cat: any) => 
              Object.values(cat.bySubTeam || {}).some((subTeam: any) => 
                Object.keys(subTeam.byWorker || {}).length > 0
              )
            )
          ),
        } : null,
        divisionBreakdown,
        byLocation: locationBreakdown.map((loc: any) => ({
          locationId: loc._id,
          locationName: loc.locationName,
          count: loc.count,
          minDate: loc.minDate,
          maxDate: loc.maxDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Productivity Check Data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check productivity data',
      },
      { status: 500 }
    );
  }
}








