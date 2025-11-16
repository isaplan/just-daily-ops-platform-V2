/**
 * Eitje API Settings Model
 * 
 * Type definitions for Eitje API settings
 */

export interface EitjeCredentials {
  baseUrl: string;
  partnerUsername: string;
  partnerPassword: string;
  apiUsername: string;
  apiPassword: string;
  isActive: boolean;
}

export interface MonthlyProgressV2 {
  year: number;
  month: number;
  endpoints: Record<string, {
    processedV2Count: number;
    isProcessed: boolean;
    lastProcessed: string | null;
  }>;
  allProcessed: boolean;
}

export interface ProcessMonthResult {
  recordsSaved: number;
  recordsAggregated: number;
}






