/**
 * Hours V2 Model Layer
 * Type definitions and interfaces for hours-v2 data
 */

export interface ProcessedHoursRecord {
  id: number;
  eitje_id: number;
  date: string;
  user_id: number;
  user_name: string | null;
  environment_id: number | null;
  environment_name: string | null;
  team_id: number | null;
  team_name: string | null;
  start: string | null;
  end: string | null;
  break_minutes: number | null;
  wage_cost: number | null;
  type_name: string | null;
  shift_type: string | null;
  remarks: string | null;
  approved: boolean | null;
  planning_shift_id: number | null;
  exported_to_hr_integration: boolean | null;
  updated_at: string | null;
  created_at: string | null;
}

export interface AggregatedHoursRecord {
  id: number;
  date: string;
  user_id: number;
  user_name: string | null;
  environment_id: number | null;
  environment_name: string | null;
  team_id: number | null;
  team_name: string | null;
  hours_worked: number;
  hourly_rate: number | null;
  hourly_cost: number | null;
  labor_cost: number | null;
  shift_count: number;
  total_breaks_minutes: number | null;
  updated_at: string | null;
  created_at: string | null;
}

export interface HoursV2Filters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  environmentId?: number;
  teamId?: number;
  teamName?: string; // Filter by team name (e.g., "Keuken", "Bediening")
  userId?: number;
  typeName?: string; // Filter by type_name (e.g., "verlof", "ziek", "Gewerkte Uren")
}

export interface HoursV2Pagination {
  page: number;
  limit: number;
}

export interface HoursV2QueryParams extends HoursV2Filters, HoursV2Pagination {}

export interface HoursV2Response {
  success: boolean;
  records: (ProcessedHoursRecord | AggregatedHoursRecord)[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export type HoursV2Tab = "processed" | "aggregated";

export interface HoursV2DateRange {
  start: Date;
  end: Date;
}

