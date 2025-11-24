/**
 * Labor Cost Model
 * Data structures and types for labor cost calculations
 */

export interface LaborCostRecord {
  id: string;
  date: string;
  user_id?: number;
  user_name?: string | null;
  environment_id?: number | null;
  environment_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  hours_worked: number;
  hourly_rate?: number | null;
  hourly_cost?: number | null;
  labor_cost?: number | null;
  // Aggregated costs per time period
  cost_per_hour?: number;
  cost_per_day?: number;
  cost_per_week?: number;
  cost_per_month?: number;
  cost_per_year?: number;
}

export interface LaborCostFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  locationId?: string;
  teamName?: string;
  userId?: number;
  typeName?: string | null; // null = worked hours, string = specific type
}

export interface LaborCostQueryParams extends LaborCostFilters {
  page?: number;
  limit?: number;
}

export interface LaborCostResponse {
  success: boolean;
  records: LaborCostRecord[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export type TimePeriodFilter = "year" | "month" | "week" | "day";




