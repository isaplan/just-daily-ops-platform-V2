/**
 * Productivity Hierarchy Service
 * Builds hierarchical productivity structure from eitje_aggregated + division revenue
 * Creates LaborProductivityHierarchical structure: Location → Division → Team Category → Sub-Team → Worker
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { LaborProductivityHierarchical } from '@/lib/mongodb/v2-schema';
import { 
  getTeamCategory, 
  getTeamCategorySplit, 
  normalizeTeamName,
  TeamCategory 
} from '@/lib/utils/team-categorization';
import { calculateDivisionRevenueForDate, Division } from './division-revenue.service';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';

/**
 * Build productivity hierarchy for a specific location and date
 */
export async function buildProductivityHierarchy(
  locationId: string,
  date: Date | string
): Promise<LaborProductivityHierarchical | null> {
  const db = await getDatabase();
  const locationObjId = new ObjectId(locationId);
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Business Rule: Don't process future dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dateObj > today) {
    return null; // Skip future dates
  }
  
  const dateStr = dateObj.toISOString().split('T')[0];
  
  // Fetch eitje_aggregated record for this location and date
  const laborRecord = await db.collection('eitje_aggregated')
    .findOne({
      locationId: locationObjId,
      date: dateObj,
    });
  
  if (!laborRecord) {
    return null;
  }
  
  // Get location name
  const location = await db.collection('locations')
    .findOne({ _id: locationObjId });
  const locationName = location?.name || 'Unknown Location';
  
  // Extract hierarchical data from hoursByDay
  const dayData = laborRecord.hoursByDay?.find((d: any) => d.date === dateStr);
  if (!dayData) {
    return null;
  }
  
  const locationData = dayData.byLocation?.find((loc: any) => 
    loc?.locationId && loc.locationId.toString() === locationId
  );
  
  if (!locationData || !locationData.byTeam) {
    return null;
  }
  
  // Initialize hierarchy structure
  const hierarchy: LaborProductivityHierarchical = {
    date: dateObj,
    locationId: locationObjId,
    locationName,
    byDivision: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Process each team
  for (const team of locationData.byTeam) {
    const normalizedTeamName = normalizeTeamName(team.teamName);
    const teamCategory = getTeamCategory(normalizedTeamName);
    const teamSplit = getTeamCategorySplit(normalizedTeamName);
    
    // Determine division based on team category
    let division: Division = 'Other';
    if (teamCategory === 'Kitchen') {
      division = 'Food';
    } else if (teamCategory === 'Service') {
      division = 'Beverage';
    } else if (teamCategory === 'Management') {
      division = 'Management';
    } else if (teamCategory === 'Other') {
      division = 'Other';
    }
    
    // Handle split teams (like Afwas - 50% Kitchen, 50% Service)
    const divisionsToProcess = teamSplit 
      ? (teamSplit.kitchen > 0 ? ['Food'] : []).concat(teamSplit.service > 0 ? ['Beverage'] : [])
      : [division];
    
    for (const div of divisionsToProcess) {
      const splitRatio = teamSplit 
        ? (div === 'Food' ? teamSplit.kitchen : teamSplit.service)
        : 1.0;
      
      // Initialize division if not exists
      if (!hierarchy.byDivision[div]) {
        hierarchy.byDivision[div] = {
          totalHours: 0,
          totalCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          byTeamCategory: {},
        };
      }
      
      const divisionData = hierarchy.byDivision[div];
      
      // Initialize team category if not exists
      const categoryName = div === 'Food' ? 'Kitchen' : div === 'Beverage' ? 'Service' : teamCategory;
      if (!divisionData.byTeamCategory[categoryName]) {
        divisionData.byTeamCategory[categoryName] = {
          totalHours: 0,
          totalCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          bySubTeam: {},
        };
      }
      
      const categoryData = divisionData.byTeamCategory[categoryName];
      
      // Initialize sub-team if not exists
      if (!categoryData.bySubTeam[normalizedTeamName]) {
        categoryData.bySubTeam[normalizedTeamName] = {
          totalHours: 0,
          totalCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          byWorker: {},
        };
      }
      
      const subTeamData = categoryData.bySubTeam[normalizedTeamName];
      
      // Add team hours and cost (with split ratio)
      const teamHours = (team.totalHoursWorked || 0) * splitRatio;
      const teamCost = (team.totalWageCost || 0) * splitRatio;
      
      divisionData.totalHours += teamHours;
      divisionData.totalCost += teamCost;
      categoryData.totalHours += teamHours;
      categoryData.totalCost += teamCost;
      subTeamData.totalHours += teamHours;
      subTeamData.totalCost += teamCost;
      
      // Process workers
      if (team.byWorker && Array.isArray(team.byWorker)) {
        for (const worker of team.byWorker) {
          const workerId = worker.unifiedUserId?.toString() || '';
          if (!workerId) continue;
          
          const workerHours = (worker.totalHoursWorked || 0) * splitRatio;
          const workerCost = (worker.totalWageCost || 0) * splitRatio;
          
          // Initialize worker if not exists
          if (!subTeamData.byWorker[workerId]) {
            subTeamData.byWorker[workerId] = {
              workerName: worker.workerName || 'Unknown',
              totalHours: 0,
              totalCost: 0,
              totalRevenue: 0,
              revenuePerHour: 0,
              laborCostPercentage: 0,
            };
          }
          
          const workerData = subTeamData.byWorker[workerId];
          workerData.totalHours += workerHours;
          workerData.totalCost += workerCost;
        }
      }
    }
  }
  
  // Calculate division revenue from products
  for (const divisionName of Object.keys(hierarchy.byDivision)) {
    const divisionData = hierarchy.byDivision[divisionName];
    const division = divisionName as Division;
    
    // Calculate revenue for this division
    const revenue = await calculateDivisionRevenueForDate(locationId, dateObj, division);
    divisionData.totalRevenue = revenue;
    
    // Calculate derived metrics for division
    divisionData.revenuePerHour = divisionData.totalHours > 0
      ? divisionData.totalRevenue / divisionData.totalHours
      : 0;
    divisionData.laborCostPercentage = divisionData.totalRevenue > 0
      ? (divisionData.totalCost / divisionData.totalRevenue) * 100
      : 0;
    
    // Distribute revenue to team categories and sub-teams proportionally
    const totalCategoryHours = Object.values(divisionData.byTeamCategory).reduce(
      (sum, cat) => sum + cat.totalHours,
      0
    );
    
    for (const categoryName of Object.keys(divisionData.byTeamCategory)) {
      const categoryData = divisionData.byTeamCategory[categoryName];
      
      // Calculate category revenue (proportional to hours)
      const categoryRevenue = totalCategoryHours > 0
        ? (categoryData.totalHours / totalCategoryHours) * divisionData.totalRevenue
        : 0;
      
      categoryData.totalRevenue = categoryRevenue;
      categoryData.revenuePerHour = categoryData.totalHours > 0
        ? categoryData.totalRevenue / categoryData.totalHours
        : 0;
      categoryData.laborCostPercentage = categoryData.totalRevenue > 0
        ? (categoryData.totalCost / categoryData.totalRevenue) * 100
        : 0;
      
      // Distribute to sub-teams
      const totalSubTeamHours = Object.values(categoryData.bySubTeam).reduce(
        (sum, subTeam) => sum + subTeam.totalHours,
        0
      );
      
      for (const subTeamName of Object.keys(categoryData.bySubTeam)) {
        const subTeamData = categoryData.bySubTeam[subTeamName];
        
        // Calculate sub-team revenue (proportional to hours)
        const subTeamRevenue = totalSubTeamHours > 0
          ? (subTeamData.totalHours / totalSubTeamHours) * categoryData.totalRevenue
          : 0;
        
        subTeamData.totalRevenue = subTeamRevenue;
        subTeamData.revenuePerHour = subTeamData.totalHours > 0
          ? subTeamData.totalRevenue / subTeamData.totalHours
          : 0;
        subTeamData.laborCostPercentage = subTeamData.totalRevenue > 0
          ? (subTeamData.totalCost / subTeamData.totalRevenue) * 100
          : 0;
        
        // Distribute to workers
        const totalWorkerHours = Object.values(subTeamData.byWorker).reduce(
          (sum, worker) => sum + worker.totalHours,
          0
        );
        
        for (const workerId of Object.keys(subTeamData.byWorker)) {
          const workerData = subTeamData.byWorker[workerId];
          
          // Calculate worker revenue (proportional to hours)
          const workerRevenue = totalWorkerHours > 0
            ? (workerData.totalHours / totalWorkerHours) * subTeamData.totalRevenue
            : 0;
          
          workerData.totalRevenue = workerRevenue;
          workerData.revenuePerHour = workerData.totalHours > 0
            ? workerData.totalRevenue / workerData.totalHours
            : 0;
          workerData.laborCostPercentage = workerData.totalRevenue > 0
            ? (workerData.totalCost / workerData.totalRevenue) * 100
            : 0;
        }
      }
    }
  }
  
  return hierarchy;
}

