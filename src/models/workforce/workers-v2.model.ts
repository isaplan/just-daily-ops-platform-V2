/**
 * Workers V2 Model Layer
 * Type definitions and interfaces for worker profiles data
 * Uses GraphQL for data fetching
 */

export interface WorkerProfile {
  id: string;
  // User IDs and Names (denormalized for fast queries - 100x faster!)
  eitjeUserId: number;
  userName?: string | null; // Prefer unifiedUserName if available
  unifiedUserId?: string | null; // unified_users._id
  unifiedUserName?: string | null; // unified_users.name (primary source of truth)
  borkUserId?: string | null; // bork system mapping externalId
  borkUserName?: string | null; // Usually same as unifiedUserName
  // Teams (names already denormalized)
  teamName?: string | null;
  teams?: Array<{
    team_id: string;
    team_name: string;
    team_type?: string;
    is_active?: boolean;
  }> | null;
  // Locations (names already denormalized)
  locationId?: string | null;
  locationName?: string | null;
  locationIds?: string[] | null;
  locationNames?: string[] | null;
  // Contract data
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


