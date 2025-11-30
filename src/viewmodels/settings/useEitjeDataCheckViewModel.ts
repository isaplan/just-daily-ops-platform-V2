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
  summary?: VerificationSummary;
  finance?: FinanceVerification;
  hours?: HoursVerification;
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
  };
}

