/**
 * GET /api/eitje/v2/aggregated-hours
 * Fetch aggregated hours from eitje_aggregated collection
 * 
 * ⚠️ REST API - COMMENTED OUT - DELETE WHEN GRAPHQL IS WORKING PROPERLY
 * This endpoint is no longer used. The application now uses GraphQL via:
 * - GraphQL Query: aggregatedHours
 * - Service: src/lib/services/workforce/hours-v2.service.ts
 * - GraphQL Resolver: src/lib/graphql/v2-resolvers.ts
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { AggregatedHoursRecord } from '@/models/workforce/hours-v2.model';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const locationId = searchParams.get('locationId');
    const environmentId = searchParams.get('environmentId');
    const teamName = searchParams.get('teamName');
    const userId = searchParams.get('userId');

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

    // Build query
    const query: any = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Location filter - filter by locationId (MongoDB ObjectId)
    if (locationId && locationId !== 'all') {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (e) {
        // Invalid ObjectId, skip location filter
        console.warn(`Invalid locationId: ${locationId}`);
      }
    }

    // Environment filter - filter by environmentId (Eitje's numeric ID)
    if (environmentId) {
      query.environmentId = parseInt(environmentId);
    }

    // Team filter
    if (teamName && teamName !== 'all') {
      query.teamName = teamName;
    }

    // User filter
    if (userId) {
      query.userId = parseInt(userId);
    }

    // Get total count
    const total = await db.collection('eitje_aggregated').countDocuments(query);

    // Fetch records with pagination
    const records = await db.collection('eitje_aggregated')
      .find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Transform records to AggregatedHoursRecord format
    const aggregatedRecords: AggregatedHoursRecord[] = records.map((record, index) => {
      return {
        id: record._id?.toString() || `${index}`,
        date: new Date(record.date).toISOString().split('T')[0],
        user_id: record.userId || null,
        user_name: record.userName || null,
        environment_id: record.environmentId || null,
        environment_name: record.environmentName || null,
        team_id: record.teamId || null,
        team_name: record.teamName || null,
        hours_worked: record.totalHoursWorked || 0,
        hourly_rate: record.hourlyRate || null,
        hourly_cost: record.hourlyCost || null,
        labor_cost: record.totalWageCost || null,
        shift_count: record.shiftCount || 0,
        total_breaks_minutes: record.totalBreaksMinutes || null,
        updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
        created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      records: aggregatedRecords,
      total,
      page,
      totalPages,
    });
  } catch (error: any) {
    console.error('[API /eitje/v2/aggregated-hours] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch aggregated hours',
      },
      { status: 500 }
    );
  }
}
*/

