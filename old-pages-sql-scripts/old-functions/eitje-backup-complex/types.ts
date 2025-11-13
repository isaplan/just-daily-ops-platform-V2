/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API TYPES
 * 
 * Centralized type definitions for Eitje API integration
 */

export interface EitjeApiConfig {
  baseUrl: string;
  apiKey: string; // Keep for compatibility but not used for auth
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
  validateData: boolean;
  additional_config: {
    partner_username: string;
    partner_password: string;
    api_username: string;
    api_password: string;
    content_type?: string;
    accept?: string;
  };
}

export interface EitjeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  responseTime: number;
  retryCount: number;
}

export interface EitjeShiftResponse {
  id: number;
  date: string;
  user_id?: number;
  team_id?: number;
  environment_id?: number;
  
  // Time fields (multiple naming conventions)
  start_time?: string;
  start?: string;
  startDateTime?: string;
  end_time?: string;
  end?: string;
  endDateTime?: string;
  
  // Break fields
  break_minutes?: number;
  breaks?: number;
  breakMinutes?: number;
  
  // Hours fields
  hours_worked?: number;
  hours?: number;
  totalHours?: number;
  
  // Cost fields (may be nested)
  wage_cost?: number;
  costs?: {
    wage?: number;
    [key: string]: any;
  };
  
  // Metadata
  status?: string;
  skill_set?: string;
  shift_type?: string;
}

export interface DataValidationResult {
  field: string;
  status: 'valid' | 'invalid' | 'missing';
  value: any;
  message: string;
}
