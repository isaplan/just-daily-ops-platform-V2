/**
 * Finance Eitje Data Workers Model Layer
 * Type definitions for Eitje workers data
 */

export interface WorkerRecord {
  id: string;
  eitje_id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  employee_number?: string | null;
  hire_date?: string | null;
  is_active?: boolean | null;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkersDataResponse {
  records: WorkerRecord[];
  total: number;
}

export interface WorkersQueryParams {
  page: number;
  itemsPerPage: number;
}



