/**
 * POST /api/eitje/v2/aggregate
 * Aggregate raw Eitje data into aggregated collection
 * 
 * Body:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * 
 * Returns: { success: boolean, recordsAggregated: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day

    // Fetch raw data for time_registration_shifts
    const rawData = await db.collection('eitje_raw_data')
      .find({
        endpoint: 'time_registration_shifts',
        date: {
          $gte: start,
          $lte: end,
        },
      })
      .toArray();

    // Fetch raw data for revenue_days
    const revenueData = await db.collection('eitje_raw_data')
      .find({
        endpoint: 'revenue_days',
        date: {
          $gte: start,
          $lte: end,
        },
      })
      .toArray();

    if (rawData.length === 0 && revenueData.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No raw data found to aggregate',
      });
    }

    // Aggregate revenue_days by locationId and date
    const revenueByLocationAndDate = new Map<string, number>();
    for (const record of revenueData) {
      if (!record.locationId) continue;
      
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      const key = `${record.locationId.toString()}_${dateKey}`;
      
      // Extract revenue amount (amt_in_cents converted to euros)
      const amtInCents = record.extracted?.amtInCents || 
                        record.extracted?.amt_in_cents ||
                        record.rawApiResponse?.amt_in_cents || 
                        0;
      const revenue = Number(amtInCents) / 100; // Convert cents to euros
      
      revenueByLocationAndDate.set(key, (revenueByLocationAndDate.get(key) || 0) + revenue);
    }

    // Group by locationId and date
    const grouped = new Map<string, {
      locationId: ObjectId;
      date: Date;
      records: any[];
    }>();

    for (const record of rawData) {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      const key = `${record.locationId.toString()}_${dateKey}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          locationId: record.locationId,
          date: new Date(dateKey),
          records: [],
        });
      }

      grouped.get(key)!.records.push(record);
    }

    // Aggregate each group
    const aggregatedRecords = Array.from(grouped.values()).map((group) => {
      let totalHoursWorked = 0;
      let totalWageCost = 0;
      let totalRevenue = 0;
      const teamStatsMap = new Map<string, { hours: number; cost: number }>();

      for (const record of group.records) {
        // Calculate hours from start/end timestamps
        let hours = 0;
        const startTime = record.extracted?.start || record.extracted?.startTime || record.rawApiResponse?.start;
        const endTime = record.extracted?.end || record.extracted?.endTime || record.rawApiResponse?.end;
        const breakMinutes = record.extracted?.breakMinutes || record.rawApiResponse?.break_minutes || 0;

        if (startTime && endTime) {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60); // Convert to hours
          hours = diffHours - (breakMinutes / 60); // Subtract break time
        } else {
          // Fallback to extracted hours if available
          hours = record.extracted?.hoursWorked || 
                  record.extracted?.hours || 
                  record.rawApiResponse?.hours_worked || 
                  record.rawApiResponse?.hours || 
                  0;
        }
        
        // Wage cost and revenue are not in time_registration_shifts endpoint
        // They come from revenue_days endpoint or need to be calculated separately
        const wageCost = record.extracted?.wageCost || 
                        record.extracted?.wage_cost || 
                        record.rawApiResponse?.wage_cost || 
                        record.rawApiResponse?.wageCost || 
                        0;
        
        const revenue = record.extracted?.revenue || 
                       record.rawApiResponse?.revenue || 
                       0;

        totalHoursWorked += Math.max(0, Number(hours) || 0); // Ensure non-negative
        totalWageCost += Number(wageCost) || 0;
        totalRevenue += Number(revenue) || 0;

        // Track team stats
        const teamId = record.extracted?.teamId || record.rawApiResponse?.team_id;
        if (teamId) {
          const teamKey = teamId.toString();
          if (!teamStatsMap.has(teamKey)) {
            teamStatsMap.set(teamKey, { hours: 0, cost: 0 });
          }
          const teamStat = teamStatsMap.get(teamKey)!;
          teamStat.hours += Number(hours) || 0;
          teamStat.cost += Number(wageCost) || 0;
        }
      }

      // Get revenue from revenue_days data
      const dateKey = new Date(group.date).toISOString().split('T')[0];
      const revenueKey = `${group.locationId.toString()}_${dateKey}`;
      const revenueFromDays = revenueByLocationAndDate.get(revenueKey) || 0;
      
      // Use revenue from revenue_days if available, otherwise use calculated revenue
      const finalRevenue = revenueFromDays > 0 ? revenueFromDays : totalRevenue;

      // Calculate derived metrics
      const laborCostPercentage = finalRevenue > 0 
        ? (totalWageCost / finalRevenue) * 100 
        : 0;
      
      const revenuePerHour = totalHoursWorked > 0 
        ? finalRevenue / totalHoursWorked 
        : 0;

      // Convert team stats to array
      // Note: teamId from Eitje is a number, not MongoDB ObjectId
      // We'll store it as-is and map to unified_teams later if needed
      const teamStats = Array.from(teamStatsMap.entries()).map(([teamIdStr, stats]) => ({
        teamId: teamIdStr, // Store as string/number from Eitje API
        hours: stats.hours,
        cost: stats.cost,
      }));

      return {
        locationId: group.locationId,
        date: group.date,
        totalHoursWorked,
        totalWageCost,
        totalRevenue: finalRevenue,
        laborCostPercentage,
        revenuePerHour,
        teamStats,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Also create aggregated records for revenue_days that don't have time_registration_shifts
    for (const [key, revenue] of revenueByLocationAndDate.entries()) {
      const [locationIdStr, dateStr] = key.split('_');
      const locationId = new ObjectId(locationIdStr);
      const date = new Date(dateStr);
      
      // Check if we already have an aggregated record for this location/date
      const existingKey = `${locationId.toString()}_${dateStr}`;
      const hasExisting = Array.from(grouped.keys()).some(k => k === existingKey);
      
      if (!hasExisting) {
        // Create aggregated record with only revenue data
        aggregatedRecords.push({
          locationId,
          date,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: revenue,
          laborCostPercentage: 0,
          revenuePerHour: 0,
          teamStats: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Upsert aggregated records
    let recordsAggregated = 0;
    if (aggregatedRecords.length > 0) {
      const operations = aggregatedRecords.map((record) => ({
        updateOne: {
          filter: {
            locationId: record.locationId,
            date: record.date,
          },
          update: { $set: record },
          upsert: true,
        },
      }));

      const result = await db.collection('eitje_aggregated').bulkWrite(operations);
      recordsAggregated = result.upsertedCount + result.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      recordsAggregated,
      message: `Successfully aggregated ${recordsAggregated} records`,
    });

  } catch (error: any) {
    console.error('[API /eitje/v2/aggregate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate data',
        recordsAggregated: 0,
      },
      { status: 500 }
    );
  }
}

