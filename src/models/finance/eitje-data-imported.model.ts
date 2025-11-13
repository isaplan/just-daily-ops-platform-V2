/**
 * Finance Eitje Data Imported Model Layer
 * Type definitions for Eitje raw time registration data
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

export interface User {
  eitje_user_id: number;
  raw_data?: {
    name?: string;
    firstName?: string;
    [key: string]: unknown;
  };
}

export interface TimeRegistrationRecord {
  id: string;
  eitje_id?: number | null;
  date: string;
  user_id?: number | null;
  team_id?: number | null;
  environment_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  hours_worked?: number | null;
  hours?: number | null;
  total_hours?: number | null;
  break_minutes?: number | null;
  breaks?: number | null;
  break_minutes_actual?: number | null;
  wage_cost?: number | null;
  status?: string | null;
  skill_set?: string | null;
  shift_type?: string | null;
  notes?: string | null;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Enriched fields
  environment_name?: string | null;
  team_name?: string | null;
  user_name?: string | null;
  raw_data_full?: Record<string, unknown> | null;
}

export interface TimeRegistrationDataResponse {
  records: TimeRegistrationRecord[];
  total: number;
}

export interface TimeRegistrationQueryParams {
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



