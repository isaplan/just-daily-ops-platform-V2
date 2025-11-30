/**
 * Eitje Aggregation Service
 * 
 * Builds hierarchical time-series labor data from daily records
 * Used by the Eitje aggregation API route
 */

import { ObjectId } from 'mongodb';
import { getYearKey, getMonthKey, getWeekKey, getISOWeek, isOlderThanOneMonth, isOlderThanOneWeek, isToday } from '@/lib/utils/time-helpers';

export interface DailyLaborRecord {
  date: Date;
  locationId: ObjectId;
  teamId: string;
  teamName: string;
  unifiedUserId: ObjectId | null;
  workerName: string;
  hours: number;
  cost: number;
  revenue: number;
}

export interface HierarchicalLaborData {
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
}

/**
 * Build hierarchical time-series labor data from daily records
 */
export function buildHierarchicalLaborData(
  dailyRecords: DailyLaborRecord[],
  locationMap: Map<string, { id: ObjectId; name: string }>,
  teamMap: Map<string, { id: string; name: string }>
): HierarchicalLaborData {
  console.log(`[Eitje Aggregation] Building hierarchical labor data from ${dailyRecords.length} daily records...`);
  
  // Build hierarchical structure: year -> month -> week -> day -> location -> team -> worker
  const yearMap = new Map<
    string,
    Map<
      string,
      Map<
        string,
        Map<
          string,
          Map<
            string,
            Map<
              string,
              Map<
                string,
                {
                  hours: number;
                  cost: number;
                  revenue: number;
                }
              >
            >
          >
        >
      >
    >
  >();

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
    const dayLocationMap = dayMap.get(dateStr)!;

    // Initialize location
    if (!dayLocationMap.has(locIdStr)) {
      dayLocationMap.set(locIdStr, new Map());
    }
    const teamMap = dayLocationMap.get(locIdStr)!;

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
  const hoursByYear: HierarchicalLaborData['hoursByYear'] = [];

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
  const hoursByMonth: HierarchicalLaborData['hoursByMonth'] = [];

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
  const hoursByWeek: HierarchicalLaborData['hoursByWeek'] = [];

  for (const [year, monthMap] of yearMap.entries()) {
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [week, dayMap] of weekMap.entries()) {
        // Get week start date to check if older than 1 week
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
  const hoursByDay: HierarchicalLaborData['hoursByDay'] = [];

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

