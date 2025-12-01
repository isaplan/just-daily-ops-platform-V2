/**
 * Eitje Data Check ViewModel
 * 
 * Fetches and manages verification data from Excel files vs aggregated database
 */

import { useQuery } from '@tanstack/react-query';

export interface VerificationSummary {
  totalVerified: number;
  matchCount: number;
  discrepancyCount: number;
}

export interface FinanceVerification {
  files: number;
  records: number;
  filteredRecords?: number;
  verifications: Array<{
    location: string;
    locationId: string;
    date: string;
    excelRevenue: number;
    dbRevenue: number;
    difference: number;
    percentDiff: string;
    isMatch: boolean;
    dbHours: number;
    dbWageCost: number;
    dbRevenuePerHour: number;
    dbLaborCostPercentage: number;
    // Productivity verification metrics
    excelHours?: number;
    excelWageCost?: number;
    excelRevenuePerHour?: number;
    excelLaborCostPercentage?: number;
    revenuePerHourDifference?: number;
    revenuePerHourPercentDiff?: string;
    laborCostPercentDifference?: string;
    revenueMatch?: boolean;
    revenuePerHourMatch?: boolean;
    laborCostPercentMatch?: boolean;
  }>;
  discrepancies: Array<{
    type: string;
    location?: string;
    locationId?: string;
    date?: string;
    excelRevenue?: number;
    dbRevenue?: number | null;
    difference?: number;
    percentDiff?: string;
    message: string;
  }>;
}

export interface HoursVerification {
  files: number;
  records: number;
  filteredRecords?: number;
  verifications: Array<{
    location: string;
    locationId: string;
    date: string;
    excelHours: number;
    dbHours: number;
    difference: number;
    percentDiff: string;
    isMatch: boolean;
    workerCount: number;
    teamCount: number;
    dbRevenue: number;
    dbWageCost: number;
    dbRevenuePerHour: number;
    dbLaborCostPercentage: number;
  }>;
  // Worker-level verification (per worker per day per team)
  // Shows ALL workers from Excel (source of truth)
  workerVerifications?: Array<{
    location: string;
    locationId: string;
    date: string;
    worker: string;
    team: string | null;
    excelHours: number;
    dbHours: number;
    difference: number;
    percentDiff: string;
    isMatch: boolean;
    foundInDb: boolean; // Whether worker was found in database
    sourceFiles: string[];
    dbRecordCount: number;
  }>;
  workerDiscrepancies?: Array<{
    type: string;
    location?: string;
    locationId?: string;
    date?: string;
    worker?: string;
    excelHours?: number;
    dbHours?: number;
    difference?: number;
    percentDiff?: string;
    message: string;
  }>;
  discrepancies: Array<{
    type: string;
    location?: string;
    locationId?: string;
    date?: string;
    excelHours?: number;
    dbHours?: number | null;
    difference?: number;
    percentDiff?: string;
    message: string;
  }>;
}

export type DateFilter = 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all';

export interface EitjeDataCheckResponse {
  success: boolean;
  dateFilter?: DateFilter;
  dateRange?: { start: string; end: string } | null;
  actualDataRange?: { start: string; end: string } | null;
  sampleDates?: string[]; // For debugging - shows actual dates found in Excel files
  summary?: VerificationSummary;
  finance?: FinanceVerification;
  hours?: HoursVerification;
  diagnostics?: {
    november2025?: {
      dates: number;
      excelWorkers: number;
      dbWorkers: number;
      missingWorkers: number;
      missingWorkerNames: string[];
      rawDataRecords: number;
      processedRecords: number;
      aggregatedRecords: number;
      rawDataSample: {
        hasData: boolean;
        sampleDate?: any;
        sampleEndpoint?: string;
        hasExtracted?: boolean;
      };
    };
  } | null;
  error?: string;
}

async function fetchVerificationData(dateFilter: DateFilter = 'all'): Promise<EitjeDataCheckResponse> {
  const response = await fetch(`/api/admin/eitje-data-verifier?dateFilter=${dateFilter}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch verification data');
  }

  return response.json();
}

export function useEitjeDataCheckViewModel(dateFilter: DateFilter = 'all') {
  const {
    data: verificationData,
    isLoading,
    error,
    refetch,
  } = useQuery<EitjeDataCheckResponse>({
    queryKey: ['eitje-data-check', dateFilter],
    queryFn: () => fetchVerificationData(dateFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    verificationData,
    isLoading,
    error,
    refetch,
    summary: verificationData?.summary,
    finance: verificationData?.finance,
    hours: verificationData?.hours,
    dateFilter: verificationData?.dateFilter || dateFilter,
    dateRange: verificationData?.dateRange,
    actualDataRange: verificationData?.actualDataRange,
    sampleDates: verificationData?.sampleDates,
    diagnostics: verificationData?.diagnostics, // Exposed for November 2025 check
  };
}

