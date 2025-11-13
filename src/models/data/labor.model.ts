/**
 * Data Labor Model Layer
 * Type definitions for labor data pages
 */

export interface LaborHoursRecord {
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
  team_name?: string;
  shift_start?: string;
  shift_end?: string;
  hours_worked?: number;
  breaks_minutes?: number;
}

export interface LaborQueryParams {
  endpoint: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
  environmentId?: string;
}

export interface LaborResponse {
  success: boolean;
  records: LaborHoursRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface Location {
  id: string;
  name: string;
}




