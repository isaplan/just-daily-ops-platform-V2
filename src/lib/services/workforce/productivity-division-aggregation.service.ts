/**
 * Productivity Division Aggregation Service
 * Calculates division-level aggregations (Food/Beverage/Management/Other)
 */

import { 
  ProductivityAggregation,
  ProductivityByDivision,
  ProductivityEnhancedQueryParams
} from '@/models/workforce/productivity.model';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';

/**
 * Calculate productivity by division
 */
export function calculateByDivision(
  aggregated: ProductivityAggregation[],
  params: ProductivityEnhancedQueryParams
): ProductivityByDivision[] {
  // Group by division and period
  const divisionMap = new Map<string, ProductivityByDivision>();
  
  for (const record of aggregated) {
    // Skip records without team category (can't determine division)
    if (!record.teamCategory) {
      continue;
    }
    
    // Determine division based on team category
    let division: 'Food' | 'Beverage' | 'Management' | 'Other' | 'All' = 'All';
    if (record.teamCategory === 'Kitchen') {
      division = 'Food';
    } else if (record.teamCategory === 'Service') {
      division = 'Beverage';
    } else if (record.teamCategory === 'Management') {
      division = 'Management';
    } else if (record.teamCategory === 'Other') {
      division = 'Other';
    }
    
    // Apply division filter if specified
    if (params.division && params.division !== 'All' && division !== params.division) {
      continue;
    }
    
    const key = `${record.period}_${division}_${record.locationId || 'all'}`;
    
    if (!divisionMap.has(key)) {
      divisionMap.set(key, {
        division,
        period: record.period,
        periodType: record.periodType,
        locationId: record.locationId,
        locationName: record.locationName,
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
      });
    }
    
    const div = divisionMap.get(key)!;
    div.totalHoursWorked += record.totalHoursWorked;
    div.totalWageCost += record.totalWageCost;
    div.totalRevenue += record.totalRevenue;
  }
  
  // Calculate derived metrics
  const result = Array.from(divisionMap.values()).map(div => {
    div.revenuePerHour = div.totalHoursWorked > 0 
      ? div.totalRevenue / div.totalHoursWorked 
      : 0;
    div.laborCostPercentage = div.totalRevenue > 0
      ? (div.totalWageCost / div.totalRevenue) * 100
      : 0;
    div.goalStatus = applyProductivityGoals(div.revenuePerHour, div.laborCostPercentage);
    return div;
  });
  
  // Sort by period (descending), then location, then division
  return result.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    if (a.locationName !== b.locationName) {
      return (a.locationName || '').localeCompare(b.locationName || '');
    }
    const divisionOrder: Record<string, number> = { 'Food': 1, 'Beverage': 2, 'Management': 3, 'Other': 4, 'All': 5 };
    return (divisionOrder[a.division] || 5) - (divisionOrder[b.division] || 5);
  });
}




