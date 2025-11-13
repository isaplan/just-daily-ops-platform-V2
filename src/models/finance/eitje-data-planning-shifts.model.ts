/**
 * Finance Eitje Data Planning Shifts Model Layer
 * Type definitions for Eitje processed planning shifts data
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface PlanningShiftRecord {
  id: string;
  eitje_id?: number | null;
  date: string;
  environment_id?: number | null;
  environment_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  planned_hours?: number | null;
  hours?: number | null;
  total_hours?: number | null;
  break_minutes?: number | null;
  break_minutes_planned?: number | null;
  planned_cost?: number | null;
  wage_cost?: number | null;
  status?: string | null;
  shift_type?: string | null;
  type_name?: string | null;
  notes?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PlanningShiftsDataResponse {
  records: PlanningShiftRecord[];
  total: number;
}

export interface PlanningShiftsQueryParams {
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



