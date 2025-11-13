/**
 * Finance Eitje Data Labor Costs Model Layer
 * Type definitions for Eitje aggregated labor costs data
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface Environment {
  id: number;
  raw_data?: {
    name?: string;
    [key: string]: unknown;
  };
}

export interface Team {
  id: number;
  raw_data?: {
    name?: string;
    [key: string]: unknown;
  };
}

export interface LaborCostRecord {
  id: string;
  date: string;
  environment_id?: number | null;
  environment_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  total_wage_cost?: number | null;
  total_hours_worked?: number | null;
  total_breaks_minutes?: number | null;
  employee_count?: number | null;
  shift_count?: number | null;
  avg_hours_per_employee?: number | null;
  avg_wage_per_hour?: number | null;
  updated_at?: string | null;
}

export interface LaborCostsDataResponse {
  records: LaborCostRecord[];
  total: number;
}

export interface LaborCostsQueryParams {
  startDate: string;
  endDate: string;
  environmentId?: string;
  environmentIds?: number[] | null;
  page: number;
  itemsPerPage: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}



