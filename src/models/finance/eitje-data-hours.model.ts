/**
 * Finance Eitje Data Hours Model Layer
 * Type definitions for Eitje processed hours data
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface ProcessedShiftRecord {
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
  hours_worked: number;
  break_minutes: number;
  wage_cost?: number | null;
  hourly_rate?: number | null;
  status?: string | null;
  shift_type?: string | null;
  type_name?: string | null;
  notes?: string | null;
  remarks?: string | null;
  updated_at?: string | null;
}

export interface ProcessedShiftsDataResponse {
  records: ProcessedShiftRecord[];
  total: number;
}

export interface ProcessedShiftsQueryParams {
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



