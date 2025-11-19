/**
 * Locations & Teams Model
 * Data structures and types for worker profiles with location/team filtering
 */

// Worker profile with team memberships
export interface WorkerProfile {
  id: string | number; // MongoDB ObjectId (string) or legacy integer ID
  eitje_user_id: number;
  user_name?: string;
  location_id?: string;
  location_name?: string;
  contract_type?: 'full_time' | 'part_time' | 'contractor' | 'temporary';
  contract_hours?: number;
  hourly_wage?: number;
  wage_override?: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at?: string;
  // Team memberships (workers can be in multiple teams)
  teams?: TeamMembership[];
}

// Team membership for workers
export interface TeamMembership {
  team_id: string;
  team_name: string;
  team_type?: string;
  is_active: boolean;
}

// Location data
export interface Location {
  id: string;
  eitje_id?: string;
  name: string;
  description?: string;
  city?: string;
  country?: string;
  is_active: boolean;
}

// Team data
export interface Team {
  id: string;
  eitje_id?: string;
  name: string;
  description?: string;
  environment_id?: string;
  team_type?: string;
  is_active: boolean;
}

// Filter state for the page
export interface FilterState {
  year: number;
  month: number | null;
  location: string | null; // 'all' or location ID
  team: string | null; // 'all' or team ID
  contractType: string | null; // 'all' or contract type
}

// Active filter labels for title display
export interface ActiveFilterLabels {
  location?: string;
  team?: string;
  contractType?: string;
}

// API response for workers with filters
export interface WorkersFilteredResponse {
  records: WorkerProfile[];
  total: number;
  page: number;
  limit: number;
}

// Filter options for dropdowns
export interface FilterOptions {
  locations: Location[];
  teams: Team[];
  contractTypes: { value: string; label: string }[];
}

// Contract type options (static)
export const CONTRACT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'temporary', label: 'Temporary' },
] as const;

