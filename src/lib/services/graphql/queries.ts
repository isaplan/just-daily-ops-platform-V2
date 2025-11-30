/**
 * GraphQL Queries
 * 
 * All GraphQL query operations for the application
 */

import { executeGraphQL } from './client';

export interface ApiCredential {
  id: string;
  locationId?: string;
  provider: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>;
  isActive: boolean;
}

/**
 * Get API credentials by provider
 */
export async function getApiCredentials(
  provider?: string,
  locationId?: string
): Promise<ApiCredential[]> {
  const query = `
    query GetApiCredentials($provider: String, $locationId: ID) {
      apiCredentials(provider: $provider, locationId: $locationId) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ apiCredentials: ApiCredential[] }>(
    query,
    { provider, locationId }
  );

  return result.data?.apiCredentials || [];
}

/**
 * Get a single API credential by ID
 */
export async function getApiCredential(id: string): Promise<ApiCredential | null> {
  const query = `
    query GetApiCredential($id: ID!) {
      apiCredential(id: $id) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ apiCredential: ApiCredential | null }>(
    query,
    { id }
  );

  return result.data?.apiCredential || null;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all locations
 */
export async function getLocations(): Promise<Location[]> {
  const query = `
    query GetLocations {
      locations {
        id
        name
        code
        address
        city
        country
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ locations: Location[] }>(query);
  return result.data?.locations || [];
}

export interface LaborData {
  id: string;
  location: Location;
  date: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  laborCostPercentage: number;
  revenuePerHour: number;
  teamStats?: Array<{
    team: {
      id: string;
      name: string;
    };
    hours: number;
    cost: number;
  }>;
  workerStats?: Array<{
    workerId: string;
    workerName: string;
    teamId?: string;
    teamName?: string;
    hours: number;
    cost: number;
  }>;
  createdAt: string;
}

/**
 * Get aggregated labor data
 */
export async function getLaborAggregated(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<LaborData[]> {
  const query = `
    query GetLaborAggregated($locationId: ID!, $startDate: String!, $endDate: String!) {
      laborAggregated(locationId: $locationId, startDate: $startDate, endDate: $endDate, page: 1, limit: 10000) {
        success
        records {
          id
          location {
            id
            name
            code
          }
          date
          totalHoursWorked
          totalWageCost
          totalRevenue
          laborCostPercentage
          revenuePerHour
          teamStats {
            team {
              id
              name
            }
            hours
            cost
          }
          workerStats {
            workerId
            workerName
            teamId
            teamName
            hours
            cost
          }
          createdAt
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ laborAggregated: { success: boolean; records: LaborData[]; error?: string } }>(
    query,
    { locationId, startDate, endDate }
  );

  if (!result.data?.laborAggregated?.success) {
    throw new Error(result.data?.laborAggregated?.error || 'Failed to fetch labor data');
  }

  return result.data.laborAggregated.records || [];
}

// ============================================
// LABOR HOURS QUERIES
// ============================================

export interface ProcessedHoursRecord {
  id: string;
  eitje_id?: number;
  date: string;
  user_id?: number;
  user_name?: string | null;
  environment_id?: number | null;
  environment_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  start?: string | null;
  end?: string | null;
  break_minutes?: number | null;
  worked_hours?: number | null;
  hourly_wage?: number | null;
  wage_cost?: number | null;
  type_name?: string | null;
  shift_type?: string | null;
  remarks?: string | null;
  approved?: boolean | null;
  planning_shift_id?: number | null;
  exported_to_hr_integration?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface AggregatedHoursRecord {
  id: string;
  date: string;
  user_id?: number;
  user_name?: string | null;
  environment_id?: number | null;
  environment_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  hours_worked: number;
  hourly_rate?: number | null;
  hourly_cost?: number | null;
  labor_cost?: number | null;
  shift_count?: number;
  total_breaks_minutes?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface HoursResponse {
  success: boolean;
  records: ProcessedHoursRecord[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface AggregatedHoursResponse {
  success: boolean;
  records: AggregatedHoursRecord[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface HoursFilters {
  locationId?: string;
  environmentId?: number;
  teamName?: string;
  userId?: number;
  typeName?: string | null;
}

/**
 * Get processed hours (individual shift records)
 */
export async function getProcessedHours(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 50,
  filters?: HoursFilters
): Promise<HoursResponse> {
  const query = `
    query GetProcessedHours(
      $startDate: String!
      $endDate: String!
      $page: Int
      $limit: Int
      $filters: HoursFilters
    ) {
      processedHours(
        startDate: $startDate
        endDate: $endDate
        page: $page
        limit: $limit
        filters: $filters
      ) {
        success
        records {
          id
          eitje_id
          date
          user_id
          user_name
          environment_id
          environment_name
          team_id
          team_name
          start
          end
          break_minutes
          worked_hours
          hourly_wage
          wage_cost
          type_name
          shift_type
          remarks
          approved
          planning_shift_id
          exported_to_hr_integration
          updated_at
          created_at
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ processedHours: HoursResponse }>(
    query,
    { startDate, endDate, page, limit, filters }
  );

  return result.data?.processedHours || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch processed hours',
  };
}

/**
 * Get aggregated hours
 */
export async function getAggregatedHours(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 50,
  filters?: HoursFilters
): Promise<AggregatedHoursResponse> {
  const query = `
    query GetAggregatedHours(
      $startDate: String!
      $endDate: String!
      $page: Int
      $limit: Int
      $filters: HoursFilters
    ) {
      aggregatedHours(
        startDate: $startDate
        endDate: $endDate
        page: $page
        limit: $limit
        filters: $filters
      ) {
        success
        records {
          id
          date
          user_id
          user_name
          environment_id
          environment_name
          team_id
          team_name
          hours_worked
          hourly_rate
          hourly_cost
          labor_cost
          shift_count
          total_breaks_minutes
          updated_at
          created_at
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ aggregatedHours: AggregatedHoursResponse }>(
    query,
    { startDate, endDate, page, limit, filters }
  );

  return result.data?.aggregatedHours || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch aggregated hours',
  };
}

// ============================================
// WORKER PROFILES QUERIES
// ============================================

export interface WorkerProfile {
  id: string;
  // User IDs and Names (denormalized for fast queries - 100x faster!)
  eitjeUserId: number;
  userName?: string | null; // Prefer unifiedUserName if available
  unifiedUserId?: string | null; // unified_users._id
  unifiedUserName?: string | null; // unified_users.name (primary source of truth)
  borkUserId?: string | null; // bork system mapping externalId
  borkUserName?: string | null; // Usually same as unifiedUserName
  // Teams (names already denormalized)
  teamName?: string | null;
  teams?: Array<{
    team_id: string;
    team_name: string;
    team_type?: string;
    is_active?: boolean;
  }> | null;
  // Locations (names already denormalized)
  locationId?: string | null;
  locationName?: string | null;
  locationIds?: string[] | null;
  locationNames?: string[] | null;
  // Contract data
  contractType?: string | null;
  contractHours?: number | null;
  hourlyWage?: number | null;
  wageOverride: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WorkerProfilesResponse {
  success: boolean;
  records: WorkerProfile[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface WorkerProfileFilters {
  locationId?: string;
  activeOnly?: boolean | null;
}

/**
 * Get worker profiles
 */
export async function getWorkerProfiles(
  year: number,
  month?: number | null,
  day?: number | null,
  page: number = 1,
  limit: number = 50,
  filters?: WorkerProfileFilters
): Promise<WorkerProfilesResponse> {
  const query = `
    query GetWorkerProfiles(
      $year: Int!
      $month: Int
      $day: Int
      $page: Int
      $limit: Int
      $filters: WorkerProfileFilters
    ) {
      workerProfiles(
        year: $year
        month: $month
        day: $day
        page: $page
        limit: $limit
        filters: $filters
      ) {
        success
        records {
          id
          eitjeUserId
          userName
          locationId
          locationName
          contractType
          contractHours
          hourlyWage
          wageOverride
          effectiveFrom
          effectiveTo
          notes
          isActive
          createdAt
          updatedAt
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ workerProfiles: WorkerProfilesResponse }>(
    query,
    { year, month, day, page, limit, filters }
  );

  return result.data?.workerProfiles || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch worker profiles',
  };
}

/**
 * Get a single worker profile by ID
 */
export async function getWorkerProfile(id: string): Promise<WorkerProfile | null> {
  const query = `
    query GetWorkerProfile($id: ID!) {
      workerProfile(id: $id) {
        id
        eitjeUserId
        userName
        locationId
        locationName
        contractType
        contractHours
        hourlyWage
        wageOverride
        effectiveFrom
        effectiveTo
        notes
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ workerProfile: WorkerProfile | null }>(
    query,
    { id }
  );

  return result.data?.workerProfile || null;
}

/**
 * Get a worker profile by user name (uses unified_users system)
 */
export async function getWorkerProfileByName(userName: string): Promise<WorkerProfile | null> {
  const query = `
    query GetWorkerProfileByName($userName: String!) {
      workerProfileByName(userName: $userName) {
        id
        eitjeUserId
        userName
        locationId
        locationName
        contractType
        contractHours
        hourlyWage
        wageOverride
        effectiveFrom
        effectiveTo
        notes
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ workerProfileByName: WorkerProfile | null }>(
    query,
    { userName }
  );

  return result.data?.workerProfileByName || null;
}

// ============================================
// SALES QUERIES
// ============================================

export interface BorkSalesRecord {
  id: string;
  date: string;
  location_id?: string;
  location_name?: string | null;
  ticket_key?: string | null;
  ticket_number?: string | null;
  order_key?: string | null;
  order_line_key?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  product_number?: number | null;
  category?: string | null;
  group_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_ex_vat?: number | null;
  total_inc_vat?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  cost_price?: number | null;
  payment_method?: string | null;
  table_number?: number | null;
  waiter_name?: string | null;
  time?: string | null;
  created_at?: string | null;
}

export interface DailySalesResponse {
  success: boolean;
  records: BorkSalesRecord[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface SalesFilters {
  locationId?: string;
  category?: string;
  productName?: string;
  waiterName?: string;
}

/**
 * Get daily sales data
 */
export async function getDailySales(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 50,
  filters?: SalesFilters
): Promise<DailySalesResponse> {
  const query = `
    query GetDailySales(
      $startDate: String!
      $endDate: String!
      $page: Int
      $limit: Int
      $filters: SalesFilters
    ) {
      dailySales(
        startDate: $startDate
        endDate: $endDate
        page: $page
        limit: $limit
        filters: $filters
      ) {
        success
        records {
          id
          date
          location_id
          location_name
          ticket_key
          ticket_number
          order_key
          order_line_key
          product_name
          product_sku
          product_number
          category
          group_name
          quantity
          unit_price
          total_ex_vat
          total_inc_vat
          vat_rate
          vat_amount
          cost_price
          payment_method
          table_number
          waiter_name
          time
          created_at
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ dailySales: DailySalesResponse }>(
    query,
    { startDate, endDate, page, limit, filters }
  );

  return result.data?.dailySales || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch daily sales',
  };
}

// ============================================
// CATEGORIES & PRODUCTS QUERIES
// ============================================

export interface TimePeriodTotals {
  quantity: number;
  revenueExVat: number;
  revenueIncVat: number;
  transactionCount: number;
}

export interface ProductAggregate {
  productName: string;
  daily: TimePeriodTotals;
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals;
}

export interface CategoryAggregate {
  categoryName: string;
  mainCategoryName?: string | null;
  products: ProductAggregate[];
  daily: TimePeriodTotals;
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals;
}

export interface MainCategoryAggregate {
  mainCategoryName: string;
  categories: CategoryAggregate[];
  daily: TimePeriodTotals;
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals;
}

export interface CategoriesProductsResponse {
  success: boolean;
  categories: CategoryAggregate[];
  mainCategories?: MainCategoryAggregate[];
  totals: TimePeriodTotals;
  error?: string;
}

// Category Metadata (lightweight - no products)
export interface CategoryMetadata {
  categoryName: string;
  mainCategoryName?: string | null;
  productCount: number;
  total: TimePeriodTotals;
}

export interface CategoriesMetadataResponse {
  success: boolean;
  categories: CategoryMetadata[];
  totals: TimePeriodTotals;
  error?: string;
}

export interface CategoriesProductsFilters {
  locationId?: string;
  category?: string;
  productName?: string;
}

/**
 * Get categories and products aggregate data
 */
export async function getCategoriesProductsAggregate(
  startDate: string,
  endDate: string,
  filters?: CategoriesProductsFilters
): Promise<CategoriesProductsResponse> {
  const query = `
    query GetCategoriesProductsAggregate(
      $startDate: String!
      $endDate: String!
      $filters: CategoriesProductsFilters
    ) {
      categoriesProductsAggregate(
        startDate: $startDate
        endDate: $endDate
        filters: $filters
      ) {
        success
        categories {
          categoryName
          mainCategoryName
          products {
            productName
            daily {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            weekly {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            monthly {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            total {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            workloadLevel
            workloadMinutes
            mepLevel
            mepMinutes
            courseType
            isActive
            locationDetails {
              locationId
              locationName
              lastSoldDate
              totalQuantitySold
              totalRevenue
            }
          }
          daily {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          weekly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          monthly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          total {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
        }
        mainCategories {
          mainCategoryName
          categories {
            categoryName
            mainCategoryName
            products {
              productName
              daily {
                quantity
                revenueExVat
                revenueIncVat
                transactionCount
              }
              weekly {
                quantity
                revenueExVat
                revenueIncVat
                transactionCount
              }
              monthly {
                quantity
                revenueExVat
                revenueIncVat
                transactionCount
              }
              total {
                quantity
                revenueExVat
                revenueIncVat
                transactionCount
              }
            }
            daily {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            weekly {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            monthly {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
            total {
              quantity
              revenueExVat
              revenueIncVat
              transactionCount
            }
          }
          daily {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          weekly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          monthly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          total {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
        }
        totals {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
        error
      }
    }
  `;

  const result = await executeGraphQL<{ categoriesProductsAggregate: CategoriesProductsResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.categoriesProductsAggregate || {
    success: false,
    categories: [],
    totals: {
      quantity: 0,
      revenueExVat: 0,
      revenueIncVat: 0,
      transactionCount: 0,
    },
    error: 'Failed to fetch categories/products aggregate',
  };
}

/**
 * Get categories metadata only (lightweight - for fast first paint)
 */
export async function getCategoriesMetadata(
  startDate: string,
  endDate: string,
  filters?: CategoriesProductsFilters
): Promise<CategoriesMetadataResponse> {
  const query = `
    query GetCategoriesMetadata(
      $startDate: String!
      $endDate: String!
      $filters: CategoriesProductsFilters
    ) {
      categoriesMetadata(
        startDate: $startDate
        endDate: $endDate
        filters: $filters
      ) {
        success
        categories {
          categoryName
          mainCategoryName
          productCount
          total {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
        }
        totals {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
        error
      }
    }
  `;

  const result = await executeGraphQL<{ categoriesMetadata: CategoriesMetadataResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.categoriesMetadata || {
    success: false,
    categories: [],
    totals: {
      quantity: 0,
      revenueExVat: 0,
      revenueIncVat: 0,
      transactionCount: 0,
    },
    error: 'Failed to fetch categories metadata',
  };
}

/**
 * Get products for a specific category (lazy loading)
 */
export async function getCategoryProducts(
  categoryName: string,
  startDate: string,
  endDate: string,
  filters?: CategoriesProductsFilters
): Promise<CategoryAggregate> {
  const query = `
    query GetCategoryProducts(
      $categoryName: String!
      $startDate: String!
      $endDate: String!
      $filters: CategoriesProductsFilters
    ) {
      categoryProducts(
        categoryName: $categoryName
        startDate: $startDate
        endDate: $endDate
        filters: $filters
      ) {
        categoryName
        mainCategoryName
        products {
          productName
          daily {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          weekly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          monthly {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          total {
            quantity
            revenueExVat
            revenueIncVat
            transactionCount
          }
          workloadLevel
          workloadMinutes
          mepLevel
          mepMinutes
          courseType
          isActive
          locationDetails {
            locationId
            locationName
            lastSoldDate
            totalQuantitySold
            totalRevenue
          }
        }
        daily {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
        weekly {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
        monthly {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
        total {
          quantity
          revenueExVat
          revenueIncVat
          transactionCount
        }
      }
    }
  `;

  const result = await executeGraphQL<{ categoryProducts: CategoryAggregate }>(
    query,
    { categoryName, startDate, endDate, filters }
  );

  if (!result.data?.categoryProducts) {
    throw new Error('Failed to fetch category products');
  }

  return result.data.categoryProducts;
}

// ============================================
// SALES AGGREGATION QUERIES
// ============================================

export interface WaiterPerformance {
  waiter_name: string;
  location_id?: string;
  location_name?: string;
  total_revenue: number;
  total_transactions: number;
  total_items_sold: number;
  average_ticket_value: number;
  average_items_per_transaction: number;
}

export interface WaiterPerformanceResponse {
  success: boolean;
  records: WaiterPerformance[];
  total: number;
  error?: string;
}

export async function getWaiterPerformance(
  startDate: string,
  endDate: string,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<WaiterPerformanceResponse> {
  const query = `
    query GetWaiterPerformance($startDate: String!, $endDate: String!, $filters: SalesFilters) {
      waiterPerformance(startDate: $startDate, endDate: $endDate, filters: $filters) {
        success
        records {
          waiter_name
          location_id
          location_name
          total_revenue
          total_transactions
          total_items_sold
          average_ticket_value
          average_items_per_transaction
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ waiterPerformance: WaiterPerformanceResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.waiterPerformance || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch waiter performance',
  };
}

export interface RevenueBreakdown {
  date: string;
  location_id?: string;
  location_name?: string;
  total_revenue_ex_vat: number;
  total_revenue_inc_vat: number;
  total_vat: number;
  total_transactions: number;
  average_transaction_value: number;
  gross_profit?: number | null;
}

export interface RevenueBreakdownResponse {
  success: boolean;
  records: RevenueBreakdown[];
  total: number;
  error?: string;
}

export async function getRevenueBreakdown(
  startDate: string,
  endDate: string,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<RevenueBreakdownResponse> {
  const query = `
    query GetRevenueBreakdown($startDate: String!, $endDate: String!, $filters: SalesFilters) {
      revenueBreakdown(startDate: $startDate, endDate: $endDate, filters: $filters) {
        success
        records {
          date
          location_id
          location_name
          total_revenue_ex_vat
          total_revenue_inc_vat
          total_vat
          total_transactions
          average_transaction_value
          gross_profit
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ revenueBreakdown: RevenueBreakdownResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.revenueBreakdown || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch revenue breakdown',
  };
}

export interface PaymentMethodStats {
  payment_method: string;
  location_id?: string;
  location_name?: string;
  total_revenue: number;
  total_transactions: number;
  average_transaction_value: number;
  percentage_of_total: number;
}

export interface PaymentMethodStatsResponse {
  success: boolean;
  records: PaymentMethodStats[];
  total: number;
  error?: string;
}

export async function getPaymentMethodStats(
  startDate: string,
  endDate: string,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<PaymentMethodStatsResponse> {
  const query = `
    query GetPaymentMethodStats($startDate: String!, $endDate: String!, $filters: SalesFilters) {
      paymentMethodStats(startDate: $startDate, endDate: $endDate, filters: $filters) {
        success
        records {
          payment_method
          location_id
          location_name
          total_revenue
          total_transactions
          average_transaction_value
          percentage_of_total
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ paymentMethodStats: PaymentMethodStatsResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.paymentMethodStats || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch payment method stats',
  };
}

export interface ProductPerformance {
  product_name: string;
  category?: string;
  location_id?: string;
  location_name?: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit?: number | null;
  average_unit_price: number;
  transaction_count: number;
}

export interface ProductPerformanceResponse {
  success: boolean;
  records: ProductPerformance[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export async function getProductPerformance(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 50,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<ProductPerformanceResponse> {
  const query = `
    query GetProductPerformance($startDate: String!, $endDate: String!, $page: Int, $limit: Int, $filters: SalesFilters) {
      productPerformance(startDate: $startDate, endDate: $endDate, page: $page, limit: $limit, filters: $filters) {
        success
        records {
          product_name
          category
          location_id
          location_name
          total_quantity_sold
          total_revenue
          total_profit
          average_unit_price
          transaction_count
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ productPerformance: ProductPerformanceResponse }>(
    query,
    { startDate, endDate, page, limit, filters }
  );

  return result.data?.productPerformance || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch product performance',
  };
}

// ============================================
// ANALYSIS QUERIES
// ============================================

export interface TimeBasedAnalysis {
  hour: number;
  location_id?: string;
  location_name?: string;
  total_revenue: number;
  total_transactions: number;
  total_items_sold: number;
  average_transaction_value: number;
}

export interface TimeBasedAnalysisResponse {
  success: boolean;
  records: TimeBasedAnalysis[];
  total: number;
  error?: string;
}

export async function getTimeBasedAnalysis(
  startDate: string,
  endDate: string,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<TimeBasedAnalysisResponse> {
  const query = `
    query GetTimeBasedAnalysis($startDate: String!, $endDate: String!, $filters: SalesFilters) {
      timeBasedAnalysis(startDate: $startDate, endDate: $endDate, filters: $filters) {
        success
        records {
          hour
          location_id
          location_name
          total_revenue
          total_transactions
          total_items_sold
          average_transaction_value
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ timeBasedAnalysis: TimeBasedAnalysisResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.timeBasedAnalysis || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch time-based analysis',
  };
}

export interface TableAnalysis {
  table_number: number;
  location_id?: string;
  location_name?: string;
  total_revenue: number;
  total_transactions: number;
  total_items_sold: number;
  average_transaction_value: number;
  turnover_rate?: number | null;
}

export interface TableAnalysisResponse {
  success: boolean;
  records: TableAnalysis[];
  total: number;
  error?: string;
}

export async function getTableAnalysis(
  startDate: string,
  endDate: string,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<TableAnalysisResponse> {
  const query = `
    query GetTableAnalysis($startDate: String!, $endDate: String!, $filters: SalesFilters) {
      tableAnalysis(startDate: $startDate, endDate: $endDate, filters: $filters) {
        success
        records {
          table_number
          location_id
          location_name
          total_revenue
          total_transactions
          total_items_sold
          average_transaction_value
          turnover_rate
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ tableAnalysis: TableAnalysisResponse }>(
    query,
    { startDate, endDate, filters }
  );

  return result.data?.tableAnalysis || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch table analysis',
  };
}

export interface TransactionAnalysis {
  ticket_number: string;
  date: string;
  location_id?: string;
  location_name?: string;
  table_number?: number;
  waiter_name?: string;
  payment_method?: string;
  time?: string;
  total_revenue: number;
  total_items: number;
  item_count: number;
}

export interface TransactionAnalysisResponse {
  success: boolean;
  records: TransactionAnalysis[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export async function getTransactionAnalysis(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 50,
  filters?: { locationId?: string; category?: string; productName?: string }
): Promise<TransactionAnalysisResponse> {
  const query = `
    query GetTransactionAnalysis($startDate: String!, $endDate: String!, $page: Int, $limit: Int, $filters: SalesFilters) {
      transactionAnalysis(startDate: $startDate, endDate: $endDate, page: $page, limit: $limit, filters: $filters) {
        success
        records {
          ticket_number
          date
          location_id
          location_name
          table_number
          waiter_name
          payment_method
          time
          total_revenue
          total_items
          item_count
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ transactionAnalysis: TransactionAnalysisResponse }>(
    query,
    { startDate, endDate, page, limit, filters }
  );

  return result.data?.transactionAnalysis || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch transaction analysis',
  };
}

// ============================================
// PRODUCT CATALOG QUERIES
// ============================================

export interface Product {
  id: string;
  productName: string;
  category?: string;
  workloadLevel: 'low' | 'mid' | 'high';
  workloadMinutes: number;
  mepLevel: 'low' | 'mid' | 'high';
  mepMinutes: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  success: boolean;
  records: Product[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface ProductFilters {
  category?: string;
  workloadLevel?: 'low' | 'mid' | 'high';
  mepLevel?: 'low' | 'mid' | 'high';
  isActive?: boolean;
  search?: string;
}

export async function getProducts(
  page: number = 1,
  limit: number = 50,
  filters?: ProductFilters
): Promise<ProductsResponse> {
  const query = `
    query GetProducts($page: Int, $limit: Int, $filters: ProductFilters) {
      products(page: $page, limit: $limit, filters: $filters) {
        success
        records {
          id
          productName
          category
          workloadLevel
          workloadMinutes
          mepLevel
          mepMinutes
          isActive
          notes
          createdAt
          updatedAt
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const result = await executeGraphQL<{ products: ProductsResponse }>(
    query,
    { page, limit, filters }
  );

  return result.data?.products || {
    success: false,
    records: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch products',
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        productName
        category
        workloadLevel
        workloadMinutes
        mepLevel
        mepMinutes
        isActive
        notes
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ product: Product | null }>(query, { id });
  return result.data?.product || null;
}

export async function getProductByName(productName: string): Promise<Product | null> {
  const query = `
    query GetProductByName($productName: String!) {
      productByName(productName: $productName) {
        id
        productName
        category
        workloadLevel
        workloadMinutes
        mepLevel
        mepMinutes
        isActive
        notes
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ productByName: Product | null }>(query, { productName });
  return result.data?.productByName || null;
}

export interface ProductInput {
  productName: string;
  category?: string;
  workloadLevel: 'low' | 'mid' | 'high';
  mepLevel: 'low' | 'mid' | 'high';
  notes?: string;
  isActive?: boolean;
}

export interface ProductUpdateInput {
  productName?: string;
  category?: string;
  workloadLevel?: 'low' | 'mid' | 'high';
  mepLevel?: 'low' | 'mid' | 'high';
  notes?: string;
  isActive?: boolean;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const mutation = `
    mutation CreateProduct($input: ProductInput!) {
      createProduct(input: $input) {
        id
        productName
        category
        workloadLevel
        workloadMinutes
        mepLevel
        mepMinutes
        isActive
        notes
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ createProduct: Product }>(mutation, { input });
  if (!result.data?.createProduct) {
    throw new Error('Failed to create product');
  }
  return result.data.createProduct;
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<Product> {
  const mutation = `
    mutation UpdateProduct($id: ID!, $input: ProductUpdateInput!) {
      updateProduct(id: $id, input: $input) {
        id
        productName
        category
        workloadLevel
        workloadMinutes
        mepLevel
        mepMinutes
        isActive
        notes
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ updateProduct: Product }>(mutation, { id, input });
  if (!result.data?.updateProduct) {
    throw new Error('Failed to update product');
  }
  return result.data.updateProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteProduct($id: ID!) {
      deleteProduct(id: $id)
    }
  `;

  const result = await executeGraphQL<{ deleteProduct: boolean }>(mutation, { id });
  return result.data?.deleteProduct || false;
}

// ============================================
// KEUKEN ANALYSES QUERIES
// ============================================

export interface KeukenAnalysesRecord {
  locationId: string;
  date: string;
  timeRange: string;
  productProduction: Array<{
    productName: string;
    category?: string;
    totalQuantity: number;
    workloadLevel: string;
    workloadMinutes: number;
    totalWorkloadMinutes: number;
  }>;
  workerActivity: Array<{
    unifiedUserId: string;
    workerName: string;
    teamName?: string;
    hours: number[];
    isKitchenWorker: boolean;
  }>;
  workloadByHour: Array<{
    hour: number;
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: number;
  }>;
  workloadByWorker: Array<{
    unifiedUserId: string;
    workerName: string;
    teamName?: string;
    totalWorkloadMinutes: number;
    productCount: number;
  }>;
  workloadByRange: Array<{
    timeRange: string;
    totalWorkloadMinutes: number;
    productCount: number;
    activeWorkers: number;
  }>;
  kpis: {
    totalOrders: number;
    totalProductsProduced: number;
    totalWorkloadMinutes: number;
    averageWorkloadPerHour: number;
    peakHour: string;
    peakTimeRange: string;
    averageWorkersPerHour: number;
  };
}

export interface KeukenAnalysesResponse {
  success: boolean;
  records: KeukenAnalysesRecord[];
  total: number;
  error?: string;
}

export async function getKeukenAnalyses(
  locationId: string,
  startDate: string,
  endDate: string,
  timeRangeFilter?: string,
  selectedWorkerId?: string
): Promise<KeukenAnalysesResponse> {
  const query = `
    query GetKeukenAnalyses(
      $locationId: ID!
      $startDate: String!
      $endDate: String!
      $timeRangeFilter: String
      $selectedWorkerId: ID
    ) {
      keukenAnalyses(
        locationId: $locationId
        startDate: $startDate
        endDate: $endDate
        timeRangeFilter: $timeRangeFilter
        selectedWorkerId: $selectedWorkerId
      ) {
        success
        records {
          locationId
          date
          timeRange
          productProduction {
            productName
            category
            totalQuantity
            workloadLevel
            workloadMinutes
            totalWorkloadMinutes
          }
          workerActivity {
            unifiedUserId
            workerName
            teamName
            hours
            isKitchenWorker
          }
          workloadByHour {
            hour
            totalWorkloadMinutes
            productCount
            activeWorkers
          }
          workloadByWorker {
            unifiedUserId
            workerName
            teamName
            totalWorkloadMinutes
            productCount
          }
          workloadByRange {
            timeRange
            totalWorkloadMinutes
            productCount
            activeWorkers
          }
          kpis {
            totalOrders
            totalProductsProduced
            totalWorkloadMinutes
            averageWorkloadPerHour
            peakHour
            peakTimeRange
            averageWorkersPerHour
          }
        }
        total
        error
      }
    }
  `;

  const result = await executeGraphQL<{ keukenAnalyses: KeukenAnalysesResponse }>(
    query,
    { locationId, startDate, endDate, timeRangeFilter, selectedWorkerId }
  );

  return result.data?.keukenAnalyses || {
    success: false,
    records: [],
    total: 0,
    error: 'Failed to fetch keuken analyses data',
  };
}

// ============================================
// WORKER METRICS QUERIES
// ============================================

export interface WorkerSalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTicketValue: number;
  totalItems: number;
}

export interface WorkerHoursBreakdown {
  gewerkt: number;
  ziek: number;
  verlof: number;
  total: number;
}

export interface WorkerLaborCost {
  totalCost: number;
  totalHours: number;
  averageHourlyCost: number;
}

export interface WorkerHoursSummary {
  totalHours: number;
  workedHours: number;
  leaveHours: number;
  sickHours: number;
  averageHoursPerDay: number;
}

/**
 * Get worker sales summary
 */
export async function getWorkerSales(
  workerName: string,
  startDate: string,
  endDate: string
): Promise<WorkerSalesSummary> {
  const query = `
    query GetWorkerSales($workerName: String!, $startDate: String!, $endDate: String!) {
      workerSales(workerName: $workerName, startDate: $startDate, endDate: $endDate) {
        totalRevenue
        totalTransactions
        averageTicketValue
        totalItems
      }
    }
  `;

  const result = await executeGraphQL<{ workerSales: WorkerSalesSummary }>(
    query,
    { workerName, startDate, endDate }
  );

  return result.data?.workerSales || {
    totalRevenue: 0,
    totalTransactions: 0,
    averageTicketValue: 0,
    totalItems: 0,
  };
}

/**
 * Get worker hours breakdown
 */
export async function getWorkerHours(
  eitjeUserId: number,
  startDate: string,
  endDate: string
): Promise<WorkerHoursBreakdown> {
  const query = `
    query GetWorkerHours($eitjeUserId: Int!, $startDate: String!, $endDate: String!) {
      workerHours(eitjeUserId: $eitjeUserId, startDate: $startDate, endDate: $endDate) {
        gewerkt
        ziek
        verlof
        total
      }
    }
  `;

  const result = await executeGraphQL<{ workerHours: WorkerHoursBreakdown }>(
    query,
    { eitjeUserId, startDate, endDate }
  );

  return result.data?.workerHours || {
    gewerkt: 0,
    ziek: 0,
    verlof: 0,
    total: 0,
  };
}

/**
 * Get worker labor cost
 */
export async function getWorkerLaborCost(
  eitjeUserId: number,
  startDate: string,
  endDate: string
): Promise<WorkerLaborCost> {
  const query = `
    query GetWorkerLaborCost($eitjeUserId: Int!, $startDate: String!, $endDate: String!) {
      workerLaborCost(eitjeUserId: $eitjeUserId, startDate: $startDate, endDate: $endDate) {
        totalCost
        totalHours
        averageHourlyCost
      }
    }
  `;

  const result = await executeGraphQL<{ workerLaborCost: WorkerLaborCost }>(
    query,
    { eitjeUserId, startDate, endDate }
  );

  return result.data?.workerLaborCost || {
    totalCost: 0,
    totalHours: 0,
    averageHourlyCost: 0,
  };
}

/**
 * Get worker hours summary
 */
export async function getWorkerHoursSummary(
  eitjeUserId: number,
  contractHours: number | null,
  contractStartDate: string,
  contractEndDate: string | null,
  startDate: string,
  endDate: string
): Promise<WorkerHoursSummary> {
  const query = `
    query GetWorkerHoursSummary(
      $eitjeUserId: Int!
      $contractHours: Float
      $contractStartDate: String
      $contractEndDate: String
      $startDate: String!
      $endDate: String!
    ) {
      workerHoursSummary(
        eitjeUserId: $eitjeUserId
        contractHours: $contractHours
        contractStartDate: $contractStartDate
        contractEndDate: $contractEndDate
        startDate: $startDate
        endDate: $endDate
      ) {
        totalHours
        workedHours
        leaveHours
        sickHours
        averageHoursPerDay
      }
    }
  `;

  const result = await executeGraphQL<{ workerHoursSummary: WorkerHoursSummary }>(
    query,
    { eitjeUserId, contractHours, contractStartDate, contractEndDate, startDate, endDate }
  );

  return result.data?.workerHoursSummary || {
    totalHours: 0,
    workedHours: 0,
    leaveHours: 0,
    sickHours: 0,
    averageHoursPerDay: 0,
  };
}

// ============================================
// LABOR PRODUCTIVITY ENHANCED (GraphQL ONLY)
// ============================================

export interface LaborProductivityEnhancedResponse {
  success: boolean;
  records: Array<{
    id: string;
    period: string;
    periodType: string;
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
    division?: string;
    teamCategory?: string;
    subTeam?: string;
    workerId?: string;
    workerName?: string;
    ordersCount?: number;
    salesCount?: number;
    productivityScore?: number;
    goalStatus?: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
  error?: string;
  byDivision?: any[];
  byTeamCategory?: any[];
  byWorker?: Array<{
    id: string;
    period: string;
    periodType: string;
    locationId?: string;
    locationName?: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    revenuePerHour: number;
    laborCostPercentage: number;
    teamCategory?: string;
    subTeam?: string;
    workerId?: string;
    workerName?: string;
    productivityScore?: number;
    goalStatus?: string;
  }>;
}

/**
 * Get labor productivity enhanced data via GraphQL
 * ✅ Uses aggregated collections only
 */
export async function getLaborProductivityEnhanced(
  startDate: string,
  endDate: string,
  periodType: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR',
  locationId?: string,
  filters?: {
    division?: 'TOTAL' | 'FOOD' | 'BEVERAGE';
    teamCategory?: 'KITCHEN' | 'SERVICE' | 'MANAGEMENT' | 'OTHER';
    subTeam?: string;
    workerId?: string;
  },
  page: number = 1,
  limit: number = 50
): Promise<LaborProductivityEnhancedResponse> {
  const query = `
    query GetLaborProductivityEnhanced(
      $startDate: String!
      $endDate: String!
      $periodType: PeriodType!
      $locationId: ID
      $filters: ProductivityEnhancedFilters
      $page: Int
      $limit: Int
    ) {
      laborProductivityEnhanced(
        startDate: $startDate
        endDate: $endDate
        periodType: $periodType
        locationId: $locationId
        filters: $filters
        page: $page
        limit: $limit
      ) {
        success
        records {
          id
          period
          periodType
          locationId
          locationName
          teamId
          teamName
          totalHoursWorked
          totalWageCost
          totalRevenue
          revenuePerHour
          laborCostPercentage
          recordCount
          division
          teamCategory
          subTeam
          workerId
          workerName
          ordersCount
          salesCount
          productivityScore
          goalStatus
        }
        total
        page
        totalPages
        error
        byDivision {
          id
          period
          periodType
          locationId
          locationName
          totalHoursWorked
          totalWageCost
          totalRevenue
          revenuePerHour
          laborCostPercentage
          division
          goalStatus
        }
        byTeamCategory {
          id
          period
          periodType
          locationId
          locationName
          totalHoursWorked
          totalWageCost
          totalRevenue
          revenuePerHour
          laborCostPercentage
          teamCategory
          subTeam
          goalStatus
        }
        byWorker {
          id
          period
          periodType
          locationId
          locationName
          totalHoursWorked
          totalWageCost
          totalRevenue
          revenuePerHour
          laborCostPercentage
          teamCategory
          subTeam
          workerId
          workerName
          productivityScore
          goalStatus
        }
      }
    }
  `;

  const result = await executeGraphQL<{ laborProductivityEnhanced: LaborProductivityEnhancedResponse }>(
    query,
    { startDate, endDate, periodType, locationId, filters, page, limit }
  );

  return result.data?.laborProductivityEnhanced || {
    success: false,
    records: [],
    byWorker: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: 'Failed to fetch productivity data',
  };
}

// ============================================
// COMPANY SETTINGS
// ============================================

export interface CompanySettings {
  id: string;
  workingDayStartHour: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get company settings
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const query = `
    query GetCompanySettings {
      companySettings {
        id
        workingDayStartHour
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ companySettings: CompanySettings }>(query);
  return result.data?.companySettings || {
    id: 'default',
    workingDayStartHour: 6,
  };
}

