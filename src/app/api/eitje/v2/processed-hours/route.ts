/**
 * GET /api/eitje/v2/processed-hours
 * Fetch processed hours (individual shift records) from eitje_raw_data
 * 
 * ⚠️ REST API - COMMENTED OUT - DELETE WHEN GRAPHQL IS WORKING PROPERLY
 * This endpoint is no longer used. The application now uses GraphQL via:
 * - GraphQL Query: processedHours
 * - Service: src/lib/services/workforce/hours-v2.service.ts
 * - GraphQL Resolver: src/lib/graphql/v2-resolvers.ts
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { ProcessedHoursRecord } from '@/models/workforce/hours-v2.model';

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
    const typeName = searchParams.get('typeName'); // Empty string means null (Gewerkte Uren)
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
      endpoint: 'time_registration_shifts',
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Build $and conditions for combining multiple filters
    const andConditions: any[] = [];

    // Location filter - map locationId to environmentId
    // Since eitje_raw_data may only have environmentId, we need to map locationId -> environmentId
    if (locationId && locationId !== 'all') {
      try {
        const locationObjId = new ObjectId(locationId);
        
        // Try to find location and get its environmentId from systemMappings
        const location = await db.collection('locations').findOne({ _id: locationObjId });
        
        if (location && location.systemMappings && Array.isArray(location.systemMappings)) {
          const eitjeMapping = location.systemMappings.find((m: any) => m.system === 'eitje');
          if (eitjeMapping && eitjeMapping.externalId) {
            // Filter by environmentId (Eitje's numeric ID)
            const envId = parseInt(eitjeMapping.externalId);
            andConditions.push({ environmentId: envId });
          } else {
            // Fallback: also try filtering by locationId directly (in case data was migrated)
            andConditions.push({
              $or: [
                { locationId: locationObjId },
                { locationId: locationObjId.toString() }
              ]
            });
          }
        } else {
          // Fallback: filter by locationId directly
          andConditions.push({ locationId: locationObjId });
        }
      } catch (e) {
        // Invalid ObjectId, skip location filter
        console.warn(`Invalid locationId: ${locationId}`, e);
      }
    }

    // Environment filter - filter by environmentId (Eitje's numeric ID)
    // This takes precedence if both locationId and environmentId are provided
    if (environmentId) {
      andConditions.push({ environmentId: parseInt(environmentId) });
    }

    if (teamName && teamName !== 'all') {
      // Filter by team name from extracted or rawApiResponse
      // Note: Team names are primarily stored in extracted.team_name
      andConditions.push({
        $or: [
          { 'extracted.team_name': teamName },
          { 'extracted.teamName': teamName },
          { 'rawApiResponse.team_name': teamName },
          { 'rawApiResponse.teamName': teamName }
        ]
      });
    }

    if (typeName !== null) {
      if (typeName === '') {
        // Empty string means filter for "Gewerkte Uren" (worked hours)
        // This can be stored as null, empty, or 'gewerkte_uren' (lowercase with underscore)
        andConditions.push({
          $or: [
            { 'extracted.type_name': null },
            { 'extracted.type_name': { $exists: false } },
            { 'extracted.type_name': '' },
            { 'extracted.type_name': 'gewerkte_uren' },
            { 'extracted.type_name': 'Gewerkte Uren' },
            { 'rawApiResponse.type_name': null },
            { 'rawApiResponse.type_name': { $exists: false } },
            { 'rawApiResponse.type_name': '' },
            { 'rawApiResponse.type_name': 'gewerkte_uren' },
            { 'rawApiResponse.type_name': 'Gewerkte Uren' }
          ]
        });
      } else {
        // Filter by specific type_name (case-insensitive match)
        andConditions.push({
          $or: [
            { 'extracted.type_name': typeName },
            { 'extracted.type_name': typeName.toLowerCase() },
            { 'extracted.type_name': typeName.toLowerCase().replace(' ', '_') },
            { 'rawApiResponse.type_name': typeName },
            { 'rawApiResponse.type_name': typeName.toLowerCase() },
            { 'rawApiResponse.type_name': typeName.toLowerCase().replace(' ', '_') }
          ]
        });
      }
    }

    if (userId) {
      andConditions.push({
        $or: [
          { 'extracted.userId': parseInt(userId) },
          { 'extracted.user_id': parseInt(userId) },
          { 'rawApiResponse.user_id': parseInt(userId) },
          { 'rawApiResponse.userId': parseInt(userId) }
        ]
      });
    }

    // Combine all conditions with $and if multiple filters
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Get total count
    const total = await db.collection('eitje_raw_data').countDocuments(query);

    // Fetch records with pagination
    const records = await db.collection('eitje_raw_data')
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get unique user IDs from records to fetch hourly wages
    const userIds = new Set<number>();
    records.forEach((record) => {
      const extracted = record.extracted || {};
      const raw = record.rawApiResponse || {};
      const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
      if (userId) {
        userIds.add(parseInt(String(userId)));
      }
    });

    // Fetch hourly wages from worker_profiles collection
    const hourlyWageMap = new Map<number, number | null>();
    if (userIds.size > 0) {
      try {
        // Query worker_profiles for active contracts (effective_to is null or in the future)
        const workerProfiles = await db.collection('worker_profiles')
          .find({
            eitje_user_id: { $in: Array.from(userIds) },
            $or: [
              { effective_to: null },
              { effective_to: { $gte: new Date() } }
            ]
          })
          .sort({ effective_from: -1 }) // Get most recent contract first
          .toArray();

        // Map user_id to hourly_wage (take the most recent contract)
        workerProfiles.forEach((profile: any) => {
          const userId = profile.eitje_user_id;
          if (userId && !hourlyWageMap.has(userId) && profile.hourly_wage !== null && profile.hourly_wage !== undefined) {
            hourlyWageMap.set(userId, Number(profile.hourly_wage));
          }
        });
      } catch (error) {
        console.warn('[API /eitje/v2/processed-hours] Error fetching hourly wages:', error);
        // Continue without hourly wage data if lookup fails
      }
    }

    // Transform records to ProcessedHoursRecord format
    const processedRecords: ProcessedHoursRecord[] = records.map((record, index) => {
      const extracted = record.extracted || {};
      const raw = record.rawApiResponse || {};
      const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
      const user_id_num = userId ? parseInt(String(userId)) : null;
      
      // Get hourly wage from worker_profiles
      const hourly_wage = user_id_num ? (hourlyWageMap.get(user_id_num) || null) : null;
      
      // Calculate worked hours
      const worked_hours = (() => {
        // Calculate worked hours from start and end times
        const startTime = extracted.start || raw.start;
        const endTime = extracted.end || raw.end;
        if (startTime && endTime) {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          const breakMins = extracted.breakMinutes || extracted.break_minutes || raw.break_minutes || raw.breakMinutes || 0;
          return Math.max(0, diffHours - (breakMins / 60));
        }
        return null;
      })();

      // Calculate wage_cost = hourly_wage × worked_hours
      const wage_cost = (hourly_wage !== null && hourly_wage !== undefined && worked_hours !== null && worked_hours !== undefined)
        ? hourly_wage * worked_hours
        : (extracted.wageCost || extracted.wage_cost || raw.wage_cost || raw.wageCost || null);
      
      return {
        id: record._id?.toString() || `${index}`,
        eitje_id: extracted.eitje_id || raw.id || raw.eitje_id,
        date: new Date(record.date).toISOString().split('T')[0],
        user_id: user_id_num || undefined,
        user_name: extracted.userName || extracted.user_name || raw.user_name || raw.userName || null,
        environment_id: record.environmentId || extracted.environmentId || raw.environment_id || null,
        environment_name: extracted.environmentName || extracted.environment_name || raw.environment_name || null,
        team_id: extracted.teamId || extracted.team_id || raw.team_id || raw.teamId || null,
        team_name: extracted.teamName || extracted.team_name || raw.team_name || raw.teamName || null,
        start: extracted.start || raw.start || null,
        end: extracted.end || raw.end || null,
        break_minutes: extracted.breakMinutes || extracted.break_minutes || raw.break_minutes || raw.breakMinutes || null,
        worked_hours,
        hourly_wage,
        wage_cost,
        type_name: extracted.type_name || extracted.typeName || raw.type_name || raw.typeName || null,
        shift_type: extracted.shift_type || extracted.shiftType || raw.shift_type || raw.shiftType || null,
        remarks: extracted.remarks || raw.remarks || null,
        approved: extracted.approved || raw.approved || null,
        planning_shift_id: extracted.planning_shift_id || extracted.planningShiftId || raw.planning_shift_id || raw.planningShiftId || null,
        exported_to_hr_integration: extracted.exported_to_hr_integration || extracted.exportedToHrIntegration || raw.exported_to_hr_integration || raw.exportedToHrIntegration || null,
        updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
        created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      records: processedRecords,
      total,
      page,
      totalPages,
    });
  } catch (error: any) {
    console.error('[API /eitje/v2/processed-hours] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch processed hours',
      },
      { status: 500 }
    );
  }
}
*/

