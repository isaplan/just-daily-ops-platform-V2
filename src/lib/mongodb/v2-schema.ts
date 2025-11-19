/**
 * MongoDB V2 Schema Definitions
 * 
 * TypeScript interfaces for all MongoDB collections
 * Based on existing Supabase schema structure
 */

import { ObjectId } from 'mongodb';

// ============================================
// CORE ENTITIES
// ============================================

export interface Location {
  _id?: ObjectId;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  // System mappings for multi-system support (e.g., Bork cost centers)
  systemMappings?: SystemMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedUser {
  _id?: ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeNumber?: string;
  hireDate?: Date;
  isActive: boolean;
  notes?: string;
  // Relationships via references
  locationIds: ObjectId[];
  teamIds: ObjectId[];
  // System mappings embedded
  systemMappings: SystemMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedTeam {
  _id?: ObjectId;
  name: string;
  description?: string;
  teamType?: string; // 'kitchen', 'service', 'management', etc.
  isActive: boolean;
  // Relationships
  locationIds: ObjectId[];
  memberIds: ObjectId[]; // References to unified_users
  // System mappings
  systemMappings: SystemMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemMapping {
  system: string; // 'eitje', 'bork', 'api3', 'api4'
  externalId: string;
  rawData?: Record<string, any>; // Store raw API response
}

// ============================================
// API CREDENTIALS
// ============================================

export interface ApiCredentials {
  _id?: ObjectId;
  locationId: ObjectId;
  provider: string; // 'bork', 'eitje', 'api3', 'api4'
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>; // For complex auth (like Eitje's 4-credential system)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BORK DATA
// ============================================

export interface BorkRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  // Store entire raw API response
  rawApiResponse: Record<string, any>;
  // Extracted/normalized fields for querying
  extracted: {
    productName?: string;
    productSku?: string;
    category?: string;
    quantity?: number;
    price?: number;
    revenue?: number;
    revenueExVat?: number;
    revenueIncVat?: number;
    vatRate?: number;
    vatAmount?: number;
    costPrice?: number;
  };
  importId?: string;
  createdAt: Date;
}

export interface BorkAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  totalRevenue: number;
  totalQuantity: number;
  totalTransactions: number;
  avgRevenuePerTransaction: number;
  revenueByCategory: Record<string, number>; // { "food": 1000, "drinks": 500 }
  revenueByPaymentMethod: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// EITJE DATA
// ============================================

export interface EitjeRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  environmentId?: number; // Eitje's environment ID
  date: Date;
  endpoint: string; // 'time_registration_shifts', 'revenue_days', etc.
  // Store entire raw API response
  rawApiResponse: Record<string, any>;
  // Extracted fields
  extracted: {
    userId?: number;
    teamId?: number;
    hoursWorked?: number;
    wageCost?: number;
    revenue?: number;
    // ... other extracted fields
    [key: string]: any;
  };
  createdAt: Date;
}

export interface EitjeAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  laborCostPercentage: number;
  revenuePerHour: number;
  teamStats: Array<{
    teamId: ObjectId; // Reference to unified_teams
    hours: number;
    cost: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// POWERBI DATA
// ============================================

export interface PowerBiRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  year: number;
  month: number;
  // Store entire raw file/API response
  rawData: Record<string, any>;
  // Extracted fields
  extracted: {
    category?: string;
    subcategory?: string;
    glAccount?: string;
    amount?: number;
    [key: string]: any;
  };
  importId?: string;
  createdAt: Date;
}

export interface PowerBiAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  year: number;
  month: number;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  categoryBreakdown: Record<string, number>; // Detailed breakdown
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DASHBOARD AGGREGATIONS
// ============================================

export interface DailyDashboard {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  // Sales data
  sales: {
    totalRevenue: number;
    transactionCount: number;
    avgTransactionValue: number;
  };
  // Labor data
  labor: {
    totalHours: number;
    totalCost: number;
    employeeCount: number;
  };
  // Cross-correlated metrics
  productivity: {
    revenuePerHour: number;
    laborCostPercentage: number;
    efficiencyScore: number;
  };
  // P&L data (if available for this date)
  pnl?: {
    revenue: number;
    costs: number;
    profit: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DAILY DASHBOARD - KITCHEN
// ============================================

export interface DailyDashboardKitchen {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  hour?: number; // Optional: for hourly breakdowns
  timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks" | "all";
  
  // Product Production (from bork_raw_data aggregated by product)
  productProduction: Array<{
    productName: string;
    category?: string;
    totalQuantity: number;
    workloadLevel: "low" | "mid" | "high";
    workloadMinutes: number;
    totalWorkloadMinutes: number;
  }>;
  
  // Worker Activity (from eitje_raw_data + unified_users)
  workerActivity: Array<{
    unifiedUserId: ObjectId; // Reference to unified_users
    workerName: string;
    teamName?: string;
    hours: number[]; // [11, 12, 13, ...] - hours active
    isKitchenWorker: boolean;
  }>;
  
  // Workload Metrics (pre-calculated)
  workloadByHour: Array<{
    hour: number; // 0-23
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: number;
  }>;
  
  workloadByWorker: Array<{
    unifiedUserId: ObjectId;
    workerName: string;
    teamName?: string;
    totalWorkloadMinutes: number;
    productCount: number;
  }>;
  
  workloadByRange: Array<{
    timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks";
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: number;
  }>;
  
  // KPIs (pre-calculated)
  kpis: {
    totalOrders: number;
    totalProductsProduced: number;
    totalWorkloadMinutes: number;
    averageWorkloadPerHour: number;
    peakHour: string; // "14:00"
    peakTimeRange: "lunch" | "dinner";
    averageWorkersPerHour: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// MENUS
// ============================================

export interface Menu {
  _id?: ObjectId;
  title: string;
  startDate: Date;
  endDate: Date;
  productIds: string[]; // Product names assigned to this menu
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DATA IMPORTS TRACKING
// ============================================

export interface DataImport {
  _id?: ObjectId;
  importType: string; // 'bork_sales', 'eitje_labor', 'powerbi_pnl'
  locationId?: ObjectId;
  fileName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords?: number;
  processedRecords?: number;
  errorMessage?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

