/**
 * Finance Labor Analytics Model Layer
 * Type definitions for labor analytics data
 */

export interface Location {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface LaborData {
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  productivity: number;
  avgRate: number;
  efficiency: number;
  peakHours: number;
  activeStaff: number;
}

export interface LaborQueryParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface LaborKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export interface DateRange {
  from: Date;
  to: Date;
}



