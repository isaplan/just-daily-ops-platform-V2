/**
 * Keuken Analyses Model
 * Type definitions for Daily Ops Keuken Analyses page
 */

export interface WorkloadThresholds {
  low: number; // minutes (default: 2.5)
  mid: number; // minutes (default: 5)
  high: number; // minutes (default: 10)
}

export type WorkloadLevel = "low" | "mid" | "high";

export interface ProductProduction {
  productName: string;
  category?: string;
  totalQuantity: number;
  workloadLevel: WorkloadLevel;
  workloadMinutes: number;
  totalWorkloadMinutes: number; // quantity * workloadMinutes
}

export interface WorkerActivity {
  workerId: string;
  workerName: string;
  teamName?: string;
  date: string;
  hour: number;
  timeRange: "lunch" | "dinner" | "other";
  isActive: boolean;
}

export interface WorkloadByHour {
  hour: number;
  date: string;
  totalWorkloadMinutes: number;
  productCount: number;
  activeWorkers: number;
}

export interface WorkloadByWorker {
  workerId: string;
  workerName: string;
  teamName?: string;
  date: string;
  timeRange: "lunch" | "dinner" | "all";
  totalWorkloadMinutes: number;
  productCount: number;
}

export interface WorkloadByRange {
  date: string;
  timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks" | "all";
  totalWorkloadMinutes: number;
  productCount: number;
  activeWorkers: number;
}

export interface WorkloadByDay {
  date: string;
  totalWorkloadMinutes: number;
  productCount: number;
  activeWorkers: number;
  lunchWorkload: number;
  dinnerWorkload: number;
}

export interface KeukenAnalysesKPIs {
  totalOrders: number;
  totalProductsProduced: number;
  totalWorkloadMinutes: number;
  averageWorkloadPerHour: number;
  peakHour: string;
  peakTimeRange: "lunch" | "dinner";
  averageWorkersPerHour: number;
}

export interface KeukenAnalysesChartData {
  date: string;
  orders: number;
  totalWorkloadMinutes: number;
  activeWorkers: number;
  lunchWorkload: number;
  dinnerWorkload: number;
}

export interface KeukenAnalysesData {
  kpis: KeukenAnalysesKPIs;
  chartData: KeukenAnalysesChartData[];
  productProduction: ProductProduction[];
  workloadByHour: WorkloadByHour[];
  workloadByWorker: WorkloadByWorker[];
  workloadByRange: WorkloadByRange[];
  workloadByDay: WorkloadByDay[];
  kitchenWorkers: KitchenWorker[]; // Available kitchen workers for filtering
}

export interface KitchenWorker {
  workerId: string;
  workerName: string;
  teamName?: string;
}

export type TimeRangeFilter = "all" | "lunch" | "afternoon-drinks" | "dinner" | "after-drinks";

export interface KeukenAnalysesQueryParams {
  startDate: string;
  endDate: string;
  locationId?: string;
  workloadThresholds?: WorkloadThresholds;
  timeRangeFilter?: TimeRangeFilter;
  selectedWorkerId?: string; // Filter by specific worker
}

