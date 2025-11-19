/**
 * Kitchen Analyses Aggregation Service
 * Builds daily_dashboard_kitchen collection from raw data
 * 
 * This service:
 * 1. Queries bork_raw_data for product-level sales with time
 * 2. Queries eitje_raw_data for worker-level labor
 * 3. Uses unified_users to map workers across systems
 * 4. Calculates workload metrics, KPIs, and aggregations
 * 5. Stores results in daily_dashboard_kitchen collection
 */

import { getDatabase } from "@/lib/mongodb/v2-connection";
import { ObjectId } from "mongodb";
import { DailyDashboardKitchen } from "@/lib/mongodb/v2-schema";
import { WorkloadThresholds } from "@/models/daily-ops/keuken-analyses.model";
import { getProducts } from "@/lib/services/graphql/queries";

const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  low: 2.5,
  mid: 5,
  high: 10,
};

interface ProductCatalogItem {
  workloadLevel: "low" | "mid" | "high";
  workloadMinutes: number;
  category?: string;
}

// Cache for product catalog
let productCatalogCache: Map<string, ProductCatalogItem> | null = null;
let productCatalogCacheTime: number = 0;
const PRODUCT_CATALOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadProductCatalog(): Promise<Map<string, ProductCatalogItem>> {
  const now = Date.now();
  
  if (productCatalogCache && (now - productCatalogCacheTime) < PRODUCT_CATALOG_CACHE_TTL) {
    return productCatalogCache;
  }

  try {
    const productsResponse = await getProducts(1, 10000, { isActive: true });
    const catalog = new Map<string, ProductCatalogItem>();
    
    if (productsResponse.success && productsResponse.records) {
      productsResponse.records.forEach((product) => {
        catalog.set(product.productName, {
          workloadLevel: product.workloadLevel as "low" | "mid" | "high",
          workloadMinutes: product.workloadMinutes,
          category: product.category || undefined,
        });
      });
    }
    
    productCatalogCache = catalog;
    productCatalogCacheTime = now;
    return catalog;
  } catch (error) {
    console.warn('[Keuken Aggregation] Failed to load product catalog:', error);
    return new Map();
  }
}

function getWorkloadLevel(
  productName: string,
  catalog: Map<string, ProductCatalogItem>,
  thresholds: WorkloadThresholds
): { level: "low" | "mid" | "high"; minutes: number } {
  const catalogProduct = catalog.get(productName);
  
  if (catalogProduct) {
    return {
      level: catalogProduct.workloadLevel,
      minutes: catalogProduct.workloadMinutes,
    };
  }
  
  // Fallback to heuristic
  const name = productName.toLowerCase();
  
  if (name.includes("pasta") || name.includes("risotto") || name.includes("steak") || name.includes("burger")) {
    return { level: "high", minutes: thresholds.high };
  }
  
  if (name.includes("salad") || name.includes("soup") || name.includes("sandwich")) {
    return { level: "mid", minutes: thresholds.mid };
  }
  
  return { level: "low", minutes: thresholds.low };
}

function getTimeRange(hour: number): "lunch" | "dinner" | "afternoon-drinks" | "after-drinks" | "other" {
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 18) return "afternoon-drinks";
  if (hour >= 18 && hour < 22) return "dinner";
  if (hour >= 22 || hour < 3) return "after-drinks";
  return "other";
}

function isKitchenWorker(teamName: string | null | undefined): boolean {
  if (!teamName) return false;
  const name = teamName.toLowerCase();
  return name.includes("kitchen") || name.includes("keuken") || name.includes("kok");
}

/**
 * Extract time from Bork sales record
 */
function extractTimeFromSalesRecord(record: any): { hour: number; time: Date | null } {
  // Try extracted.time first
  if (record.extracted?.time) {
    const time = new Date(record.extracted.time);
    if (!isNaN(time.getTime())) {
      return { hour: time.getHours(), time };
    }
  }
  
  // Try rawApiResponse for ticket/order time
  const rawApiResponse = record.rawApiResponse;
  if (rawApiResponse) {
    // Check if it's an array of tickets
    const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : 
                   (rawApiResponse.Tickets || rawApiResponse.tickets || []);
    
    for (const ticket of tickets) {
      if (ticket?.Time || ticket?.time) {
        const time = new Date(ticket.Time || ticket.time);
        if (!isNaN(time.getTime())) {
          return { hour: time.getHours(), time };
        }
      }
      
      // Check orders
      const orders = ticket?.Orders || ticket?.orders || [];
      for (const order of orders) {
        if (order?.Time || order?.time) {
          const time = new Date(order.Time || order.time);
          if (!isNaN(time.getTime())) {
            return { hour: time.getHours(), time };
          }
        }
      }
    }
  }
  
  // Fallback to date (midday)
  const date = record.date instanceof Date ? record.date : new Date(record.date);
  return { hour: 12, time: date };
}

/**
 * Aggregate Keuken Analyses data for a date range
 */
export async function aggregateKeukenAnalysesData(
  startDate: Date,
  endDate: Date,
  locationId?: string | ObjectId,
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS
): Promise<{ aggregated: number; errors: string[] }> {
  const db = await getDatabase();
  const errors: string[] = [];
  
  // Load product catalog
  const productCatalog = await loadProductCatalog();
  
  // Build query
  const query: any = {
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  };
  
  if (locationId) {
    try {
      query.locationId = locationId instanceof ObjectId ? locationId : new ObjectId(locationId);
    } catch (e) {
      errors.push(`Invalid locationId: ${locationId}`);
      return { aggregated: 0, errors };
    }
  }
  
  // Fetch sales data from bork_raw_data
  const salesRecords = await db.collection('bork_raw_data')
    .find(query)
    .toArray();
  
  console.log(`[Keuken Aggregation] Found ${salesRecords.length} sales records`);
  
  // Fetch labor data from eitje_raw_data
  const laborQuery: any = {
    endpoint: 'time_registration_shifts',
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  };
  
  if (locationId) {
    try {
      const locationObjId = locationId instanceof ObjectId ? locationId : new ObjectId(locationId);
      const location = await db.collection('locations').findOne({ _id: locationObjId });
      
      if (location?.systemMappings) {
        const eitjeMapping = location.systemMappings.find((m: any) => m.system === 'eitje');
        if (eitjeMapping?.externalId) {
          laborQuery.environmentId = parseInt(eitjeMapping.externalId);
        } else {
          laborQuery.locationId = locationObjId;
        }
      } else {
        laborQuery.locationId = locationObjId;
      }
    } catch (e) {
      console.warn(`[Keuken Aggregation] Error setting location filter for labor:`, e);
    }
  }
  
  const laborRecords = await db.collection('eitje_raw_data')
    .find(laborQuery)
    .toArray();
  
  console.log(`[Keuken Aggregation] Found ${laborRecords.length} labor records`);
  
  // Load unified users for worker mapping
  const unifiedUsers = await db.collection('unified_users')
    .find({ isActive: true })
    .toArray();
  
  // Build mapping: Eitje userId -> unified user
  const eitjeToUnifiedMap = new Map<number, typeof unifiedUsers[0]>();
  unifiedUsers.forEach((user) => {
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
  
  console.log(`[Keuken Aggregation] Mapped ${eitjeToUnifiedMap.size} unified users`);
  
  // Group by date and location
  const groupedByDate = new Map<string, {
    locationId: ObjectId;
    date: Date;
    salesRecords: any[];
    laborRecords: any[];
  }>();
  
  // Group sales records
  salesRecords.forEach((record) => {
    const dateKey = record.date instanceof Date 
      ? record.date.toISOString().split('T')[0]
      : new Date(record.date).toISOString().split('T')[0];
    const locId = record.locationId?.toString() || 'unknown';
    const key = `${locId}_${dateKey}`;
    
    if (!groupedByDate.has(key)) {
      groupedByDate.set(key, {
        locationId: record.locationId,
        date: record.date instanceof Date ? record.date : new Date(record.date),
        salesRecords: [],
        laborRecords: [],
      });
    }
    
    groupedByDate.get(key)!.salesRecords.push(record);
  });
  
  // Group labor records
  laborRecords.forEach((record) => {
    const dateKey = record.date instanceof Date 
      ? record.date.toISOString().split('T')[0]
      : new Date(record.date).toISOString().split('T')[0];
    const locId = record.locationId?.toString() || 'unknown';
    const key = `${locId}_${dateKey}`;
    
    if (!groupedByDate.has(key)) {
      groupedByDate.set(key, {
        locationId: record.locationId,
        date: record.date instanceof Date ? record.date : new Date(record.date),
        salesRecords: [],
        laborRecords: [],
      });
    }
    
    groupedByDate.get(key)!.laborRecords.push(record);
  });
  
  // Process each day
  const aggregatedDocs: DailyDashboardKitchen[] = [];
  let aggregatedCount = 0;
  
  for (const [key, group] of groupedByDate.entries()) {
    try {
      const aggregated = await aggregateDay(group, productCatalog, eitjeToUnifiedMap, thresholds);
      aggregatedDocs.push(aggregated);
      aggregatedCount++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Error aggregating ${key}: ${errorMessage}`);
      console.error(`[Keuken Aggregation] Error aggregating ${key}:`, error);
    }
  }
  
  // Upsert aggregated documents
  if (aggregatedDocs.length > 0) {
    const bulkOps = aggregatedDocs.map((doc) => ({
      updateOne: {
        filter: {
          locationId: doc.locationId,
          date: doc.date,
          timeRange: doc.timeRange,
        },
        update: {
          $set: {
            ...doc,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));
    
    await db.collection('daily_dashboard_kitchen').bulkWrite(bulkOps);
    console.log(`[Kitchen Aggregation] Upserted ${aggregatedDocs.length} aggregated documents`);
  }
  
  return { aggregated: aggregatedCount, errors };
}

/**
 * Hook function to aggregate keuken analyses after data sync completes
 * Called automatically after Bork/Eitje sync operations
 */
export async function aggregateKeukenAnalysesOnDataSync(
  locationId: string | ObjectId | undefined,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; aggregated: number; errors: string[] }> {
  try {
    console.log('[Keuken Aggregation Hook] Triggering aggregation after data sync:', {
      locationId: locationId?.toString() || 'all',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const result = await aggregateKeukenAnalysesData(
      startDate,
      endDate,
      locationId
    );

    console.log('[Keuken Aggregation Hook] Aggregation complete:', {
      aggregated: result.aggregated,
      errors: result.errors.length,
    });

    return {
      success: result.errors.length === 0,
      aggregated: result.aggregated,
      errors: result.errors,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Keuken Aggregation Hook] Error:', error);
    return {
      success: false,
      aggregated: 0,
      errors: [errorMessage],
    };
  }
}

/**
 * Aggregate data for a single day
 */
async function aggregateDay(
  group: {
    locationId: ObjectId;
    date: Date;
    salesRecords: any[];
    laborRecords: any[];
  },
  productCatalog: Map<string, ProductCatalogItem>,
  eitjeToUnifiedMap: Map<number, any>,
  thresholds: WorkloadThresholds
): Promise<DailyDashboardKitchen> {
  // Extract product production from sales records
  const productMap = new Map<string, {
    productName: string;
    category?: string;
    totalQuantity: number;
    workloadLevel: "low" | "mid" | "high";
    workloadMinutes: number;
    totalWorkloadMinutes: number;
  }>();
  
  // Extract sales records from bork_raw_data structure
  const salesLines: Array<{
    productName: string;
    category?: string;
    quantity: number;
    time: Date;
    hour: number;
  }> = [];
  
  for (const record of group.salesRecords) {
    const rawApiResponse = record.rawApiResponse;
    if (!rawApiResponse) continue;
    
    const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : 
                   (rawApiResponse.Tickets || rawApiResponse.tickets || []);
    
    for (const ticket of tickets) {
      const orders = ticket?.Orders || ticket?.orders || [];
      
      for (const order of orders) {
        const orderLines = order?.Lines || order?.lines || [];
        const { hour, time } = extractTimeFromSalesRecord(record);
        
        for (const line of orderLines) {
          if (!line) continue;
          
          const productName = line.ProductName || line.productName || 
                             line.Product || line.product || 
                             record.extracted?.productName;
          const quantity = line.Qty || line.Quantity || line.quantity || 
                          record.extracted?.quantity || 0;
          const category = line.Category || line.category || 
                          record.extracted?.category;
          
          if (productName && quantity > 0) {
            salesLines.push({
              productName: String(productName),
              category: category ? String(category) : undefined,
              quantity: Number(quantity),
              time: time || group.date,
              hour,
            });
            
            // Update product map
            if (!productMap.has(productName)) {
              const { level, minutes } = getWorkloadLevel(productName, productCatalog, thresholds);
              productMap.set(productName, {
                productName: String(productName),
                category: category ? String(category) : undefined,
                totalQuantity: 0,
                workloadLevel: level,
                workloadMinutes: minutes,
                totalWorkloadMinutes: 0,
              });
            }
            
            const product = productMap.get(productName)!;
            product.totalQuantity += Number(quantity);
            product.totalWorkloadMinutes += Number(quantity) * product.workloadMinutes;
          }
        }
      }
    }
  }
  
  const productProduction = Array.from(productMap.values());
  
  // Extract worker activity from labor records
  const workerActivityMap = new Map<string, {
    unifiedUserId: ObjectId;
    workerName: string;
    teamName?: string;
    hours: Set<number>;
    isKitchenWorker: boolean;
  }>();
  
  for (const record of group.laborRecords) {
    const eitjeUserId = record.extracted?.userId || record.rawApiResponse?.user_id;
    const teamName = record.extracted?.teamName || 
                    record.extracted?.team_name ||
                    record.rawApiResponse?.team_name;
    const userName = record.extracted?.userName || 
                    record.extracted?.user_name ||
                    record.rawApiResponse?.user_name;
    const startTime = record.extracted?.start || record.rawApiResponse?.start;
    const endTime = record.extracted?.end || record.rawApiResponse?.end;
    
    if (!eitjeUserId || !userName) continue;
    
    const unifiedUser = eitjeToUnifiedMap.get(Number(eitjeUserId));
    if (!unifiedUser) continue;
    
    const isKitchen = isKitchenWorker(teamName);
    if (!isKitchen) continue; // Only kitchen workers
    
    const key = unifiedUser._id.toString();
    
    if (!workerActivityMap.has(key)) {
      workerActivityMap.set(key, {
        unifiedUserId: unifiedUser._id,
        workerName: userName,
        teamName: teamName ? String(teamName) : undefined,
        hours: new Set<number>(),
        isKitchenWorker: true,
      });
    }
    
    const worker = workerActivityMap.get(key)!;
    
    // Extract hours from start/end times
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const startHour = start.getHours();
        const endHour = end.getHours();
        
        for (let h = startHour; h <= endHour; h++) {
          worker.hours.add(h);
        }
      }
    }
  }
  
  const workerActivity = Array.from(workerActivityMap.values()).map((w) => ({
    unifiedUserId: w.unifiedUserId,
    workerName: w.workerName,
    teamName: w.teamName,
    hours: Array.from(w.hours).sort((a, b) => a - b),
    isKitchenWorker: true,
  }));
  
  // Calculate workload by hour
  const workloadByHourMap = new Map<number, {
    hour: number;
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: Set<ObjectId>;
  }>();
  
  for (const line of salesLines) {
    const hour = line.hour;
    
    if (!workloadByHourMap.has(hour)) {
      workloadByHourMap.set(hour, {
        hour,
        totalWorkloadMinutes: 0,
        productCount: 0,
        activeWorkers: new Set<ObjectId>(),
      });
    }
    
    const hourData = workloadByHourMap.get(hour)!;
    const product = productMap.get(line.productName);
    
    if (product) {
      hourData.totalWorkloadMinutes += line.quantity * product.workloadMinutes;
      hourData.productCount += line.quantity;
    }
    
    // Add active workers for this hour
    workerActivity.forEach((worker) => {
      if (worker.hours.includes(hour)) {
        hourData.activeWorkers.add(worker.unifiedUserId);
      }
    });
  }
  
  const workloadByHour = Array.from(workloadByHourMap.values()).map((h) => ({
    hour: h.hour,
    totalWorkloadMinutes: h.totalWorkloadMinutes,
    productCount: h.productCount,
    activeWorkers: h.activeWorkers.size,
  }));
  
  // Calculate workload by worker
  const workloadByWorkerMap = new Map<string, {
    unifiedUserId: ObjectId;
    workerName: string;
    teamName?: string;
    totalWorkloadMinutes: number;
    productCount: number;
  }>();
  
  for (const line of salesLines) {
    const hour = line.hour;
    
    // Find workers active during this hour
    workerActivity.forEach((worker) => {
      if (worker.hours.includes(hour)) {
        const key = worker.unifiedUserId.toString();
        
        if (!workloadByWorkerMap.has(key)) {
          workloadByWorkerMap.set(key, {
            unifiedUserId: worker.unifiedUserId,
            workerName: worker.workerName,
            teamName: worker.teamName,
            totalWorkloadMinutes: 0,
            productCount: 0,
          });
        }
        
        const workerData = workloadByWorkerMap.get(key)!;
        const product = productMap.get(line.productName);
        
        if (product) {
          workerData.totalWorkloadMinutes += line.quantity * product.workloadMinutes;
          workerData.productCount += line.quantity;
        }
      }
    });
  }
  
  const workloadByWorker = Array.from(workloadByWorkerMap.values());
  
  // Calculate workload by range
  const workloadByRangeMap = new Map<string, {
    timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks";
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: Set<ObjectId>;
  }>();
  
  for (const line of salesLines) {
    const timeRange = getTimeRange(line.hour);
    
    if (timeRange === "other") continue;
    
    if (!workloadByRangeMap.has(timeRange)) {
      workloadByRangeMap.set(timeRange, {
        timeRange: timeRange as "lunch" | "dinner" | "afternoon-drinks" | "after-drinks",
        totalWorkloadMinutes: 0,
        productCount: 0,
        activeWorkers: new Set<ObjectId>(),
      });
    }
    
    const rangeData = workloadByRangeMap.get(timeRange)!;
    const product = productMap.get(line.productName);
    
    if (product) {
      rangeData.totalWorkloadMinutes += line.quantity * product.workloadMinutes;
      rangeData.productCount += line.quantity;
    }
    
    // Add active workers for this range
    workerActivity.forEach((worker) => {
      if (worker.hours.some((h) => {
        const range = getTimeRange(h);
        return range === timeRange;
      })) {
        rangeData.activeWorkers.add(worker.unifiedUserId);
      }
    });
  }
  
  const workloadByRange = Array.from(workloadByRangeMap.values()).map((r) => ({
    timeRange: r.timeRange,
    totalWorkloadMinutes: r.totalWorkloadMinutes,
    productCount: r.productCount,
    activeWorkers: r.activeWorkers.size,
  }));
  
  // Calculate KPIs
  const totalProductsProduced = productProduction.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalWorkloadMinutes = productProduction.reduce((sum, p) => sum + p.totalWorkloadMinutes, 0);
  
  // Find peak hour
  let peakHour = "12:00";
  let maxWorkload = 0;
  workloadByHour.forEach((h) => {
    if (h.totalWorkloadMinutes > maxWorkload) {
      maxWorkload = h.totalWorkloadMinutes;
      peakHour = `${h.hour.toString().padStart(2, '0')}:00`;
    }
  });
  
  // Find peak time range
  let peakTimeRange: "lunch" | "dinner" = "lunch";
  let maxRangeWorkload = 0;
  workloadByRange.forEach((r) => {
    if (r.totalWorkloadMinutes > maxRangeWorkload && (r.timeRange === "lunch" || r.timeRange === "dinner")) {
      maxRangeWorkload = r.totalWorkloadMinutes;
      peakTimeRange = r.timeRange;
    }
  });
  
  // Calculate average workload per hour
  const hoursWithData = workloadByHour.filter((h) => h.totalWorkloadMinutes > 0).length;
  const averageWorkloadPerHour = hoursWithData > 0 ? totalWorkloadMinutes / hoursWithData : 0;
  
  // Calculate average workers per hour
  const totalWorkerHours = workloadByHour.reduce((sum, h) => sum + h.activeWorkers, 0);
  const averageWorkersPerHour = hoursWithData > 0 ? totalWorkerHours / hoursWithData : 0;
  
  // Count unique orders (approximate from sales lines)
  const totalOrders = new Set(salesLines.map((l) => `${l.time.getTime()}_${l.productName}`)).size;
  
  const kpis = {
    totalOrders,
    totalProductsProduced,
    totalWorkloadMinutes,
    averageWorkloadPerHour,
    peakHour,
    peakTimeRange,
    averageWorkersPerHour,
  };
  
  return {
    locationId: group.locationId,
    date: group.date,
    timeRange: "all",
    productProduction,
    workerActivity,
    workloadByHour,
    workloadByWorker,
    workloadByRange,
    kpis,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

