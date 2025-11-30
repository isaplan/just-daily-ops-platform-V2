/**
 * Productivity By Worker - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * ✅ Uses GraphQL ONLY (no direct MongoDB queries)
 */

import { ProductivityByWorkerClient } from './ProductivityByWorkerClient';
import { getLaborProductivityEnhanced, getLocations } from '@/lib/services/graphql/queries';
import { WorkerProductivity } from '@/models/workforce/productivity.model';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server via GraphQL
export default async function ProductivityByWorkerPage() {
  const today = new Date();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  // ✅ Fetch via GraphQL (uses aggregated collections)
  const [productivityData, locations] = await Promise.all([
    getLaborProductivityEnhanced(
      thisMonthStart.toISOString().split('T')[0],
      thisMonthEnd.toISOString().split('T')[0],
      'DAY',
      undefined, // All locations
      undefined, // No filters
      1,
      10000 // Get all workers (high limit for initial load)
    ).catch(() => ({ 
      success: false, 
      records: [], 
      byWorker: [], 
      total: 0, 
      page: 1, 
      totalPages: 0 
    })),
    getLocations().catch(() => []),
  ]);

  // Transform GraphQL byWorker to WorkerProductivity format
  const workerData: WorkerProductivity[] = (productivityData.byWorker || []).map(w => ({
    workerId: w.workerId || '',
    workerName: w.workerName || '',
    period: w.period,
    periodType: w.periodType.toLowerCase() as 'year' | 'month' | 'week' | 'day' | 'hour',
    locationId: w.locationId || '',
    locationName: w.locationName || '',
    teamCategory: w.teamCategory?.toLowerCase() || 'Other',
    subTeam: w.subTeam || '',
    totalHoursWorked: w.totalHoursWorked,
    totalWageCost: w.totalWageCost,
    totalRevenue: w.totalRevenue,
    revenuePerHour: w.revenuePerHour,
    laborCostPercentage: w.laborCostPercentage,
    productivityScore: w.productivityScore,
    goalStatus: w.goalStatus as 'bad' | 'not_great' | 'ok' | 'great' | undefined,
    // These will be calculated client-side based on revenue type
    absoluteRevenue: 0,
    relativeRevenue: 0,
    absoluteRevenuePerHour: 0,
    relativeRevenuePerHour: 0,
  }));

  return (
    <ProductivityByWorkerClient
      initialData={{
        workerData: workerData || [],
        locations: locations || [],
      }}
    />
  );
}

