/**
 * Labor Planning Model Layer
 * Type definitions for Labor Planning page
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface PlanningRecord {
  id?: string | number;
  eitje_id?: number;
  date?: string;
  user_id?: number;
  user_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  environment_id?: number;
  environment_name?: string;
  team_id?: number;
  team_name?: string | null;
  start_time?: string;
  start_datetime?: string;
  start?: string;
  end_time?: string;
  end_datetime?: string;
  end?: string;
  planned_hours?: number;
  hours_planned?: number;
  hours?: number;
  total_hours?: number;
  break_minutes?: number;
  breaks?: number;
  break_minutes_planned?: number;
  planned_cost?: number;
  wage_cost?: number;
  confirmed?: boolean;
  cancelled?: boolean;
  status?: string;
  shift_type?: string;
  skill_set?: string;
  notes?: string;
  remarks?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface PlanningDataResponse {
  records: PlanningRecord[];
  total: number;
}

export interface PlanningQueryParams {
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  startDate: string;
  endDate: string;
  currentPage: number;
  itemsPerPage: number;
  environmentIds: number[] | null;
}



