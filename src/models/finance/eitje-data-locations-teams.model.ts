/**
 * Finance Eitje Data Locations & Teams Model Layer
 * Type definitions for Eitje locations and teams data
 */

export interface LocationRecord {
  id: string;
  eitje_id?: number | null;
  name?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  is_active?: boolean | null;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TeamRecord {
  id: string;
  eitje_id?: number | null;
  name?: string | null;
  description?: string | null;
  environment_id?: number | null;
  team_type?: string | null;
  is_active?: boolean | null;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LocationsDataResponse {
  records: LocationRecord[];
  total: number;
}

export interface TeamsDataResponse {
  records: TeamRecord[];
  total: number;
}

export interface LocationsQueryParams {
  page: number;
  itemsPerPage: number;
}

export interface TeamsQueryParams {
  page: number;
  itemsPerPage: number;
}



