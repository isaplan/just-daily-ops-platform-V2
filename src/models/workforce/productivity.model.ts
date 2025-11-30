/**
 * Productivity Model Layer
 * Type definitions and interfaces for labor productivity data
 */

export interface ProductivityRecord {
  id: string;
  date: string;
  locationId: string;
  locationName?: string;
  teamId?: string;
  teamName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
}

export interface ProductivityAggregation {
  period: string; // "2025-01-15" (day), "2025-W03" (week), "2025-01" (month), "2025" (year), "2025-01-15T10" (hour)
  periodType: "year" | "month" | "week" | "day" | "hour";
  locationId?: string;
  locationName?: string;
  teamId?: string;
  teamName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  recordCount: number;
  // Enhanced fields
  division?: 'Food' | 'Beverage' | 'Management' | 'Other' | 'All';
  teamCategory?: 'Kitchen' | 'Service' | 'Management' | 'Other';
  subTeam?: string;
  workerId?: string;
  workerName?: string;
  ordersCount?: number;
  salesCount?: number;
  productivityScore?: number; // revenue/hour (alias for revenuePerHour)
  goalStatus?: 'bad' | 'not_great' | 'ok' | 'great';
}

export interface ProductivityFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  locationId?: string;
  teamId?: string;
  teamName?: string;
  periodType?: "day" | "week" | "month"; // Aggregation period
}

export interface ProductivityQueryParams extends ProductivityFilters {
  page?: number;
  limit?: number;
}

export interface ProductivityResponse {
  success: boolean;
  records: ProductivityAggregation[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface TeamOption {
  value: string;
  label: string;
}

/**
 * Productivity by Division (Food/Beverage/Total)
 */
export interface ProductivityByDivision {
  division: 'Food' | 'Beverage' | 'Management' | 'Other' | 'All';
  period: string;
  periodType: "year" | "month" | "week" | "day" | "hour";
  locationId?: string;
  locationName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  goalStatus?: 'bad' | 'not_great' | 'ok' | 'great';
}

/**
 * Productivity by Team Category (Kitchen/Service/Management/Other with sub-teams)
 */
export interface ProductivityByTeamCategory {
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other';
  subTeam?: string;
  period: string;
  periodType: "year" | "month" | "week" | "day" | "hour";
  locationId?: string;
  locationName?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  goalStatus?: 'bad' | 'not_great' | 'ok' | 'great';
  // Sub-team breakdown
  subTeams?: Array<{
    subTeam: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    revenuePerHour: number;
    laborCostPercentage: number;
  }>;
}

/**
 * Per-worker productivity metrics
 */
export interface WorkerProductivity {
  workerId: string;
  workerName: string;
  period: string;
  periodType: "year" | "month" | "week" | "day" | "hour";
  locationId?: string;
  locationName?: string;
  teamCategory?: 'Kitchen' | 'Service' | 'Management' | 'Other';
  subTeam?: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number; // Current revenue (will be absolute or relative based on tab)
  revenuePerHour: number; // Calculated from totalRevenue
  laborCostPercentage: number; // Calculated from totalRevenue
  // New fields for dual revenue tracking
  absoluteRevenue?: number; // Direct waiter revenue (service staff only)
  relativeRevenue?: number; // Proportional revenue (all staff)
  absoluteRevenuePerHour?: number; // absoluteRevenue / totalHoursWorked
  relativeRevenuePerHour?: number; // relativeRevenue / totalHoursWorked
  ordersCount?: number;
  salesCount?: number;
  productivityScore: number;
  goalStatus?: 'bad' | 'not_great' | 'ok' | 'great';
}

/**
 * Productivity goals and thresholds
 */
export interface ProductivityGoals {
  // Productivity thresholds (revenue/hour)
  productivityThresholds: {
    bad: number; // Below this value
    notGreat: { min: number; max: number }; // 45-55
    ok: { min: number; max: number }; // 55-65
    great: number; // 65+
  };
  // Labor cost % thresholds
  laborCostThresholds: {
    great: number; // Below 30%
    ok: { min: number; max: number }; // 30-32.5%
    notGood: number; // Above 32.5%
  };
}

/**
 * Enhanced productivity query parameters
 */
export interface ProductivityEnhancedFilters extends ProductivityFilters {
  division?: 'Food' | 'Beverage' | 'Management' | 'Other' | 'All';
  teamCategory?: 'Kitchen' | 'Service' | 'Management' | 'Other';
  subTeam?: string;
  workerId?: string;
  periodType?: "year" | "month" | "week" | "day" | "hour";
}

export interface ProductivityEnhancedQueryParams extends ProductivityEnhancedFilters {
  page?: number;
  limit?: number;
}

/**
 * Missing wage worker info (for display/warnings)
 */
export interface MissingWageWorker {
  workerId: string;
  workerName: string;
  eitjeUserId: number;
  locationId: string;
  locationName: string;
  period: string;
}

/**
 * Enhanced productivity response
 */
export interface ProductivityEnhancedResponse {
  success: boolean;
  records: ProductivityAggregation[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
  // Aggregated summaries
  byDivision?: ProductivityByDivision[];
  byTeamCategory?: ProductivityByTeamCategory[];
  byWorker?: WorkerProductivity[];
  missingWageWorkers?: MissingWageWorker[]; // Workers without hourly wages (skipped from calculations)
  debugInfo?: {
    collectionsQueried: string[];
    dataFound: {
      laborRecords: number;
      salesRecords: number;
      locationRecords: number;
      divisionRecords: number;
      teamCategoryRecords: number;
      workerRecords: number;
    };
    sampleLaborRecord: {
      date: any;
      locationId: string | null;
      totalHoursWorked: number;
      totalWageCost: number;
      hasTeamStats: boolean;
      teamStatsCount: number;
      hasHoursByDay: boolean;
      hoursByDayCount: number;
    } | null;
  };
}




