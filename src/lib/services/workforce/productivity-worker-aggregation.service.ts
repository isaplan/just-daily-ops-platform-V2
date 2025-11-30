/**
 * Productivity Worker Aggregation Service
 * Calculates worker-level aggregations
 */

import { 
  ProductivityAggregation,
  WorkerProductivity,
  ProductivityEnhancedQueryParams
} from '@/models/workforce/productivity.model';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';

/**
 * Calculate productivity by worker
 */
export function calculateByWorker(
  aggregated: ProductivityAggregation[],
  params: ProductivityEnhancedQueryParams
): WorkerProductivity[] {
  const workerMap = new Map<string, WorkerProductivity>();
  
  for (const record of aggregated) {
    if (!record.workerId) continue;
    
    // Apply worker filter if specified
    if (params.workerId && params.workerId !== 'all' && record.workerId !== params.workerId) {
      continue;
    }
    
    const key = `${record.period}_${record.workerId}_${record.locationId || 'all'}`;
    
    if (!workerMap.has(key)) {
      workerMap.set(key, {
        workerId: record.workerId,
        workerName: record.workerName || 'Unknown',
        period: record.period,
        periodType: record.periodType,
        locationId: record.locationId,
        locationName: record.locationName,
        teamCategory: record.teamCategory,
        subTeam: record.subTeam,
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
        productivityScore: 0,
      });
    }
    
    const worker = workerMap.get(key)!;
    worker.totalHoursWorked += record.totalHoursWorked;
    worker.totalWageCost += record.totalWageCost;
    worker.totalRevenue += record.totalRevenue;
  }
  
  // Calculate derived metrics
  const result = Array.from(workerMap.values()).map(worker => {
    worker.revenuePerHour = worker.totalHoursWorked > 0 
      ? worker.totalRevenue / worker.totalHoursWorked 
      : 0;
    worker.laborCostPercentage = worker.totalRevenue > 0
      ? (worker.totalWageCost / worker.totalRevenue) * 100
      : 0;
    worker.productivityScore = worker.revenuePerHour;
    worker.goalStatus = applyProductivityGoals(worker.revenuePerHour, worker.laborCostPercentage);
    return worker;
  });
  
  // Sort by period (descending), then location, then worker name
  return result.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    if (a.locationName !== b.locationName) {
      return (a.locationName || '').localeCompare(b.locationName || '');
    }
    return (a.workerName || '').localeCompare(b.workerName || '');
  });
}




