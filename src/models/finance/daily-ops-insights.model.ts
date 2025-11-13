/**
 * Finance Daily Ops Insights Model Layer
 * Type definitions for cross-correlation insights and analysis
 */

export interface Location {
  id: string;
  name: string;
  color: string;
}

export interface TimePeriodPreset {
  label: string;
  getRange: () => {
    from: Date;
    to: Date;
    label: string;
  };
}

export interface CrossCorrelationInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  type: 'revenue' | 'labor' | 'productivity' | 'anomaly' | 'opportunity';
  data: {
    metric: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  correlation: {
    factor1: string;
    factor2: string;
    strength: number; // 0-1
  };
  recommendation: string;
  location: string;
}

export interface PeriodAnalysis {
  period: string;
  totalRevenue: number;
  totalHours: number;
  totalEmployees: number;
  avgRevenuePerHour: number;
  avgRevenuePerEmployee: number;
  topPerformingLocation: string;
  worstPerformingLocation: string;
  anomalies: CrossCorrelationInsight[];
  opportunities: CrossCorrelationInsight[];
  correlations: CrossCorrelationInsight[];
  dataPoints: number;
  avgDailyRevenue: number;
  avgDailyHours: number;
}

export interface ComparisonMetrics {
  revenueChange: number;
  hoursChange: number;
  efficiencyChange: number;
  productivityChange: number;
}

export interface ComparisonAnalysis {
  current: PeriodAnalysis;
  previous?: PeriodAnalysis;
  comparison: ComparisonMetrics;
}

export interface InsightsQueryParams {
  locationId?: string;
  startDate: string;
  endDate: string;
  compareWithPrevious?: boolean;
}

export interface RawDataRecord {
  date: string;
  environment_id?: number;
  location_id?: string;
  [key: string]: unknown;
}

export interface LaborRecord extends RawDataRecord {
  total_hours_worked?: number;
  employee_count?: number;
  total_wage_cost?: number;
}

export interface RevenueRecord extends RawDataRecord {
  total_revenue?: number;
  transaction_count?: number;
}

export interface SalesRecord extends RawDataRecord {
  revenue?: number;
  transactions?: number;
}

export interface InsightGenerationData {
  labor: LaborRecord[];
  revenue: RevenueRecord[];
  sales: SalesRecord[];
  totalRevenue: number;
  totalHours: number;
  totalEmployees: number;
  avgRevenuePerHour: number;
  avgRevenuePerEmployee: number;
}

export type LocationKey = "total" | "kinsbergen" | "barbea" | "lamour";
export type TimePeriodKey = "lastMonth" | "last3Months" | "last6Months" | "thisYear" | "lastYear" | "september2024";



