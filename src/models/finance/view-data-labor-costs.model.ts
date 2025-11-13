/**
 * Finance View Data Labor Costs Model Layer
 * Type definitions for labor costs data view
 */

export interface LaborCostRecord {
  id: string;
  date: string;
  environment_id?: number | null;
  team_id?: number | null;
  total_hours_worked?: number | null;
  total_wage_cost?: number | null;
  avg_wage_per_hour?: number | null;
  employee_count?: number | null;
}

export interface LaborCostsTotals {
  totalCost: number;
  totalHours: number;
  avgCostPerHour: number;
}

export interface LaborCostsDataResponse {
  records: LaborCostRecord[];
  total: number;
  totalPages: number;
  totals: LaborCostsTotals;
}

export interface LaborCostsQueryParams {
  page: number;
  limit: number;
  dateFilter?: string;
}



