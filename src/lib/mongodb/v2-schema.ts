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
// PRODUCTS AGGREGATED DATA (UNIFIED)
// ============================================
// Unified product collection combining:
// - Workload/MEP metrics (from product catalog)
// - Sales data (prices, revenue, from bork_raw_data)
// - Location-specific information
// - Menu associations

export interface ProductsAggregated {
  _id?: ObjectId;
  productName: string;
  locationId?: ObjectId; // Optional: location-specific product info
  category?: string;
  mainCategory?: string; // "Bar", "Keuken", "Other"
  productSku?: string;
  
  // ============================================
  // WORKLOAD & MEP METRICS (from product catalog)
  // ============================================
  workloadLevel?: 'low' | 'mid' | 'high';
  workloadMinutes?: number; // Time to prepare during service
  mepLevel?: 'low' | 'mid' | 'high'; // MEP = Mise en Place (prep time)
  mepMinutes?: number; // Prep time before service
  courseType?: string; // e.g., "starter", "main", "dessert"
  notes?: string;
  isActive: boolean; // Product is active/available
  
  // ============================================
  // PRICE INFORMATION (from sales data)
  // ============================================
  averagePrice: number; // Average unit price across all sales
  latestPrice: number; // Most recent price seen
  minPrice: number; // Lowest price seen
  maxPrice: number; // Highest price seen
  priceHistory: Array<{
    date: Date;
    price: number;
    quantity: number;
    locationId?: ObjectId;
    menuId?: ObjectId;
  }>; // Recent price history (last 30 days)
  
  // ============================================
  // SALES STATISTICS (from bork_raw_data)
  // ============================================
  totalQuantitySold: number; // Total quantity sold
  totalRevenue: number; // Total revenue from this product
  totalTransactions: number; // Number of transactions containing this product
  firstSeen: Date; // First date this product was sold
  lastSeen: Date; // Most recent date this product was sold
  
  // ============================================
  // MENU ASSOCIATIONS
  // ============================================
  menuIds?: ObjectId[]; // Menus this product is assigned to
  menuPrices?: Array<{
    menuId: ObjectId;
    menuTitle: string;
    price: number;
    dateAdded: Date;
    dateRemoved?: Date;
  }>; // Price history across menus
  
  // ============================================
  // LOCATION DETAILS (which locations sell this product)
  // ============================================
  locationDetails?: Array<{
    locationId: ObjectId;
    locationName: string;
    lastSoldDate: Date;
    totalQuantitySold: number;
    totalRevenue: number;
  }>;
  
  // ============================================
  // TIME-SERIES SALES DATA (for categoriesProductsAggregate)
  // Last 90 days of daily/weekly/monthly breakdowns
  // ============================================
  salesByDate?: Array<{
    date: string; // YYYY-MM-DD
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactionCount: number;
    locationId?: ObjectId;
  }>; // Daily sales (last 90 days) - DEPRECATED: Use salesByDay instead
  
  salesByWeek?: Array<{
    week: string; // YYYY-W## format
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactionCount: number;
  }>; // Weekly sales (last 12 weeks) - DEPRECATED: Use hierarchical structure instead
  
  salesByMonth?: Array<{
    month: string; // YYYY-MM format
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactionCount: number;
  }>; // Monthly sales (last 12 months) - DEPRECATED: Use hierarchical structure instead
  
  // ============================================
  // HIERARCHICAL TIME-SERIES SALES DATA (NEW)
  // Fast queries for year/month/week/day breakdowns
  // ============================================
  salesByYear?: Array<{
    year: string; // "2024", "2025"
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>;
  
  salesByMonth?: Array<{
    year: string; // "2025"
    month: string; // "01", "02", ... "12"
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>; // Only for months older than 1 month
  
  salesByWeek?: Array<{
    year: string; // "2025"
    week: string; // "01", "02", ... "46", "47"
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>; // Only for weeks older than 1 week
  
  salesByDay?: Array<{
    year: string; // "2025"
    week: string; // "46" (current week)
    date: string; // "2025-11-17" (YYYY-MM-DD)
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>; // Only for current week, excluding today
  
  // ============================================
  // METADATA
  // ============================================
  vatRate?: number; // Average VAT rate
  costPrice?: number; // Average cost price (if available)
  
  createdAt: Date;
  updatedAt: Date;
  lastAggregated?: Date; // Last time products were aggregated from sales data
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
  
  // ============================================
  // HIERARCHICAL TIME-SERIES LABOR DATA (NEW)
  // Fast queries for year/month/week/day breakdowns with worker/team details
  // ============================================
  hoursByYear?: Array<{
    year: string; // "2024", "2025"
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
  
  hoursByMonth?: Array<{
    year: string; // "2025"
    month: string; // "01", "02", ... "12"
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>; // Only for months older than 1 month
  
  hoursByWeek?: Array<{
    year: string; // "2025"
    week: string; // "01", "02", ... "46", "47"
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>; // Only for weeks older than 1 week
  
  hoursByDay?: Array<{
    year: string; // "2025"
    week: string; // "46" (current week)
    date: string; // "2025-11-17" (YYYY-MM-DD)
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    laborCostPercentage: number;
    revenuePerHour: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: string | ObjectId;
        teamName: string;
        totalHoursWorked: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          workerName: string;
          totalHoursWorked: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>; // Only for current week, excluding today
  
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

