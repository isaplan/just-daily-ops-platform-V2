/**
 * Data Status Models
 * 
 * TypeScript interfaces for Data & Status page
 */

export type SystemStatusType = 'database_stats' | 'system_status' | 'database_integrity';

export interface SystemStatusCache {
  _id?: string;
  type: SystemStatusType;
  data: any;
  lastUpdated: Date;
  expiresAt: Date;
}

export interface DatabaseStats {
  collections: {
    name: string;
    count: number;
    lastRecordDate?: string;
  }[];
  totalRecords: number;
  lastRefresh: Date;
  databaseName: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export interface DatabaseIntegrity {
  borkAggregated: {
    dateRange: {
      min: string;
      max: string;
    };
    missingDates: string[];
    totalRecords: number;
    integrityStatus: 'complete' | 'missing_dates' | 'no_data';
  };
  eitjeAggregated: {
    dateRange: {
      min: string;
      max: string;
    };
    missingDates: string[];
    totalRecords: number;
    integrityStatus: 'complete' | 'missing_dates' | 'no_data';
  };
  productsAggregated: {
    totalRecords: number;
    lastUpdated?: string;
    integrityStatus: 'complete' | 'needs_update' | 'no_data';
  };
  lastChecked: Date;
}

export interface ApiStatus {
  provider: 'bork' | 'eitje';
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  cronJobs: {
    dailyData: {
      isActive: boolean;
      lastRun?: Date;
      nextRun?: Date;
    };
    historicalData: {
      isActive: boolean;
      lastRun?: Date;
      nextRun?: Date;
    };
    masterData: {
      isActive: boolean;
      lastRun?: Date;
      nextRun?: Date;
    };
  };
}

export interface SystemStatus {
  bork: ApiStatus;
  eitje: ApiStatus;
  lastUpdated: Date;
}

export interface IntegrationStatus {
  socialMedia: {
    enabled: boolean;
    connected: boolean;
    lastSync?: Date;
  };
  email: {
    enabled: boolean;
    connected: boolean;
    lastSync?: Date;
  };
}

export interface LoginHistoryEntry {
  _id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export interface LoginHistoryResponse {
  success: boolean;
  data: {
    records: LoginHistoryEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}










