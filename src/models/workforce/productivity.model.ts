/**
 * Productivity Model Layer
 * Type definitions and interfaces for labor productivity data
 */

export interface ProductivityRecord {
  id: string;
  date: string;
  locationId: string;
  locationName?: string;
  teamId?: string;
  teamName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
}

export interface ProductivityAggregation {
  period: string; // "2025-01-15" (day), "2025-W03" (week), "2025-01" (month)
  periodType: "day" | "week" | "month";
  locationId?: string;
  locationName?: string;
  teamId?: string;
  teamName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  recordCount: number;
}

export interface ProductivityFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  locationId?: string;
  teamId?: string;
  teamName?: string;
  periodType?: "day" | "week" | "month"; // Aggregation period
}

export interface ProductivityQueryParams extends ProductivityFilters {
  page?: number;
  limit?: number;
}

export interface ProductivityResponse {
  success: boolean;
  records: ProductivityAggregation[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface TeamOption {
  value: string;
  label: string;
}


