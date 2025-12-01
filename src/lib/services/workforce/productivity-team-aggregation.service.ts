/**
 * Productivity Team Aggregation Service
 * Calculates team category-level aggregations (Kitchen/Service/Management/Other)
 */

import { 
  ProductivityAggregation,
  ProductivityByTeamCategory,
  ProductivityEnhancedQueryParams
} from '@/models/workforce/productivity.model';
import { TeamCategory } from '@/lib/utils/team-categorization';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';

/**
 * Calculate productivity by team category
 */
export function calculateByTeamCategory(
  aggregated: ProductivityAggregation[],
  params: ProductivityEnhancedQueryParams
): ProductivityByTeamCategory[] {
  const categoryMap = new Map<string, ProductivityByTeamCategory>();
  
  for (const record of aggregated) {
    if (!record.teamCategory) continue;
    
    // Apply team category filter if specified
    if (params.teamCategory && params.teamCategory !== 'all' && record.teamCategory !== params.teamCategory) {
      continue;
    }
    
    const key = `${record.period}_${record.teamCategory}_${record.locationId || 'all'}`;
    
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        teamCategory: record.teamCategory,
        period: record.period,
        periodType: record.periodType,
        locationId: record.locationId,
        locationName: record.locationName,
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
        subTeams: [],
      });
    }
    
    const cat = categoryMap.get(key)!;
    cat.totalHoursWorked += record.totalHoursWorked;
    cat.totalWageCost += record.totalWageCost;
    cat.totalRevenue += record.totalRevenue;
    
    // Add sub-team if not already present
    if (record.subTeam && !cat.subTeams.find(st => st.subTeam === record.subTeam)) {
      cat.subTeams.push({
        subTeam: record.subTeam || '',
        totalHoursWorked: record.totalHoursWorked,
        totalWageCost: record.totalWageCost,
        totalRevenue: record.totalRevenue,
        revenuePerHour: record.revenuePerHour,
        laborCostPercentage: record.laborCostPercentage,
      });
    }
  }
  
  // Calculate derived metrics
  const result = Array.from(categoryMap.values()).map(cat => {
    cat.revenuePerHour = cat.totalHoursWorked > 0 
      ? cat.totalRevenue / cat.totalHoursWorked 
      : 0;
    cat.laborCostPercentage = cat.totalRevenue > 0
      ? (cat.totalWageCost / cat.totalRevenue) * 100
      : 0;
    cat.goalStatus = applyProductivityGoals(cat.revenuePerHour, cat.laborCostPercentage);
    
    // Calculate sub-team metrics
    cat.subTeams = cat.subTeams.map(subTeam => ({
      ...subTeam,
      revenuePerHour: subTeam.totalHoursWorked > 0 
        ? subTeam.totalRevenue / subTeam.totalHoursWorked 
        : 0,
      laborCostPercentage: subTeam.totalRevenue > 0
        ? (subTeam.totalWageCost / subTeam.totalRevenue) * 100
        : 0,
    }));
    
    return cat;
  });
  
  // Sort by period (descending), then location, then category
  return result.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    if (a.locationName !== b.locationName) {
      return (a.locationName || '').localeCompare(b.locationName || '');
    }
    const categoryOrder: Record<TeamCategory, number> = { 'Kitchen': 1, 'Service': 2, 'Management': 3, 'Other': 4 };
    return (categoryOrder[a.teamCategory] || 4) - (categoryOrder[b.teamCategory] || 4);
  });
}






