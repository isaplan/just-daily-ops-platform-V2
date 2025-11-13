/**
 * Settings Eitje API Model
 * Type definitions for Eitje API settings data structures
 */

export interface EitjeCredentials {
  id?: string;
  provider: string;
  api_key: string;
  base_url: string;
  additional_config: {
    partner_username: string;
    partner_password: string;
    api_username: string;
    api_password: string;
    content_type: string;
    accept: string;
    timeout: number;
    retry_attempts: number;
    rate_limit: number;
  };
  is_active: boolean;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  syncTime: number;
  lastSyncDate?: string;
  nextSyncDate?: string;
}

export interface RawDataRecord {
  id: string;
  location_id: string;
  date: string;
  product_name: string;
  category: string | null;
  quantity: number;
  price: number;
  revenue: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export interface DataStats {
  totalRecords: number;
  totalRevenue: number;
  totalQuantity: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MonthlyProgress {
  [monthKey: string]: {
    year: number;
    month: number;
    endpoints: Record<string, {
      status: string;
      recordsCount: number;
      lastSync?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
}

export type ConnectionStatus = "unknown" | "connected" | "failed";

export interface DateChunk {
  start: string;
  end: string;
}

export interface EitjeApiState {
  credentials: EitjeCredentials;
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isSyncing: boolean;
  syncingMonths: Set<string>;
  connectionStatus: ConnectionStatus;
  lastSync: SyncResult | null;
  rawData: RawDataRecord[];
  progressData: any;
  syncedMonths: Set<string>;
  monthlyProgress: MonthlyProgress;
  monthlyProgressV2: MonthlyProgress;
  isLoadingV2Progress: boolean;
  processingV2Months: Set<string>;
  historyExpanded: Record<string, boolean>;
  historyData: Record<string, any[]>;
  dataStats: DataStats;
}
