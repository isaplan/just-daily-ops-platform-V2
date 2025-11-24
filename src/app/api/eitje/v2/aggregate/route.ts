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
import { getYearKey, getMonthKey, getWeekKey, getISOWeek, isOlderThanOneMonth, isOlderThanOneWeek, isCurrentWeek, isToday } from '@/lib/utils/time-helpers';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

/**
 * Build hierarchical time-series labor data from daily records
 */
function buildHierarchicalLaborData(
  dailyRecords: Array<{
    date: Date;
    locationId: ObjectId;
    teamId: string;
    teamName: string;
    unifiedUserId: ObjectId | null;
    workerName: string;
    hours: number;
    cost: number;
    revenue: number;
  }>,
  locationMap: Map<string, { id: ObjectId; name: string }>,
  teamMap: Map<string, { id: string; name: string }>
): {
  hoursByYear: Array<{
    year: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
  hoursByMonth: Array<{
    year: string;
    month: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
  hoursByWeek: Array<{
    year: string;
    week: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
  hoursByDay: Array<{
    year: string;
    week: string;
    date: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
} {
  console.log(`[Eitje Aggregation] Building hierarchical labor data from ${dailyRecords.length} daily records...`);
  
  // Build hierarchical structure: year -> month -> week -> day -> location -> team -> worker
  const yearMap = new Map<string, Map<string, Map<string, Map<string, Map<string, Map<string, Map<string, {
    hours: number;
    cost: number;
    revenue: number;
  }>>>>>>>>();

  // Process each daily record
  for (const record of dailyRecords) {
    if (!record.unifiedUserId) continue;

    const date = record.date;
    const year = getYearKey(date);
    const month = getMonthKey(date);
    const week = getWeekKey(date);
    const isoWeek = getISOWeek(date);
    const dateStr = date.toISOString().split('T')[0];
    const locIdStr = record.locationId.toString();

    // Initialize year
    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }
    const monthMap = yearMap.get(year)!;

    // Initialize month
    if (!monthMap.has(month)) {
      monthMap.set(month, new Map());
    }
    const weekMap = monthMap.get(month)!;

    // Initialize week
    if (!weekMap.has(isoWeek)) {
      weekMap.set(isoWeek, new Map());
    }
    const dayMap = weekMap.get(isoWeek)!;

    // Initialize day
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, new Map());
    }
    const locationMap = dayMap.get(dateStr)!;

    // Initialize location
    if (!locationMap.has(locIdStr)) {
      locationMap.set(locIdStr, new Map());
    }
    const teamMap = locationMap.get(locIdStr)!;

    // Initialize team
    if (!teamMap.has(record.teamId)) {
      teamMap.set(record.teamId, new Map());
    }
    const workerMap = teamMap.get(record.teamId)!;

    // Initialize worker
    const workerIdStr = record.unifiedUserId.toString();
    if (!workerMap.has(workerIdStr)) {
      workerMap.set(workerIdStr, {
        hours: 0,
        cost: 0,
        revenue: 0,
      });
    }
    const workerData = workerMap.get(workerIdStr)!;
    workerData.hours += record.hours;
    workerData.cost += record.cost;
    workerData.revenue += record.revenue;
  }

  // Build hoursByYear array
  const hoursByYear: Array<{
    year: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    const yearTotals = {
      totalHoursWorked: 0,
      totalWageCost: 0,
      totalRevenue: 0,
    };
    const yearLocationMap = new Map<string, {
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      byTeam: Map<string, {
        teamId: string;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Map<string, {
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>();

    // Aggregate across all months/weeks/days
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [week, dayMap] of weekMap.entries()) {
        for (const [dateStr, locMap] of dayMap.entries()) {
          for (const [locIdStr, teamMap] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!yearLocationMap.has(locIdStr)) {
              yearLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                totalHoursWorked: 0,
                totalWageCost: 0,
                totalRevenue: 0,
                byTeam: new Map(),
              });
            }
            const yearLoc = yearLocationMap.get(locIdStr)!;

            for (const [teamId, workerMap] of teamMap.entries()) {
              // Find team name from daily records
              const teamRecord = dailyRecords.find(r => 
                r.teamId === teamId && 
                r.locationId.toString() === locIdStr &&
                r.date.toISOString().split('T')[0] === dateStr
              );
              const teamName = teamRecord?.teamName || 'Unknown Team';

              if (!yearLoc.byTeam.has(teamId)) {
                yearLoc.byTeam.set(teamId, {
                  teamId: teamId,
                  teamName: teamName,
                  totalHoursWorked: 0,
                  totalWageCost: 0,
                  byWorker: new Map(),
                });
              }
              const yearTeam = yearLoc.byTeam.get(teamId)!;

              for (const [workerIdStr, workerData] of workerMap.entries()) {
                // Find worker name from daily records
                const workerRecord = dailyRecords.find(r => 
                  r.unifiedUserId?.toString() === workerIdStr &&
                  r.teamId === teamId &&
                  r.locationId.toString() === locIdStr &&
                  r.date.toISOString().split('T')[0] === dateStr
                );
                const workerName = workerRecord?.workerName || 'Unknown Worker';

                if (!yearTeam.byWorker.has(workerIdStr)) {
                  yearTeam.byWorker.set(workerIdStr, {
                    unifiedUserId: new ObjectId(workerIdStr),
                    workerName: workerName,
                    totalHoursWorked: 0,
                    totalWageCost: 0,
                  });
                }
                const yearWorker = yearTeam.byWorker.get(workerIdStr)!;
                yearWorker.totalHoursWorked += workerData.hours;
                yearWorker.totalWageCost += workerData.cost;

                yearTeam.totalHoursWorked += workerData.hours;
                yearTeam.totalWageCost += workerData.cost;

                yearLoc.totalHoursWorked += workerData.hours;
                yearLoc.totalWageCost += workerData.cost;
                yearLoc.totalRevenue += workerData.revenue;

                yearTotals.totalHoursWorked += workerData.hours;
                yearTotals.totalWageCost += workerData.cost;
                yearTotals.totalRevenue += workerData.revenue;
              }
            }
          }
        }
      }
    }

    const laborCostPercentage = yearTotals.totalRevenue > 0 
      ? (yearTotals.totalWageCost / yearTotals.totalRevenue) * 100 
      : 0;
    const revenuePerHour = yearTotals.totalHoursWorked > 0 
      ? yearTotals.totalRevenue / yearTotals.totalHoursWorked 
      : 0;

    hoursByYear.push({
      year,
      ...yearTotals,
      laborCostPercentage,
      revenuePerHour,
      byLocation: Array.from(yearLocationMap.values()).map(loc => ({
        locationId: loc.locationId,
        locationName: loc.locationName,
        totalHoursWorked: loc.totalHoursWorked,
        totalWageCost: loc.totalWageCost,
        totalRevenue: loc.totalRevenue,
        byTeam: Array.from(loc.byTeam.values()).map(team => ({
          teamId: team.teamId,
          teamName: team.teamName,
          totalHoursWorked: team.totalHoursWorked,
          totalWageCost: team.totalWageCost,
          byWorker: Array.from(team.byWorker.values()),
        })),
      })),
    });
  }

  // Build hoursByMonth array (only for months older than 1 month)
  const hoursByMonth: Array<{
    year: string;
    month: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    for (const [month, weekMap] of monthMap.entries()) {
      const [monthYear, monthNum] = month.split('-');
      const monthDate = new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);

      // Only include months older than 1 month
      if (!isOlderThanOneMonth(monthDate)) continue;

      const monthTotals = {
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
      };
      const monthLocationMap = new Map<string, {
        locationId: ObjectId;
        locationName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        totalRevenue: number;
        byTeam: Map<string, {
          teamId: string;
          teamName: string;
          totalHoursWorked: number;
          totalWageCost: number;
          byWorker: Map<string, {
            unifiedUserId: ObjectId;
            workerName: string;
            totalHoursWorked: number;
            totalWageCost: number;
          }>;
        }>;
      }>();

      // Aggregate across weeks/days in this month
      for (const [week, dayMap] of weekMap.entries()) {
        for (const [dateStr, locMap] of dayMap.entries()) {
          for (const [locIdStr, teamMap] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!monthLocationMap.has(locIdStr)) {
              monthLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                totalHoursWorked: 0,
                totalWageCost: 0,
                totalRevenue: 0,
                byTeam: new Map(),
              });
            }
            const monthLoc = monthLocationMap.get(locIdStr)!;

            for (const [teamId, workerMap] of teamMap.entries()) {
              // Find team name from daily records
              const teamRecord = dailyRecords.find(r => 
                r.teamId === teamId && 
                r.locationId.toString() === locIdStr &&
                r.date.toISOString().split('T')[0] === dateStr
              );
              const teamName = teamRecord?.teamName || 'Unknown Team';

              if (!monthLoc.byTeam.has(teamId)) {
                monthLoc.byTeam.set(teamId, {
                  teamId: teamId,
                  teamName: teamName,
                  totalHoursWorked: 0,
                  totalWageCost: 0,
                  byWorker: new Map(),
                });
              }
              const monthTeam = monthLoc.byTeam.get(teamId)!;

              for (const [workerIdStr, workerData] of workerMap.entries()) {
                // Find worker name from daily records
                const workerRecord = dailyRecords.find(r => 
                  r.unifiedUserId?.toString() === workerIdStr &&
                  r.teamId === teamId &&
                  r.locationId.toString() === locIdStr &&
                  r.date.toISOString().split('T')[0] === dateStr
                );
                const workerName = workerRecord?.workerName || 'Unknown Worker';

                if (!monthTeam.byWorker.has(workerIdStr)) {
                  monthTeam.byWorker.set(workerIdStr, {
                    unifiedUserId: new ObjectId(workerIdStr),
                    workerName: workerName,
                    totalHoursWorked: 0,
                    totalWageCost: 0,
                  });
                }
                const monthWorker = monthTeam.byWorker.get(workerIdStr)!;
                monthWorker.totalHoursWorked += workerData.hours;
                monthWorker.totalWageCost += workerData.cost;

                monthTeam.totalHoursWorked += workerData.hours;
                monthTeam.totalWageCost += workerData.cost;

                monthLoc.totalHoursWorked += workerData.hours;
                monthLoc.totalWageCost += workerData.cost;
                monthLoc.totalRevenue += workerData.revenue;

                monthTotals.totalHoursWorked += workerData.hours;
                monthTotals.totalWageCost += workerData.cost;
                monthTotals.totalRevenue += workerData.revenue;
              }
            }
          }
        }
      }

      const laborCostPercentage = monthTotals.totalRevenue > 0 
        ? (monthTotals.totalWageCost / monthTotals.totalRevenue) * 100 
        : 0;
      const revenuePerHour = monthTotals.totalHoursWorked > 0 
        ? monthTotals.totalRevenue / monthTotals.totalHoursWorked 
        : 0;

      hoursByMonth.push({
        year: monthYear,
        month: monthNum,
        ...monthTotals,
        laborCostPercentage,
        revenuePerHour,
        byLocation: Array.from(monthLocationMap.values()).map(loc => ({
          locationId: loc.locationId,
          locationName: loc.locationName,
          totalHoursWorked: loc.totalHoursWorked,
          totalWageCost: loc.totalWageCost,
          byTeam: Array.from(loc.byTeam.values()).map(team => ({
            teamId: team.teamId,
            teamName: team.teamName,
            totalHoursWorked: team.totalHoursWorked,
            totalWageCost: team.totalWageCost,
            byWorker: Array.from(team.byWorker.values()),
          })),
        })),
      });
    }
  }

  // Build hoursByWeek array (only for weeks older than 1 week)
  const hoursByWeek: Array<{
    year: string;
    week: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [week, dayMap] of weekMap.entries()) {
        // Get week start date to check if older than 1 week
        const weekStartDate = new Date();
        // Find first day in this week
        const firstDayStr = Array.from(dayMap.keys())[0];
        if (firstDayStr) {
          const [yearNum, monthNum, dayNum] = firstDayStr.split('-').map(Number);
          const weekStart = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
          
          // Only include weeks older than 1 week
          if (!isOlderThanOneWeek(weekStart)) continue;

          const weekTotals = {
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
          };
          const weekLocationMap = new Map<string, {
            locationId: ObjectId;
            locationName: string;
            totalHoursWorked: number;
            totalWageCost: number;
            totalRevenue: number;
            byTeam: Map<string, {
              teamId: string;
              teamName: string;
              totalHoursWorked: number;
              totalWageCost: number;
              byWorker: Map<string, {
                unifiedUserId: ObjectId;
                workerName: string;
                totalHoursWorked: number;
                totalWageCost: number;
              }>;
            }>;
          }>();

          // Aggregate across days in this week
          for (const [dateStr, locMap] of dayMap.entries()) {
            for (const [locIdStr, teamMap] of locMap.entries()) {
              const loc = locationMap.get(locIdStr);
              if (!loc) continue;

              if (!weekLocationMap.has(locIdStr)) {
                weekLocationMap.set(locIdStr, {
                  locationId: loc.id,
                  locationName: loc.name,
                  totalHoursWorked: 0,
                  totalWageCost: 0,
                  totalRevenue: 0,
                  byTeam: new Map(),
                });
              }
              const weekLoc = weekLocationMap.get(locIdStr)!;

              for (const [teamId, workerMap] of teamMap.entries()) {
                // Find team name from daily records
                const teamRecord = dailyRecords.find(r => 
                  r.teamId === teamId && 
                  r.locationId.toString() === locIdStr &&
                  r.date.toISOString().split('T')[0] === dateStr
                );
                const teamName = teamRecord?.teamName || 'Unknown Team';

                if (!weekLoc.byTeam.has(teamId)) {
                  weekLoc.byTeam.set(teamId, {
                    teamId: teamId,
                    teamName: teamName,
                    totalHoursWorked: 0,
                    totalWageCost: 0,
                    byWorker: new Map(),
                  });
                }
                const weekTeam = weekLoc.byTeam.get(teamId)!;

                for (const [workerIdStr, workerData] of workerMap.entries()) {
                  // Find worker name from daily records
                  const workerRecord = dailyRecords.find(r => 
                    r.unifiedUserId?.toString() === workerIdStr &&
                    r.teamId === teamId &&
                    r.locationId.toString() === locIdStr &&
                    r.date.toISOString().split('T')[0] === dateStr
                  );
                  const workerName = workerRecord?.workerName || 'Unknown Worker';

                  if (!weekTeam.byWorker.has(workerIdStr)) {
                    weekTeam.byWorker.set(workerIdStr, {
                      unifiedUserId: new ObjectId(workerIdStr),
                      workerName: workerName,
                      totalHoursWorked: 0,
                      totalWageCost: 0,
                    });
                  }
                  const weekWorker = weekTeam.byWorker.get(workerIdStr)!;
                  weekWorker.totalHoursWorked += workerData.hours;
                  weekWorker.totalWageCost += workerData.cost;

                  weekTeam.totalHoursWorked += workerData.hours;
                  weekTeam.totalWageCost += workerData.cost;

                  weekLoc.totalHoursWorked += workerData.hours;
                  weekLoc.totalWageCost += workerData.cost;
                  weekLoc.totalRevenue += workerData.revenue;

                  weekTotals.totalHoursWorked += workerData.hours;
                  weekTotals.totalWageCost += workerData.cost;
                  weekTotals.totalRevenue += workerData.revenue;
                }
              }
            }
          }

          const laborCostPercentage = weekTotals.totalRevenue > 0 
            ? (weekTotals.totalWageCost / weekTotals.totalRevenue) * 100 
            : 0;
          const revenuePerHour = weekTotals.totalHoursWorked > 0 
            ? weekTotals.totalRevenue / weekTotals.totalHoursWorked 
            : 0;

          hoursByWeek.push({
            year,
            week,
            ...weekTotals,
            laborCostPercentage,
            revenuePerHour,
            byLocation: Array.from(weekLocationMap.values()).map(loc => ({
              locationId: loc.locationId,
              locationName: loc.locationName,
              totalHoursWorked: loc.totalHoursWorked,
              totalWageCost: loc.totalWageCost,
              byTeam: Array.from(loc.byTeam.values()).map(team => ({
                teamId: team.teamId,
                teamName: team.teamName,
                totalHoursWorked: team.totalHoursWorked,
                totalWageCost: team.totalWageCost,
                byWorker: Array.from(team.byWorker.values()),
              })),
            })),
          });
        }
      }
    }
  }

  // Build hoursByDay array (only for current week, excluding today)
  const hoursByDay: Array<{
    year: string;
    week: string;
    date: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }> = [];

  const now = new Date();
  const currentYear = getYearKey(now);
  const currentWeek = getWeekKey(now);

  // Build hoursByDay array (only for current week, excluding today)
  for (const [year, monthMap] of yearMap.entries()) {
    if (year !== currentYear) continue;
    
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [week, dayMap] of weekMap.entries()) {
        if (week !== currentWeek) continue;

        // Only process current week
        for (const [dateStr, locMap] of dayMap.entries()) {
          // Exclude today
          const [yearNum, monthNum, dayNum] = dateStr.split('-').map(Number);
          const recordDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
          if (isToday(recordDate)) continue;

          const dayTotals = {
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
          };
          const dayLocationMap = new Map<string, {
            locationId: ObjectId;
            locationName: string;
            totalHoursWorked: number;
            totalWageCost: number;
            totalRevenue: number;
            byTeam: Map<string, {
              teamId: string;
              teamName: string;
              totalHoursWorked: number;
              totalWageCost: number;
              byWorker: Map<string, {
                unifiedUserId: ObjectId;
                workerName: string;
                totalHoursWorked: number;
                totalWageCost: number;
              }>;
            }>;
          }>();

          // Aggregate for this day
          for (const [locIdStr, teamMap] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!dayLocationMap.has(locIdStr)) {
              dayLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                totalHoursWorked: 0,
                totalWageCost: 0,
                totalRevenue: 0,
                byTeam: new Map(),
              });
            }
            const dayLoc = dayLocationMap.get(locIdStr)!;

            for (const [teamId, workerMap] of teamMap.entries()) {
              // Find team name from daily records
              const teamRecord = dailyRecords.find(r => 
                r.teamId === teamId && 
                r.locationId.toString() === locIdStr &&
                r.date.toISOString().split('T')[0] === dateStr
              );
              const teamName = teamRecord?.teamName || 'Unknown Team';

              if (!dayLoc.byTeam.has(teamId)) {
                dayLoc.byTeam.set(teamId, {
                  teamId: teamId,
                  teamName: teamName,
                  totalHoursWorked: 0,
                  totalWageCost: 0,
                  byWorker: new Map(),
                });
              }
              const dayTeam = dayLoc.byTeam.get(teamId)!;

              for (const [workerIdStr, workerData] of workerMap.entries()) {
                // Find worker name from daily records
                const workerRecord = dailyRecords.find(r => 
                  r.unifiedUserId?.toString() === workerIdStr &&
                  r.teamId === teamId &&
                  r.locationId.toString() === locIdStr &&
                  r.date.toISOString().split('T')[0] === dateStr
                );
                const workerName = workerRecord?.workerName || 'Unknown Worker';

                if (!dayTeam.byWorker.has(workerIdStr)) {
                  dayTeam.byWorker.set(workerIdStr, {
                    unifiedUserId: new ObjectId(workerIdStr),
                    workerName: workerName,
                    totalHoursWorked: 0,
                    totalWageCost: 0,
                  });
                }
                const dayWorker = dayTeam.byWorker.get(workerIdStr)!;
                dayWorker.totalHoursWorked += workerData.hours;
                dayWorker.totalWageCost += workerData.cost;

                dayTeam.totalHoursWorked += workerData.hours;
                dayTeam.totalWageCost += workerData.cost;

                dayLoc.totalHoursWorked += workerData.hours;
                dayLoc.totalWageCost += workerData.cost;
                dayLoc.totalRevenue += workerData.revenue;

                dayTotals.totalHoursWorked += workerData.hours;
                dayTotals.totalWageCost += workerData.cost;
                dayTotals.totalRevenue += workerData.revenue;
              }
            }
          }

          const laborCostPercentage = dayTotals.totalRevenue > 0 
            ? (dayTotals.totalWageCost / dayTotals.totalRevenue) * 100 
            : 0;
          const revenuePerHour = dayTotals.totalHoursWorked > 0 
            ? dayTotals.totalRevenue / dayTotals.totalHoursWorked 
            : 0;

          hoursByDay.push({
            year,
            week,
            date: dateStr,
            ...dayTotals,
            laborCostPercentage,
            revenuePerHour,
            byLocation: Array.from(dayLocationMap.values()).map(loc => ({
              locationId: loc.locationId,
              locationName: loc.locationName,
              totalHoursWorked: loc.totalHoursWorked,
              totalWageCost: loc.totalWageCost,
              byTeam: Array.from(loc.byTeam.values()).map(team => ({
                teamId: team.teamId,
                teamName: team.teamName,
                totalHoursWorked: team.totalHoursWorked,
                totalWageCost: team.totalWageCost,
                byWorker: Array.from(team.byWorker.values()),
              })),
            })),
          });
        }
      }
    }
  }

  // Sort arrays
  hoursByYear.sort((a, b) => b.year.localeCompare(a.year));
  hoursByMonth.sort((a, b) => {
    const aKey = `${a.year}-${a.month}`;
    const bKey = `${b.year}-${b.month}`;
    return bKey.localeCompare(aKey);
  });
  hoursByWeek.sort((a, b) => {
    const aKey = `${a.year}-W${a.week}`;
    const bKey = `${b.year}-W${b.week}`;
    return bKey.localeCompare(aKey);
  });
  hoursByDay.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`[Eitje Aggregation] Hierarchical data built: ${hoursByYear.length} years, ${hoursByMonth.length} months, ${hoursByWeek.length} weeks, ${hoursByDay.length} days`);

  return {
    hoursByYear,
    hoursByMonth,
    hoursByWeek,
    hoursByDay,
  };
}

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

    // Load unified users for worker mapping
    const unifiedUsers = await db.collection('unified_users')
      .find({ isActive: true })
      .toArray();
    
    // Build mapping: Eitje userId -> unified user
    const eitjeToUnifiedMap = new Map<number, any>();
    unifiedUsers.forEach((user: any) => {
      if (user.systemMappings && Array.isArray(user.systemMappings)) {
        user.systemMappings.forEach((mapping: any) => {
          if (mapping.system === 'eitje' && mapping.externalId) {
            const eitjeUserId = parseInt(mapping.externalId);
            if (!isNaN(eitjeUserId)) {
              eitjeToUnifiedMap.set(eitjeUserId, user);
            }
          }
        });
      }
    });

    // Load locations for name mapping
    const locations = await db.collection('locations').find({ isActive: true }).toArray();
    const locationMap = new Map<string, { id: ObjectId; name: string }>();
    locations.forEach((loc: any) => {
      locationMap.set(loc._id.toString(), { id: loc._id, name: loc.name });
    });

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

    // Store daily records for hierarchical building
    const dailyRecords: Array<{
      date: Date;
      locationId: ObjectId;
      teamId: string;
      teamName: string;
      unifiedUserId: ObjectId | null;
      workerName: string;
      hours: number;
      cost: number;
      revenue: number;
    }> = [];

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
        const teamName = record.extracted?.teamName || record.extracted?.team_name || record.rawApiResponse?.team_name || 'Unknown Team';
        if (teamId) {
          const teamKey = teamId.toString();
          if (!teamStatsMap.has(teamKey)) {
            teamStatsMap.set(teamKey, { hours: 0, cost: 0 });
          }
          const teamStat = teamStatsMap.get(teamKey)!;
          teamStat.hours += Number(hours) || 0;
          teamStat.cost += Number(wageCost) || 0;
        }

        // Track worker-level data for hierarchical structure
        const eitjeUserId = record.extracted?.userId || record.rawApiResponse?.user_id;
        const workerName = record.extracted?.userName || record.extracted?.user_name || record.rawApiResponse?.user_name || 'Unknown Worker';
        const unifiedUser = eitjeUserId ? eitjeToUnifiedMap.get(Number(eitjeUserId)) : null;
        
        if (eitjeUserId && unifiedUser) {
          dailyRecords.push({
            date: group.date,
            locationId: group.locationId,
            teamId: teamId ? teamId.toString() : 'unknown',
            teamName: teamName,
            unifiedUserId: unifiedUser._id,
            workerName: workerName,
            hours: Math.max(0, Number(hours) || 0),
            cost: Number(wageCost) || 0,
            revenue: Number(revenue) || 0,
          });
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

    // Build hierarchical data from all daily records (after all groups are processed)
    console.log(`[Eitje Aggregation] Building hierarchical data for ${dailyRecords.length} daily records...`);
    const hierarchicalData = buildHierarchicalLaborData(
      dailyRecords,
      locationMap,
      new Map() // Team map - can be enhanced later
    );

    // Add hierarchical data to each aggregated record (for now, we'll store it per location/date)
    // In a full implementation, we might want to store hierarchical data separately or merge it
    // For now, we'll add it to the first record of each location (simplified approach)

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

