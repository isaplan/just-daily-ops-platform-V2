/**
 * Productivity Location Aggregation Service
 * Processes labor and sales records into location-level aggregations
 * Handles the "By Location" tab data
 */

import { ObjectId } from 'mongodb';
import { ProductivityAggregation } from '@/models/workforce/productivity.model';
import { aggregateByPeriod } from './productivity-period-utils';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';

export interface AggregateLocationDataParams {
  laborRecords: any[];
  salesRecords: any[];
  locationIdMap: Map<string, string>;
  locationMap: Map<string, { id: string; name: string }>;
  periodType: 'year' | 'month' | 'week' | 'day' | 'hour';
}

/**
 * Aggregate labor and sales records into location-level data
 * Returns a Map of location aggregations keyed by period_locationId
 */
export function aggregateLocationData(
  params: AggregateLocationDataParams
): Map<string, ProductivityAggregation> {
  const { laborRecords, salesRecords, locationIdMap, locationMap, periodType } = params;
  const locationDataMap = new Map<string, ProductivityAggregation>();

  // Process labor records (hours and costs)
  console.log(`[Productivity Location Aggregation] Processing ${laborRecords.length} labor records...`);
  
  for (let index = 0; index < laborRecords.length; index++) {
    const record = laborRecords[index];
    const date = record.date instanceof Date ? record.date : new Date(record.date);
    const periodKey = aggregateByPeriod(date, periodType);
    
    // Handle locationId - could be ObjectId or string
    let locationId = '';
    if (record.locationId) {
      if (record.locationId instanceof ObjectId) {
        locationId = record.locationId.toString();
      } else if (typeof record.locationId === 'object' && record.locationId.toString) {
        locationId = record.locationId.toString();
      } else {
        locationId = String(record.locationId);
      }
    }
    
    // Get location name from map
    const locationName = locationIdMap.get(locationId) || locationMap.get(locationId)?.name || 'Unknown Location';
    const key = `${periodKey}_${locationId}`;

    if (index < 3) {
      console.log(`[Productivity Location Aggregation] Processing labor record ${index + 1}:`, {
        date: date.toISOString(),
        periodKey,
        locationId,
        locationName,
        key,
        totalHoursWorked: record.totalHoursWorked,
        totalWageCost: record.totalWageCost,
      });
    }

    if (!locationDataMap.has(key)) {
      locationDataMap.set(key, {
        period: periodKey,
        periodType,
        locationId,
        locationName,
        teamId: undefined,
        teamName: undefined,
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
        recordCount: 0,
      });
      
      if (index < 3) {
        console.log(`[Productivity Location Aggregation] Created new location record for key: ${key}`);
      }
    }

    const agg = locationDataMap.get(key)!;
    
    // SET hours (eitje_aggregated already contains the daily total)
    const hours = typeof record.totalHoursWorked === 'number' ? record.totalHoursWorked : 0;
    agg.totalHoursWorked = hours;
    
    // SET wageCost (eitje_aggregated already contains the daily total)
    let wageCost = record.totalWageCost || 0;
    if (wageCost === 0 && record.teamStats && Array.isArray(record.teamStats) && record.teamStats.length > 0) {
      // Sum costs from teamStats if totalWageCost is 0
      wageCost = record.teamStats.reduce((sum: number, team: any) => sum + (team.cost || 0), 0);
    }
    agg.totalWageCost = wageCost;
    
    // SET revenue from eitje_aggregated (it already has revenue imported from bork)
    const revenue = record.totalRevenue || 0;
    agg.totalRevenue = revenue;
    
    // Store metadata for debugging (when was this data created/updated)
    (agg as any).sourceCreatedAt = record.createdAt;
    (agg as any).sourceUpdatedAt = record.updatedAt;
    
    // Log warning if costs are still 0 but hours exist (aggregation issue)
    if (wageCost === 0 && hours > 0) {
      console.warn(`[Productivity Location Aggregation] ⚠️ Missing labor cost for location ${locationName} on ${periodKey}. Hours: ${hours}, but cost is 0. This should be calculated during eitje aggregation.`);
    }
    
    if (index < 3) {
      console.log(`[Productivity Location Aggregation] After processing labor record ${index + 1}:`, {
        key,
        hoursFromDB: hours,
        wageCostFromDB: wageCost,
        revenueFromDB: revenue,
        aggHoursSet: agg.totalHoursWorked,
        aggCostSet: agg.totalWageCost,
        aggRevenueSet: agg.totalRevenue,
      });
    }
  }
  
  // Process sales records (revenue fallback)
  console.log(`[Productivity Location Aggregation] Processing ${salesRecords.length} sales records...`);
  
  // Create a set of all keys from labor records to check for matches
  const laborKeys = new Set<string>();
  locationDataMap.forEach((_, key) => {
    laborKeys.add(key);
  });
  
  salesRecords.forEach((record: any, index: number) => {
    const date = record.date instanceof Date ? record.date : new Date(record.date);
    const periodKey = aggregateByPeriod(date, periodType);
    
    // Handle locationId - could be ObjectId or string
    let locationId = '';
    if (record.locationId) {
      if (record.locationId instanceof ObjectId) {
        locationId = record.locationId.toString();
      } else if (typeof record.locationId === 'object' && record.locationId.toString) {
        locationId = record.locationId.toString();
      } else {
        locationId = String(record.locationId);
      }
    }
    
    const key = `${periodKey}_${locationId}`;

    if (locationDataMap.has(key)) {
      // Labor record already exists - only set revenue if eitje didn't have it (fallback)
      const agg = locationDataMap.get(key)!;
      const revenue = record.totalRevenue || 0;
      
      // Only set revenue if eitje_aggregated didn't have it (fallback from bork_aggregated)
      if (agg.totalRevenue === 0 && revenue > 0) {
        agg.totalRevenue = revenue;
        
        if (index < 3) {
          console.log(`[Productivity Location Aggregation] Set revenue from bork_aggregated (fallback) ${index + 1}:`, {
            key,
            revenue,
            totalRevenue: agg.totalRevenue,
            existingHours: agg.totalHoursWorked,
          });
        }
      } else if (index < 3) {
        console.log(`[Productivity Location Aggregation] Revenue already set from eitje_aggregated, skipping bork fallback ${index + 1}:`, {
          key,
          revenueFromBork: revenue,
          revenueFromEitje: agg.totalRevenue,
        });
      }
    } else {
      // No labor record exists - create entry with only sales data
      // This should be rare since eitje_aggregated has both hours and revenue
      const locationName = locationIdMap.get(locationId) || locationMap.get(locationId)?.name || 'Unknown Location';
      locationDataMap.set(key, {
        period: periodKey,
        periodType,
        locationId,
        locationName,
        teamId: undefined,
        teamName: undefined,
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: record.totalRevenue || 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
        recordCount: 0,
      });
      
      if (index < 3) {
        console.log(`[Productivity Location Aggregation] ⚠️ Created record from sales data only (no labor data) ${index + 1}:`, {
          key,
          locationName,
          locationId,
          date: date.toISOString(),
          periodKey,
          revenue: record.totalRevenue || 0,
        });
      }
    }
  });
  
  // Calculate derived metrics and apply goals
  locationDataMap.forEach((agg) => {
    // Revenue per hour: total revenue / total hours worked
    agg.revenuePerHour = agg.totalHoursWorked > 0 
      ? agg.totalRevenue / agg.totalHoursWorked 
      : 0;
    
    // Labor cost percentage: (total wage cost / total revenue) * 100
    agg.laborCostPercentage = agg.totalRevenue > 0 && agg.totalWageCost > 0
      ? (agg.totalWageCost / agg.totalRevenue) * 100
      : 0;
    
    agg.goalStatus = applyProductivityGoals(agg.revenuePerHour, agg.laborCostPercentage);
  });
  
  console.log(`[Productivity Location Aggregation] Summary after processing:`);
  console.log(`  - Labor records processed: ${laborRecords.length}`);
  console.log(`  - Sales records processed: ${salesRecords.length}`);
  console.log(`  - Total location records created: ${locationDataMap.size}`);
  
  // Check if any records have hours
  const recordsWithHours = Array.from(locationDataMap.values()).filter(r => r.totalHoursWorked > 0);
  console.log(`[Productivity Location Aggregation] Records with hours > 0: ${recordsWithHours.length} out of ${locationDataMap.size}`);
  
  return locationDataMap;
}




