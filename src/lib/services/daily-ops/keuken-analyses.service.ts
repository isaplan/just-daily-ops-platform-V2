/**
 * Keuken Analyses Service
 * Data fetching for Daily Ops Keuken Analyses page
 */

import { 
  KeukenAnalysesData, 
  KeukenAnalysesQueryParams,
  WorkloadLevel,
  ProductProduction,
  WorkloadByHour,
  WorkloadByWorker,
  WorkloadByRange,
  WorkloadByDay,
  KitchenWorker,
} from "@/models/daily-ops/keuken-analyses.model";
import { getKeukenAnalyses } from "@/lib/services/graphql/queries";

// Helper functions removed - now using aggregated data

export async function fetchKeukenAnalysesData(
  params: KeukenAnalysesQueryParams
): Promise<KeukenAnalysesData> {
  console.log('[Keuken Service] Fetching aggregated data with params:', {
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId,
    timeRangeFilter: params.timeRangeFilter,
    selectedWorkerId: params.selectedWorkerId,
  });
  
  // Use aggregated data from keuken_analyses_aggregated collection
  const locationId = params.locationId || 'all';
  
  // Fetch aggregated keuken analyses data
  const aggregatedResponse = await getKeukenAnalyses(
    locationId,
    params.startDate,
    params.endDate,
    params.timeRangeFilter,
    params.selectedWorkerId
  );

  if (!aggregatedResponse.success || !aggregatedResponse.records) {
    console.error('[Keuken Service] Failed to fetch aggregated data:', aggregatedResponse.error);
    throw new Error(aggregatedResponse.error || "Failed to fetch keuken analyses data");
  }

  const aggregatedRecords = aggregatedResponse.records;
  console.log('[Keuken Service] Fetched aggregated records:', {
    total: aggregatedRecords.length,
    sample: aggregatedRecords[0],
  });

  // Aggregate data across all days
  // Combine product production across all days
  const productMap = new Map<string, ProductProduction>();
  const workloadByHourMap = new Map<string, WorkloadByHour>();
  const workloadByWorkerMap = new Map<string, WorkloadByWorker>();
  const workloadByRangeMap = new Map<string, WorkloadByRange>();
  const workloadByDayMap = new Map<string, WorkloadByDay>();
  const kitchenWorkersMap = new Map<string, KitchenWorker>();
  
  // Aggregate KPIs across all days
  let totalOrders = 0;
  let totalProductsProduced = 0;
  let totalWorkloadMinutes = 0;
  const hourWorkloadMap = new Map<number, number>();
  const rangeWorkloadMap = new Map<string, number>();
  
  for (const record of aggregatedRecords) {
    const recordDate = record.date;
    let dateStr: string;
    if (recordDate && typeof recordDate === 'object' && 'toISOString' in recordDate) {
      dateStr = (recordDate as Date).toISOString().split('T')[0];
    } else if (typeof recordDate === 'string') {
      dateStr = new Date(recordDate).toISOString().split('T')[0];
    } else {
      dateStr = new Date().toISOString().split('T')[0];
    }
    
    // Aggregate product production
    record.productProduction?.forEach((prod) => {
      const key = prod.productName;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: prod.productName,
          category: prod.category,
          totalQuantity: 0,
          workloadLevel: prod.workloadLevel as WorkloadLevel,
          workloadMinutes: prod.workloadMinutes,
          totalWorkloadMinutes: 0,
        });
      }
      const product = productMap.get(key)!;
      product.totalQuantity += prod.totalQuantity;
      product.totalWorkloadMinutes += prod.totalWorkloadMinutes;
    });
    
    // Aggregate workload by hour
    record.workloadByHour?.forEach((hourData) => {
      const key = `${dateStr}_${hourData.hour}`;
      if (!workloadByHourMap.has(key)) {
        workloadByHourMap.set(key, {
          hour: hourData.hour,
          date: dateStr,
          totalWorkloadMinutes: 0,
          productCount: 0,
          activeWorkers: 0,
        });
      }
      const hour = workloadByHourMap.get(key)!;
      hour.totalWorkloadMinutes += hourData.totalWorkloadMinutes;
      hour.productCount += hourData.productCount;
      hour.activeWorkers = Math.max(hour.activeWorkers, hourData.activeWorkers);
      
      // Track for peak hour calculation
      hourWorkloadMap.set(hourData.hour, (hourWorkloadMap.get(hourData.hour) || 0) + hourData.totalWorkloadMinutes);
    });
    
    // Aggregate workload by worker
    record.workloadByWorker?.forEach((workerData) => {
      const key = `${workerData.unifiedUserId}_${dateStr}`;
      if (!workloadByWorkerMap.has(key)) {
        workloadByWorkerMap.set(key, {
          workerId: workerData.unifiedUserId,
          workerName: workerData.workerName,
          teamName: workerData.teamName,
          date: dateStr,
          timeRange: "all",
          totalWorkloadMinutes: 0,
          productCount: 0,
        });
      }
      const worker = workloadByWorkerMap.get(key)!;
      worker.totalWorkloadMinutes += workerData.totalWorkloadMinutes;
      worker.productCount += workerData.productCount;
    });
    
    // Aggregate workload by range
    record.workloadByRange?.forEach((rangeData) => {
      const key = `${dateStr}_${rangeData.timeRange}`;
      if (!workloadByRangeMap.has(key)) {
        workloadByRangeMap.set(key, {
          date: dateStr,
          timeRange: rangeData.timeRange as "lunch" | "dinner" | "afternoon-drinks" | "after-drinks" | "all",
          totalWorkloadMinutes: 0,
          productCount: 0,
          activeWorkers: 0,
        });
      }
      const range = workloadByRangeMap.get(key)!;
      range.totalWorkloadMinutes += rangeData.totalWorkloadMinutes;
      range.productCount += rangeData.productCount;
      range.activeWorkers = Math.max(range.activeWorkers, rangeData.activeWorkers);
      
      // Track for peak range calculation
      if (rangeData.timeRange === "lunch" || rangeData.timeRange === "dinner") {
        rangeWorkloadMap.set(rangeData.timeRange, (rangeWorkloadMap.get(rangeData.timeRange) || 0) + rangeData.totalWorkloadMinutes);
      }
    });
    
    // Build workload by day
    if (!workloadByDayMap.has(dateStr)) {
      const lunchWorkload = record.workloadByRange?.find(r => r.timeRange === "lunch")?.totalWorkloadMinutes || 0;
      const dinnerWorkload = record.workloadByRange?.find(r => r.timeRange === "dinner")?.totalWorkloadMinutes || 0;
      const activeWorkers = new Set(record.workerActivity?.map(w => w.unifiedUserId) || []).size;
      
      workloadByDayMap.set(dateStr, {
        date: dateStr,
        totalWorkloadMinutes: record.kpis?.totalWorkloadMinutes || 0,
        productCount: record.kpis?.totalProductsProduced || 0,
        activeWorkers,
        lunchWorkload,
        dinnerWorkload,
      });
    }
    
    // Extract kitchen workers
    record.workerActivity?.forEach((worker) => {
      if (worker.isKitchenWorker) {
        const key = worker.unifiedUserId;
        if (!kitchenWorkersMap.has(key)) {
          kitchenWorkersMap.set(key, {
            workerId: worker.unifiedUserId,
            workerName: worker.workerName,
            teamName: worker.teamName,
          });
        }
      }
    });
    
    // Aggregate KPIs
    totalOrders += record.kpis?.totalOrders || 0;
    totalProductsProduced += record.kpis?.totalProductsProduced || 0;
    totalWorkloadMinutes += record.kpis?.totalWorkloadMinutes || 0;
  }
  
  const productProduction = Array.from(productMap.values());
  const workloadByHour = Array.from(workloadByHourMap.values());
  const workloadByWorker = Array.from(workloadByWorkerMap.values());
  const workloadByRange = Array.from(workloadByRangeMap.values());
  const workloadByDay = Array.from(workloadByDayMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const kitchenWorkers = Array.from(kitchenWorkersMap.values()).sort((a, b) => 
    a.workerName.localeCompare(b.workerName)
  );
  
  console.log('[Keuken Service] Aggregated data:', {
    totalProducts: productProduction.length,
    totalQuantity: productProduction.reduce((sum, p) => sum + p.totalQuantity, 0),
    workloadByHourCount: workloadByHour.length,
    workloadByWorkerCount: workloadByWorker.length,
    workloadByRangeCount: workloadByRange.length,
    workloadByDayCount: workloadByDay.length,
    kitchenWorkersCount: kitchenWorkers.length,
  });

  // Apply time range filter if specified
  let filteredWorkloadByRange = workloadByRange;
  let filteredWorkloadByHour = workloadByHour;
  const filteredWorkloadByDay = workloadByDay; // Never reassigned
  let filteredWorkloadByWorker = workloadByWorker;
  
  if (params.timeRangeFilter && params.timeRangeFilter !== "all") {
    filteredWorkloadByRange = workloadByRange.filter((r) => r.timeRange === params.timeRangeFilter);
    // Filter hours based on time range
    const rangeHours: number[] = [];
    if (params.timeRangeFilter === "lunch") rangeHours.push(...[11, 12, 13, 14, 15]);
    else if (params.timeRangeFilter === "afternoon-drinks") rangeHours.push(...[16, 17]);
    else if (params.timeRangeFilter === "dinner") rangeHours.push(...[18, 19, 20, 21]);
    else if (params.timeRangeFilter === "after-drinks") rangeHours.push(...[22, 23, 0, 1, 2]);
    
    filteredWorkloadByHour = workloadByHour.filter((h) => rangeHours.includes(h.hour));
  }
  
  // Apply worker filter if specified
  if (params.selectedWorkerId) {
    filteredWorkloadByWorker = workloadByWorker.filter((w) => w.workerId === params.selectedWorkerId);
    // Filter other metrics by worker's active hours
    const workerHours = new Set<number>();
    aggregatedRecords.forEach((record) => {
      record.workerActivity?.forEach((worker) => {
        if (worker.unifiedUserId === params.selectedWorkerId) {
          worker.hours.forEach((h) => workerHours.add(h));
        }
      });
    });
    
    filteredWorkloadByHour = filteredWorkloadByHour.filter((h) => workerHours.has(h.hour));
  }
  
  // Calculate final KPIs
  let peakHour = "12:00";
  let maxWorkload = 0;
  hourWorkloadMap.forEach((workload, hour) => {
    if (workload > maxWorkload) {
      maxWorkload = workload;
      peakHour = `${hour.toString().padStart(2, '0')}:00`;
    }
  });
  
  const peakTimeRange: "lunch" | "dinner" = 
    (rangeWorkloadMap.get("dinner") || 0) > (rangeWorkloadMap.get("lunch") || 0) ? "dinner" : "lunch";
  
  const averageWorkloadPerHour = filteredWorkloadByHour.length > 0
    ? filteredWorkloadByHour.reduce((sum, h) => sum + h.totalWorkloadMinutes, 0) / filteredWorkloadByHour.length
    : 0;
  
  const averageWorkersPerHour = filteredWorkloadByHour.length > 0
    ? filteredWorkloadByHour.reduce((sum, h) => sum + h.activeWorkers, 0) / filteredWorkloadByHour.length
    : 0;
  
  const finalKPIs = {
    totalOrders,
    totalProductsProduced,
    totalWorkloadMinutes,
    averageWorkloadPerHour,
    peakHour,
    peakTimeRange,
    averageWorkersPerHour: params.selectedWorkerId ? 1 : averageWorkersPerHour,
  };
  
  console.log('[Keuken Service] Final KPIs:', finalKPIs);
  
  // Build chart data
  const chartData = filteredWorkloadByDay.map((day) => ({
    date: day.date,
    orders: day.productCount,
    totalWorkloadMinutes: day.totalWorkloadMinutes,
    activeWorkers: params.selectedWorkerId ? 1 : day.activeWorkers,
    lunchWorkload: day.lunchWorkload,
    dinnerWorkload: day.dinnerWorkload,
  }));
  
  return {
    kpis: finalKPIs,
    chartData,
    productProduction: productProduction.sort((a, b) => b.totalWorkloadMinutes - a.totalWorkloadMinutes),
    workloadByHour: filteredWorkloadByHour.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.hour - b.hour;
    }),
    workloadByWorker: filteredWorkloadByWorker.sort((a: WorkloadByWorker, b: WorkloadByWorker) => b.totalWorkloadMinutes - a.totalWorkloadMinutes),
    workloadByRange: filteredWorkloadByRange.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.timeRange.localeCompare(b.timeRange);
    }),
    workloadByDay: filteredWorkloadByDay,
    kitchenWorkers,
  };
}
