/**
 * GET /api/bork/v2/check-data
 * 
 * Check Bork data in MongoDB for a specific date range or location
 * 
 * Query params:
 * - locationId: optional - filter by location
 * - startDate: optional - YYYY-MM-DD format
 * - endDate: optional - YYYY-MM-DD format
 * - month: optional - month number (1-12)
 * - year: optional - year (e.g., 2025)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const db = await getDatabase();

    // Build query
    const query: any = {};

    if (locationId) {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (error) {
        // If not a valid ObjectId, try to find location by systemMappings
        const location = await db.collection('locations').findOne({
          'systemMappings.externalId': locationId,
          'systemMappings.system': 'bork',
        });
        if (location) {
          query.locationId = location._id;
        } else {
          return NextResponse.json(
            { success: false, error: `Location not found: ${locationId}` },
            { status: 404 }
          );
        }
      }
    }

    // Date filtering
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Count total records
    const totalCount = await db.collection('bork_raw_data').countDocuments(query);

    // Get sample records
    const sampleRecords = await db.collection('bork_raw_data')
      .find(query)
      .sort({ date: -1 })
      .limit(10)
      .toArray();

    // Get date range
    const dateRange = await db.collection('bork_raw_data').aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          uniqueDates: { $addToSet: '$date' },
        },
      },
    ]).toArray();

    // Get location info if locationId provided
    let locationInfo = null;
    if (locationId) {
      try {
        const location = await db.collection('locations').findOne({
          _id: query.locationId || new ObjectId(locationId),
        });
        if (location) {
          locationInfo = {
            name: location.name,
            code: location.code,
            isActive: location.isActive,
          };
        }
      } catch (error) {
        // Location already found above
      }
    }

    // Count by location
    const byLocation = await db.collection('bork_raw_data').aggregate([
      { $match: query },
      {
        $group: {
          _id: '$locationId',
          count: { $sum: 1 },
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
        },
      },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: '_id',
          as: 'location',
        },
      },
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          locationId: '$_id',
          locationName: '$location.name',
          count: 1,
          minDate: 1,
          maxDate: 1,
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        totalRecords: totalCount,
        locationInfo,
        dateRange: dateRange[0] ? {
          minDate: dateRange[0].minDate,
          maxDate: dateRange[0].maxDate,
          uniqueDatesCount: dateRange[0].uniqueDates?.length || 0,
        } : null,
        byLocation,
        sampleRecords: sampleRecords.map((record) => ({
          _id: record._id,
          locationId: record.locationId,
          date: record.date,
          ticketsCount: Array.isArray(record.rawApiResponse) ? record.rawApiResponse.length : 0,
          createdAt: record.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Bork Check Data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check Bork data',
      },
      { status: 500 }
    );
  }
}


