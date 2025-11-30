/**
 * Enhanced Productivity Service Layer
 * Main orchestrator for productivity data fetching and aggregation
 * Uses modular services for data fetching, aggregation, and calculations
 */

import { 
  ProductivityEnhancedQueryParams, 
  ProductivityEnhancedResponse,
  ProductivityAggregation,
  WorkerProductivity,
} from '@/models/workforce/productivity.model';
import { getLocations } from '@/lib/services/graphql/queries';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { applyProductivityGoals, PRODUCTIVITY_GOALS } from '@/lib/utils/productivity-goals';

// Import modular services
import { aggregateByPeriod } from './productivity-period-utils';
import { 
  fetchLaborRecords, 
  fetchSalesRecords, 
  fetchLocationMaps
} from './productivity-data-fetcher.service';
import { aggregateLocationData } from './productivity-location-aggregation.service';
import { calculateByDivision } from './productivity-division-aggregation.service';
import { calculateDivisionData } from './productivity-division-calculator.service';
import { calculateByTeamCategory } from './productivity-team-aggregation.service';
import { calculateByWorker } from './productivity-worker-aggregation.service';
// Removed: fetchWorkerProductivityData - now queries aggregated collections directly
import { getTeamCategory, normalizeTeamName } from '@/lib/utils/team-categorization';

// Re-export for backward compatibility (server-side only)
export { applyProductivityGoals, PRODUCTIVITY_GOALS };

/**
 * Calculate division-based revenue
 * Food = Keuken categories, Beverage = Bar categories
 * Uses products_aggregated with locationDetails for location-specific revenue
 */
export async function calculateDivisionRevenue(
  locationId: string,
  startDate: string,
  endDate: string,
  division: 'Food' | 'Beverage' | 'Management' | 'Other' | 'All'
): Promise<number> {
  const db = await getDatabase();
  const locationObjId = new ObjectId(locationId);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  if (division === 'All') {
    // For total, use aggregated sales data
    const salesRecords = await db.collection('bork_aggregated')
      .find({
        locationId: locationObjId,
        date: {
          $gte: start,
          $lte: end,
        },
      })
      .toArray();
    
    return salesRecords.reduce((sum, record) => sum + (record.totalRevenue || 0), 0);
  }
  
  // For Food/Beverage, query products_aggregated by mainCategory
  // Products can have locationId: null (global) or specific locationId
  // We need to check both and use locationDetails for location-specific revenue
  const mainCategory = division === 'Food' ? 'Keuken' : 'Bar';
  
  // Query products with the specified mainCategory (both global and location-specific)
  const products = await db.collection('products_aggregated')
    .find({
      mainCategory,
      $or: [
        { locationId: locationObjId },
        { locationId: null }, // Global products
      ],
    })
    .toArray();
  
  // Sum revenue from locationDetails or salesByDate within the date range
  let totalRevenue = 0;
  const startDateStr = startDate.split('T')[0];
  const endDateStr = endDate.split('T')[0];
  
  for (const product of products) {
    // Check locationDetails first (location-specific sales data)
    if (product.locationDetails && Array.isArray(product.locationDetails)) {
      const locationDetail = product.locationDetails.find((ld: any) => 
        ld.locationId && ld.locationId.toString() === locationId
      );
      
      if (locationDetail && locationDetail.totalRevenue) {
        // Use location-specific revenue if available
        // Note: This is total revenue for the product at this location, not filtered by date
        // For date filtering, we'd need to use salesByDate with location filtering
        totalRevenue += locationDetail.totalRevenue || 0;
        continue;
      }
    }
    
    // Fallback to salesByDate (filter by date range)
    if (product.salesByDate && Array.isArray(product.salesByDate)) {
      const filteredSales = product.salesByDate.filter((sale: any) => {
        const saleDate = sale.date instanceof Date 
          ? sale.date.toISOString().split('T')[0]
          : sale.date;
        return saleDate >= startDateStr && saleDate <= endDateStr;
      });
      
      // For global products, we need to check if sales are for this location
      // For now, we'll use all sales (can be enhanced later with location filtering in salesByDate)
      totalRevenue += filteredSales.reduce(
        (sum: number, sale: any) => sum + (sale.revenueIncVat || 0),
        0
      );
    }
  }
  
  return totalRevenue;
}

/**
 * Fetch productivity data directly from aggregated collections
 * Main orchestrator function - delegates to modular services
 */
export async function fetchProductivityEnhanced(
  params: ProductivityEnhancedQueryParams
): Promise<ProductivityEnhancedResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  end.setHours(23, 59, 59, 999);
  
  // Business Rule: Don't show future data by default
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (end > today) {
    end.setTime(today.getTime());
  }

  // Fetch all locations
  const locations = await getLocations();
  const validLocations = locations.filter(
    (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
  );

  // Build location filter
  const locationIds = params.locationId && params.locationId !== "all" 
    ? [params.locationId] 
    : validLocations.map((loc: any) => loc.id);

  const locationObjIds = locationIds.map((id: string) => new ObjectId(id));
  const periodType = params.periodType || 'day';

  console.log(`[Productivity Enhanced] Fetching data for ${locationIds.length} location(s), period: ${periodType}, date range: ${params.startDate} to ${params.endDate}`);

  // Step 1: Fetch data from MongoDB (using modular data fetcher)
  const [laborRecords, salesRecords, { locationMap, locationIdMap }] = await Promise.all([
    fetchLaborRecords({ locationObjIds, start, end }),
    fetchSalesRecords({ locationObjIds, start, end }),
    fetchLocationMaps(locationIds),
  ]);

  console.log(`[Productivity Enhanced] Fetched ${laborRecords.length} labor records, ${salesRecords.length} sales records`);

  // Step 2: Aggregate location-level data (for "By Location" tab)
  const locationDataMap = aggregateLocationData({
    laborRecords,
    salesRecords,
    locationIdMap,
    locationMap,
    periodType,
  });

  // Convert map to array and sort
  const locationRecords: ProductivityAggregation[] = Array.from(locationDataMap.values());
  locationRecords.sort((a, b) => {
    if (a.period !== b.period) return b.period.localeCompare(a.period);
    return (a.locationName || '').localeCompare(b.locationName || '');
  });

  // Log sample records (last 9 - most recent)
  if (locationRecords.length > 0) {
    const startIdx = Math.max(0, locationRecords.length - 9);
    console.log(`[Productivity Enhanced] Sample location records (last 9 - most recent, showing ${startIdx + 1} to ${locationRecords.length}):`);
    locationRecords.slice(startIdx).forEach((record, idx) => {
      console.log(`  Record ${startIdx + idx + 1}/${locationRecords.length}:`, {
        period: record.period,
        locationName: record.locationName,
        locationId: record.locationId,
        totalHoursWorked: record.totalHoursWorked,
        totalWageCost: record.totalWageCost,
        totalRevenue: record.totalRevenue,
        revenuePerHour: record.revenuePerHour,
        laborCostPercentage: record.laborCostPercentage,
      });
    });
    
    const recordsWithHours = locationRecords.filter(r => r.totalHoursWorked > 0);
    console.log(`[Productivity Enhanced] Records with hours > 0: ${recordsWithHours.length} out of ${locationRecords.length}`);
  }

  // Step 3: Calculate division/team/worker breakdowns
  // Calculate division data from teamStats in labor records
  // Create a map of location revenue for distribution
  const locationRevenueMap = new Map<string, { totalRevenue: number }>();
  locationDataMap.forEach((agg, key) => {
    locationRevenueMap.set(key, { totalRevenue: agg.totalRevenue });
  });
  
  const byDivision = await calculateDivisionData({
    laborRecords,
    locationDataMap: locationRevenueMap,
    locationIdMap,
    locationMap,
    periodType,
  });

  console.log(`[Productivity Enhanced] Calculated ${byDivision.length} division records`);

  // ✅ Fetch worker data directly from worker_profiles_aggregated (GraphQL-compliant, modular)
  // Query aggregated collection directly - no monolithic function needed
  const byWorker: WorkerProductivity[] = [];
  try {
    const db = await getDatabase();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    const workerQuery: any = {
      isActive: true,
      activeYears: startYear === endYear 
        ? startYear 
        : { $in: Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i) },
    };
    
    const workerProfiles = await db.collection('worker_profiles_aggregated')
      .find(workerQuery)
      .toArray();
    
    // Extract worker productivity from productivityByYear structure (modular approach)
    for (const worker of workerProfiles) {
      if (!worker.productivityByYear || !Array.isArray(worker.productivityByYear)) continue;
      
      const workerId = worker._id?.toString() || String(worker.eitjeUserId);
      const workerName = worker.userName || worker.unifiedUserName || `Worker ${worker.eitjeUserId}`;
      
      for (const yearData of worker.productivityByYear) {
        const year = parseInt(yearData.year);
        if (year < startYear || year > endYear) continue;
        
        if (!yearData.byMonth || !Array.isArray(yearData.byMonth)) continue;
        
        for (const monthData of yearData.byMonth) {
          const monthDate = new Date(monthData.year, monthData.month - 1, 1);
          if (monthDate < start || monthDate > end) continue;
          
          if (monthData.byDay && Array.isArray(monthData.byDay)) {
            for (const dayData of monthData.byDay) {
              const dayDate = new Date(dayData.date);
              if (dayDate < start || dayDate > end) continue;
              
              // Filter by location if specified
              const dayLocationId = dayData.locationId instanceof ObjectId
                ? dayData.locationId.toString()
                : dayData.locationId?.toString() || '';
              
              if (locationIds.length === 1 && dayLocationId !== locationIds[0]) continue;
              if (dayData.totalHoursWorked === 0) continue;
              
              const periodKey = aggregateByPeriod(dayDate, periodType);
              const key = `${periodKey}_${workerId}_${dayLocationId || 'unknown'}`;
              
              // Check if worker already exists for this period/location
              const existing = byWorker.find(w => 
                w.workerId === workerId && 
                w.period === periodKey && 
                w.locationId === dayLocationId
              );
              
              if (existing) {
                existing.totalHoursWorked += dayData.totalHoursWorked;
                existing.totalWageCost += dayData.totalWageCost;
                existing.totalRevenue += dayData.totalRevenue;
              } else {
                byWorker.push({
                  workerId,
                  workerName,
                  period: periodKey,
                  periodType,
                  locationId: dayLocationId,
                  locationName: dayData.locationName || locationMap.get(dayLocationId) || 'Unknown',
                  teamCategory: worker.teamName ? getTeamCategory(normalizeTeamName(worker.teamName)) : 'Other',
                  subTeam: normalizeTeamName(worker.teamName || ''),
                  totalHoursWorked: dayData.totalHoursWorked,
                  totalWageCost: dayData.totalWageCost,
                  totalRevenue: dayData.totalRevenue,
                  revenuePerHour: 0, // Will be calculated below
                  laborCostPercentage: 0, // Will be calculated below
                  productivityScore: 0,
                });
              }
            }
          }
        }
      }
    }
    
    // Calculate derived metrics
    byWorker.forEach(worker => {
      worker.revenuePerHour = worker.totalHoursWorked > 0 
        ? worker.totalRevenue / worker.totalHoursWorked 
        : 0;
      worker.laborCostPercentage = worker.totalRevenue > 0
        ? (worker.totalWageCost / worker.totalRevenue) * 100
        : 0;
      worker.productivityScore = worker.revenuePerHour;
      worker.goalStatus = applyProductivityGoals(worker.revenuePerHour, worker.laborCostPercentage);
    });
    
    // Sort by period (desc), location, worker name
    byWorker.sort((a, b) => {
      if (a.period !== b.period) return b.period.localeCompare(a.period);
      if (a.locationName !== b.locationName) return (a.locationName || '').localeCompare(b.locationName || '');
      return (a.workerName || '').localeCompare(b.workerName || '');
    });
    
    console.log(`[Productivity Enhanced] Fetched ${byWorker.length} worker records from worker_profiles_aggregated`);
  } catch (error) {
    console.error('[Productivity Enhanced] Error fetching worker data:', error);
  }
  
  // For missing wage workers, we'll need to track separately
  const missingWageWorkers: any[] = [];
  // TODO: Track missing wage workers from processedHours lookup

  // Calculate team category breakdown from teamStats (NOT hoursByDay which doesn't exist)
  const byTeamCategory: any[] = [];
  try {
    // Load team names from database
    const db = await getDatabase();
    const teamRecords = await db.collection('eitje_raw_data')
      .find({ endpoint: 'teams' })
      .toArray();
    
    const teamIdToNameMap = new Map<string, string>();
    teamRecords.forEach((teamRecord: any) => {
      const teamId = teamRecord.extracted?.id || teamRecord.rawApiResponse?.id;
      const teamName = teamRecord.extracted?.name || teamRecord.rawApiResponse?.name;
      if (teamId && teamName) {
        teamIdToNameMap.set(String(teamId), teamName);
      }
    });
    
    // Extract team category data from labor records' teamStats
    const teamCategoryMap = new Map<string, any>();
    
    for (const record of laborRecords) {
      if (!record.teamStats || !Array.isArray(record.teamStats) || record.teamStats.length === 0) continue;
      
      const date = record.date instanceof Date ? record.date : new Date(record.date);
      const periodKey = aggregateByPeriod(date, periodType);
      
      let locationId = '';
      if (record.locationId) {
        locationId = record.locationId instanceof ObjectId 
          ? record.locationId.toString() 
          : String(record.locationId);
      }
      
      const locationName = locationIdMap.get(locationId) || locationMap.get(locationId)?.name || 'Unknown Location';
      const locationKey = `${periodKey}_${locationId}`;
      const locationRevenue = locationDataMap.get(locationKey)?.totalRevenue || record.totalRevenue || 0;
      const locationHours = record.totalHoursWorked || 0;
      
      // Process teamStats to get team category data
      for (const teamStat of record.teamStats) {
        const teamId = String(teamStat.teamId || '');
        const teamName = teamIdToNameMap.get(teamId) || (teamStat as any).teamName || 'Unknown';
        const normalizedTeamName = normalizeTeamName(teamName);
        const teamCategory = getTeamCategory(normalizedTeamName);
        
        const teamHours = teamStat.hours || 0;
        const teamCost = teamStat.cost || 0;
        
        const key = `${periodKey}_${teamCategory}_${locationId}`;
        
        if (!teamCategoryMap.has(key)) {
          teamCategoryMap.set(key, {
            teamCategory,
            period: periodKey,
            periodType,
            locationId,
            locationName,
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
            revenuePerHour: 0,
            laborCostPercentage: 0,
            subTeams: [],
          });
        }
        
        const cat = teamCategoryMap.get(key)!;
        cat.totalHoursWorked += teamHours;
        cat.totalWageCost += teamCost;
        
        // Add sub-team if not already present
        if (!cat.subTeams.find((st: any) => st.subTeam === normalizedTeamName)) {
          cat.subTeams.push({
            subTeam: normalizedTeamName,
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
            revenuePerHour: 0,
            laborCostPercentage: 0,
          });
        }
        
        // Update sub-team totals
        const subTeam = cat.subTeams.find((st: any) => st.subTeam === normalizedTeamName)!;
        subTeam.totalHoursWorked += teamHours;
        subTeam.totalWageCost += teamCost;
      }
      
      // Distribute revenue proportionally to team categories
      if (locationHours > 0) {
        for (const [key, cat] of teamCategoryMap.entries()) {
          if (key.startsWith(`${periodKey}_`) && key.endsWith(`_${locationId}`)) {
            const revenueShare = (cat.totalHoursWorked / locationHours) * locationRevenue;
            cat.totalRevenue += revenueShare;
          }
        }
      }
    }
    
    // Calculate metrics for team categories and sub-teams
    for (const [key, cat] of teamCategoryMap.entries()) {
      // Calculate sub-team metrics
      cat.subTeams.forEach((subTeam: any) => {
        subTeam.revenuePerHour = subTeam.totalHoursWorked > 0 
          ? subTeam.totalRevenue / subTeam.totalHoursWorked 
          : 0;
        subTeam.laborCostPercentage = subTeam.totalRevenue > 0
          ? (subTeam.totalWageCost / subTeam.totalRevenue) * 100
          : 0;
      });
      
      cat.revenuePerHour = cat.totalHoursWorked > 0 
        ? cat.totalRevenue / cat.totalHoursWorked 
        : 0;
      cat.laborCostPercentage = cat.totalRevenue > 0
        ? (cat.totalWageCost / cat.totalRevenue) * 100
        : 0;
      cat.goalStatus = applyProductivityGoals(cat.revenuePerHour, cat.laborCostPercentage);
    }
    
    byTeamCategory.push(...Array.from(teamCategoryMap.values()));
    byTeamCategory.sort((a, b) => {
      if (a.period !== b.period) return b.period.localeCompare(a.period);
      if (a.locationName !== b.locationName) return (a.locationName || '').localeCompare(b.locationName || '');
      const categoryOrder: Record<string, number> = { 'Kitchen': 1, 'Service': 2, 'Management': 3, 'Other': 4 };
      return (categoryOrder[a.teamCategory] || 4) - (categoryOrder[b.teamCategory] || 4);
    });
    
    console.log(`[Productivity Enhanced] Calculated ${byTeamCategory.length} team category records`);
  } catch (error) {
    console.error('[Productivity Enhanced] Error calculating team categories:', error);
  }

  // Step 4: Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;
  const paginatedRecords = locationRecords.slice(skip, skip + limit);

  console.log(`[Productivity Enhanced] Returning ${paginatedRecords.length} records (page ${page} of ${Math.ceil(locationRecords.length / limit)})`);

  // Debug info: Show what collections were queried and what data was found
  const debugInfo = {
    collectionsQueried: [
      'eitje_aggregated (labor records)',
      'bork_aggregated (sales records)',
      'processedHours (worker data)',
      'eitje_raw_data (team names)',
      'worker_profiles (worker wages)',
      'unified_users (worker names)',
    ],
    dataFound: {
      laborRecords: laborRecords.length,
      salesRecords: salesRecords.length,
      locationRecords: locationRecords.length,
      divisionRecords: byDivision.length,
      teamCategoryRecords: byTeamCategory.length,
      workerRecords: byWorker.length,
    },
    sampleLaborRecord: laborRecords.length > 0 ? {
      date: laborRecords[0].date,
      locationId: laborRecords[0].locationId?.toString(),
      totalHoursWorked: laborRecords[0].totalHoursWorked,
      totalWageCost: laborRecords[0].totalWageCost,
      hasTeamStats: !!laborRecords[0].teamStats && Array.isArray(laborRecords[0].teamStats),
      teamStatsCount: laborRecords[0].teamStats?.length || 0,
      hasHoursByDay: !!laborRecords[0].hoursByDay && Array.isArray(laborRecords[0].hoursByDay),
      hoursByDayCount: laborRecords[0].hoursByDay?.length || 0,
    } : null,
  };

  return {
    success: true,
    records: paginatedRecords,
    total: locationRecords.length,
    page,
    totalPages: Math.ceil(locationRecords.length / limit),
    byDivision,
    byTeamCategory,
    byWorker,
    missingWageWorkers: missingWageWorkers.length > 0 ? missingWageWorkers : undefined,
    debugInfo, // ✅ Add debug info to response
  };
}
