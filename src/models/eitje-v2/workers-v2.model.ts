/**
 * Workers V2 Model Layer
 * Type definitions and interfaces for workers-v2 data
 */

export interface WorkerProfile {
  id?: number;
  eitje_user_id: number;
  location_id?: string;
  contract_type?: string;
  contract_hours?: number;
  hourly_wage?: number;
  wage_override: boolean;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EditingProfile extends WorkerProfile {
  // Enriched fields from API
  user_name?: string;
  location_name?: string; // From unified locations table
  team_name?: string; // From processed_v2
}

export interface WorkersV2Filters {
  year?: number;
  month?: number | null;
  day?: number | null;
  locationId?: string;
  activeOnly?: boolean | null; // true = active, false = inactive, null = all
}

export interface WorkersV2Pagination {
  page: number;
  limit: number;
}

export interface WorkersV2QueryParams extends WorkersV2Filters, WorkersV2Pagination {}

export interface WorkersV2Response {
  success: boolean;
  records: EditingProfile[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export type SortOrder = "asc" | "desc" | null;

