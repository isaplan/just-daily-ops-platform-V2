/**
 * Workers V2 Model Layer
 * Type definitions and interfaces for worker profiles data
 * Uses GraphQL for data fetching
 */

export interface WorkerProfile {
  id: string;
  eitjeUserId: number;
  userName?: string | null;
  teamName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  contractType?: string | null;
  contractHours?: number | null;
  hourlyWage?: number | null;
  wageOverride: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WorkerProfilesFilters {
  year: number;
  month?: number | null;
  day?: number | null;
  locationId?: string;
  activeOnly?: boolean | null; // true = active, false = inactive, null = all
}

export interface WorkerProfilesPagination {
  page: number;
  limit: number;
}

export interface WorkerProfilesQueryParams extends WorkerProfilesFilters, WorkerProfilesPagination {}

export interface WorkerProfilesResponse {
  success: boolean;
  records: WorkerProfile[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface WorkerProfileInput {
  eitjeUserId: number;
  locationId?: string | null;
  contractType?: string | null;
  contractHours?: number | null;
  hourlyWage?: number | null;
  wageOverride?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
}

export interface LocationOption {
  value: string;
  label: string;
}

export type SortOrder = "asc" | "desc" | null;


