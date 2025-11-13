/**
 * Settings Bork API Model Layer
 * Type definitions for Bork API settings
 */

export interface ApiConnection {
  id: string;
  location: string;
  locationId: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
}

export interface ConnectionTestResult {
  locationId: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  testedAt?: string;
  timestamp?: string;
}

export interface ValidationResult {
  locationId: string;
  locationName: string;
  expectedDates: string[];
  actualDates: string[];
  missingDates: string[];
  extraDates: string[];
  totalExpected: number;
  totalActual: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'missing';
  monthlyBreakdown: {
    [month: string]: {
      expected: number;
      actual: number;
      missing: string[];
      completionPercentage: number;
    };
  };
}

export interface RevenueMismatch {
  date: string;
  referenceRevenue: number;
  databaseRevenue: number;
  difference: number;
  percentageDiff: number;
  severity: 'exact' | 'minor' | 'major';
}

export interface RevenueValidationResult {
  locationId: string;
  locationName: string;
  matchedField: 'incl_vat' | 'excl_vat';
  mismatches: RevenueMismatch[];
  totalDates: number;
  exactMatches: number;
  minorMismatches: number;
  majorMismatches: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface MonthlySyncStatus {
  hasData: boolean;
  recordCount: number;
}

export interface SyncParams {
  locationId: string;
  startDate: string;
  endDate: string;
}

export interface ProcessParams {
  locationId: string;
  startDate: string;
  endDate: string;
}

