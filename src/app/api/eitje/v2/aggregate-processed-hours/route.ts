/**
 * POST /api/eitje/v2/aggregate-processed-hours
 * 
 * Aggregate Eitje raw data into processed_hours_aggregated collection
 * Individual shift records with pre-aggregated user names
 * 
 * Body:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - locationId: ObjectId (optional) - filter by location
 * 
 * Returns: { success: boolean, recordsAggregated: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { ProcessedHoursAggregated } from '@/lib/mongodb/v2-schema';
import { getWorkingDay } from '@/lib/utils/working-day';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

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
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Build query
    const query: any = {
      endpoint: 'time_registration_shifts',
      date: {
        $gte: start,
        $lte: end,
      },
    };

    if (locationId) {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid locationId format' },
          { status: 400 }
        );
      }
    }

    // Fetch raw data
    const rawData = await db.collection('eitje_raw_data')
      .find(query)
      .toArray();

    if (rawData.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No raw data found to aggregate',
      });
    }

    // Get location names
    const locationIds = new Set<string>();
    rawData.forEach((record) => {
      if (record.locationId) {
        locationIds.add(record.locationId.toString());
      }
    });

    const locationMap = new Map<string, { name: string }>();
    if (locationIds.size > 0) {
      const locationObjectIds = Array.from(locationIds)
        .map(id => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      if (locationObjectIds.length > 0) {
        const locations = await db.collection('locations')
          .find({ _id: { $in: locationObjectIds } })
          .toArray() as Array<{ _id?: ObjectId; name?: string }>;

        locations.forEach((loc) => {
          if (loc._id) {
            locationMap.set(loc._id.toString(), {
              name: loc.name || 'Unknown',
            });
          }
        });
      }
    }

    // Get unique user IDs and fetch user names (batch query, not N+1)
    const userIds = new Set<number>();
    rawData.forEach((record) => {
      const extracted = record.extracted || {};
      const raw = record.rawApiResponse || {};
      const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
      if (userId) {
        userIds.add(parseInt(String(userId)));
      }
    });

    const userMap = new Map<number, string>();
    if (userIds.size > 0) {
      const users = await db.collection('eitje_raw_data')
        .find({
          endpoint: 'users',
          'extracted.id': { $in: Array.from(userIds) }
        })
        .toArray();

      users.forEach((user) => {
        const userId = user.extracted?.id;
        const firstName = user.extracted?.first_name || user.rawApiResponse?.first_name || '';
        const lastName = user.extracted?.last_name || user.rawApiResponse?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (userId && fullName) {
          userMap.set(userId, fullName);
        }
      });
    }

    // Get hourly wages from worker_profiles (batch query, not N+1)
    const hourlyWageMap = new Map<number, number>();
    if (userIds.size > 0) {
      try {
        const profiles = await db.collection('worker_profiles')
          .find({
            eitje_user_id: { $in: Array.from(userIds) },
            $or: [
              { effective_to: null },
              { effective_to: { $gte: new Date() } }
            ]
          })
          .sort({ eitje_user_id: 1, effective_from: -1 })
          .toArray();

        // Group by user_id and take the most recent profile
        const profileMap = new Map<number, any>();
        profiles.forEach((profile: any) => {
          const userId = profile.eitje_user_id;
          if (userId && !profileMap.has(userId)) {
            profileMap.set(userId, profile);
          }
        });

        profileMap.forEach((profile, userId) => {
          if (profile.hourly_wage !== null && profile.hourly_wage !== undefined) {
            hourlyWageMap.set(userId, Number(profile.hourly_wage));
          }
        });
      } catch (e) {
        console.warn('[Aggregate Processed Hours] Error fetching hourly wages:', e);
      }
    }

    // Extract processed hours records
    const processedHours: ProcessedHoursAggregated[] = [];

    for (const record of rawData) {
      const extracted = record.extracted || {};
      const raw = record.rawApiResponse || {};
      
      const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
      const userName = userMap.get(parseInt(String(userId))) || extracted.userName || extracted.user_name || raw.user_name || raw.userName || 'Unknown';
      
      const locationIdStr = record.locationId?.toString() || '';
      const locationInfo = locationMap.get(locationIdStr);

      // Calculate worked hours
      const startTime = extracted.start || extracted.start_time || raw.start || raw.start_time;
      const endTime = extracted.end || extracted.end_time || raw.end || raw.end_time;
      const breakMinutes = extracted.breakMinutes || extracted.break_minutes || raw.break_minutes || raw.breakMinutes || 0;
      
      let workedHours = 0;
      if (startTime && endTime) {
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          workedHours = Math.max(0, diffHours - (breakMinutes / 60));
        } catch (e) {
          workedHours = extracted.workedHours || extracted.worked_hours || extracted.hours_worked || raw.hours_worked || raw.worked_hours || 0;
        }
      } else {
        workedHours = extracted.workedHours || extracted.worked_hours || extracted.hours_worked || raw.hours_worked || raw.worked_hours || 0;
      }

      // Get hourly wage from pre-fetched map
      const hourlyWage = userId ? (hourlyWageMap.get(parseInt(String(userId))) || 0) : 0;
      const wageCost = hourlyWage * workedHours;

      // Format time strings
      const startStr = startTime ? (typeof startTime === 'string' ? startTime.split('T')[1]?.split('.')[0]?.substring(0, 5) : new Date(startTime).toTimeString().substring(0, 5)) : undefined;
      const endStr = endTime ? (typeof endTime === 'string' ? endTime.split('T')[1]?.split('.')[0]?.substring(0, 5) : new Date(endTime).toTimeString().substring(0, 5)) : undefined;

      const recordDate = record.date instanceof Date 
        ? record.date 
        : typeof record.date === 'string' 
          ? new Date(record.date) 
          : new Date();
      // Apply working day logic: convert calendar date to working day date
      // This ensures hours are attributed to the correct working day (06:00-05:59:59)
      const dateStr = await getWorkingDay(recordDate);

      const processedHour: ProcessedHoursAggregated = {
        date: dateStr,
        locationId: record.locationId instanceof ObjectId ? record.locationId : new ObjectId(locationIdStr),
        locationName: locationInfo?.name || 'Unknown',
        userId: userId ? parseInt(String(userId)) : 0,
        userName: userName, // ✅ Pre-aggregated (no N+1 queries!)
        environmentId: extracted.environmentId || extracted.environment_id || raw.environment_id || raw.environmentId || undefined,
        environmentName: extracted.environmentName || extracted.environment_name || raw.environment_name || raw.environmentName || undefined,
        teamId: extracted.teamId || extracted.team_id || raw.team_id || raw.teamId || undefined,
        teamName: extracted.teamName || extracted.team_name || raw.team_name || raw.teamName || undefined,
        start: startStr,
        end: endStr,
        breakMinutes: breakMinutes || 0,
        workedHours: Math.round(workedHours * 100) / 100,
        hourlyWage: Math.round(hourlyWage * 100) / 100,
        wageCost: Math.round(wageCost * 100) / 100,
        typeName: extracted.type_name || extracted.typeName || raw.type_name || raw.typeName || undefined,
        shiftType: extracted.shift_type || extracted.shiftType || raw.shift_type || raw.shiftType || undefined,
        remarks: extracted.remarks || raw.remarks || undefined,
        approved: extracted.approved || raw.approved || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      processedHours.push(processedHour);
    }

    if (processedHours.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No processed hours found to aggregate',
      });
    }

    // Group shifts by date/userId/locationId to calculate team hours breakdown
    const groupedByWorkerDay = new Map<string, ProcessedHoursAggregated[]>();
    
    for (const hour of processedHours) {
      const key = `${hour.date}_${hour.userId}_${hour.locationId.toString()}`;
      if (!groupedByWorkerDay.has(key)) {
        groupedByWorkerDay.set(key, []);
      }
      groupedByWorkerDay.get(key)!.push(hour);
    }
    
    // Calculate team hours breakdown for each group
    for (const [key, hours] of groupedByWorkerDay.entries()) {
      const teamBreakdownMap = new Map<string, { teamId?: number; teamName: string; hours: number; wageCost: number }>();
      
      for (const hour of hours) {
        const teamKey = hour.teamName || 'Unknown';
        if (!teamBreakdownMap.has(teamKey)) {
          teamBreakdownMap.set(teamKey, {
            teamId: hour.teamId,
            teamName: hour.teamName || 'Unknown',
            hours: 0,
            wageCost: 0,
          });
        }
        
        const breakdown = teamBreakdownMap.get(teamKey)!;
        breakdown.hours += hour.workedHours;
        breakdown.wageCost += hour.wageCost;
      }
      
      // Add teamHoursBreakdown to all records in this group
      const teamHoursBreakdown = Array.from(teamBreakdownMap.values());
      for (const hour of hours) {
        hour.teamHoursBreakdown = teamHoursBreakdown;
      }
    }

    // Delete existing records for this date range and location
    const deleteQuery: any = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };
    if (locationId) {
      deleteQuery.locationId = new ObjectId(locationId);
    }
    await db.collection('processed_hours_aggregated').deleteMany(deleteQuery);

    // Insert aggregated processed hours with team breakdown
    const result = await db.collection('processed_hours_aggregated').insertMany(processedHours);

    return NextResponse.json({
      success: true,
      recordsAggregated: result.insertedCount,
      message: `Aggregated ${result.insertedCount} processed hours with team breakdown`,
    });
  } catch (error: any) {
    console.error('[Aggregate Processed Hours] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to aggregate processed hours' },
      { status: 500 }
    );
  }
}

