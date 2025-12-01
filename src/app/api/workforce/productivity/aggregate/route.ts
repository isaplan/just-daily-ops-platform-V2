/**
 * Productivity Aggregation API Route
 * 
 * Daily cron job endpoint to aggregate productivity data into hierarchical structure
 * Creates labor_productivity_hierarchical collection with Location → Division → Team → Worker hierarchy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { getLocations } from '@/lib/services/graphql/queries';
import { buildProductivityHierarchy } from '@/lib/services/workforce/productivity-hierarchy.service';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for large date ranges

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, locationId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get locations to process
    const locations = await getLocations();
    const validLocations = locations.filter(
      (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
    );

    const locationIds = locationId 
      ? [locationId]
      : validLocations.map((loc: any) => loc.id);

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    // Process each location
    for (const locId of locationIds) {
      try {
        // Iterate through each day in the date range
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          try {
            // Build hierarchy for this location and date
            const hierarchy = await buildProductivityHierarchy(locId, new Date(currentDate));
            
            if (hierarchy) {
              // Check if record already exists
              const existing = await db.collection('labor_productivity_hierarchical')
                .findOne({
                  locationId: new ObjectId(locId),
                  date: new Date(currentDate),
                });
              
              if (existing) {
                // Update existing record
                await db.collection('labor_productivity_hierarchical')
                  .updateOne(
                    { _id: existing._id },
                    {
                      $set: {
                        ...hierarchy,
                        updatedAt: new Date(),
                      },
                    }
                  );
                totalUpdated++;
              } else {
                // Create new record
                await db.collection('labor_productivity_hierarchical')
                  .insertOne({
                    ...hierarchy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                totalCreated++;
              }
              
              totalProcessed++;
            }
          } catch (dayError: any) {
            errors.push(`Error processing ${locId} on ${currentDate.toISOString().split('T')[0]}: ${dayError.message}`);
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (locError: any) {
        errors.push(`Error processing location ${locId}: ${locError.message}`);
      }
    }

    // Verify aggregation by querying database
    const verificationQuery = {
      locationId: locationIds.length === 1 ? new ObjectId(locationIds[0]) : { $in: locationIds.map((id: string) => new ObjectId(id)) },
      date: {
        $gte: start,
        $lte: end,
      },
    };
    
    const verificationCount = await db.collection('labor_productivity_hierarchical')
      .countDocuments(verificationQuery);
    
    const sampleRecord = await db.collection('labor_productivity_hierarchical')
      .findOne(verificationQuery);

    return NextResponse.json({
      success: true,
      message: 'Productivity aggregation completed',
      data: {
        totalProcessed,
        totalCreated,
        totalUpdated,
        verificationCount,
        sampleRecord: sampleRecord ? {
          date: sampleRecord.date,
          locationId: sampleRecord.locationId,
          locationName: sampleRecord.locationName,
          divisions: Object.keys(sampleRecord.byDivision || {}),
        } : null,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('[Productivity Aggregation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate productivity data',
      },
      { status: 500 }
    );
  }
}










