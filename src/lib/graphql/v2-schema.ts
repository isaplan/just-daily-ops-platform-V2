/**
 * GraphQL Schema - V2
 * 
 * Type definitions for GraphQL API
 * Based on Next.js app requirements
 */

export const typeDefs = `#graphql
  scalar Date
  scalar JSON

  # ============================================
  # CORE TYPES
  # ============================================

  type Location {
    id: ID!
    name: String!
    code: String
    address: String
    city: String
    country: String
    isActive: Boolean!
    users: [User!]!
    teams: [Team!]!
    salesData(dateRange: DateRange): [SalesData!]!
    laborData(dateRange: DateRange): [LaborData!]!
    dashboard(date: String!): DashboardData
    createdAt: Date!
    updatedAt: Date!
  }

  type User {
    id: ID!
    firstName: String
    lastName: String
    email: String
    phone: String
    employeeNumber: String
    hireDate: Date
    isActive: Boolean!
    locations: [Location!]!
    teams: [Team!]!
    systemMappings: [SystemMapping!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type Team {
    id: ID!
    name: String!
    description: String
    teamType: String
    isActive: Boolean!
    locations: [Location!]!
    members: [User!]!
    systemMappings: [SystemMapping!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type SystemMapping {
    system: String!
    externalId: String!
    rawData: JSON
  }

  # ============================================
  # API CREDENTIALS
  # ============================================

  type ApiCredential {
    id: ID!
    locationId: ID
    provider: String!
    apiKey: String
    apiSecret: String
    baseUrl: String
    additionalConfig: JSON
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  input ApiCredentialInput {
    locationId: ID
    provider: String!
    apiKey: String
    apiSecret: String
    baseUrl: String
    additionalConfig: JSON
    isActive: Boolean
  }

  # ============================================
  # DATA TYPES
  # ============================================

  type SalesData {
    id: ID!
    location: Location!
    date: Date!
    totalRevenue: Float!
    totalQuantity: Float!
    totalTransactions: Int!
    avgRevenuePerTransaction: Float!
    revenueByCategory: JSON
    revenueByPaymentMethod: JSON
    rawData: JSON
    createdAt: Date!
  }

  type LaborData {
    id: ID!
    location: Location!
    date: Date!
    totalHoursWorked: Float!
    totalWageCost: Float!
    totalRevenue: Float!
    laborCostPercentage: Float!
    revenuePerHour: Float!
    teamStats: [TeamStats!]
    createdAt: Date!
  }

  type TeamStats {
    team: Team!
    hours: Float!
    cost: Float!
  }

  # Paginated response types for aggregated data
  type SalesAggregatedResponse {
    success: Boolean!
    records: [SalesData!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  type LaborAggregatedResponse {
    success: Boolean!
    records: [LaborData!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  # ============================================
  # LABOR HOURS TYPES
  # ============================================

  type ProcessedHoursRecord {
    id: ID!
    eitje_id: Int
    date: String!
    user_id: Int
    user_name: String
    environment_id: Int
    environment_name: String
    team_id: Int
    team_name: String
    start: String
    end: String
    break_minutes: Int
    worked_hours: Float
    hourly_wage: Float
    wage_cost: Float
    type_name: String
    shift_type: String
    remarks: String
    approved: Boolean
    planning_shift_id: Int
    exported_to_hr_integration: Boolean
    updated_at: String
    created_at: String
  }

  type AggregatedHoursRecord {
    id: ID!
    date: String!
    user_id: Int
    user_name: String
    environment_id: Int
    environment_name: String
    team_id: Int
    team_name: String
    hours_worked: Float!
    hourly_rate: Float
    hourly_cost: Float
    labor_cost: Float
    shift_count: Int
    total_breaks_minutes: Int
    updated_at: String
    created_at: String
  }

  type HoursResponse {
    success: Boolean!
    records: [ProcessedHoursRecord!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  type AggregatedHoursResponse {
    success: Boolean!
    records: [AggregatedHoursRecord!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  # ============================================
  # WORKER PROFILES TYPES
  # ============================================

  type TeamMembership {
    team_id: String
    team_name: String!
    team_type: String
    is_active: Boolean!
  }

  type WorkerProfile {
    id: ID!
    eitjeUserId: Int!
    userName: String
    teamName: String
    teams: [TeamMembership!]
    locationId: String
    locationName: String
    contractType: String
    contractHours: Float
    hourlyWage: Float
    wageOverride: Boolean!
    effectiveFrom: String
    effectiveTo: String
    notes: String
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type WorkerProfilesResponse {
    success: Boolean!
    records: [WorkerProfile!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  input WorkerProfileInput {
    eitjeUserId: Int!
    locationId: String
    contractType: String
    contractHours: Float
    hourlyWage: Float
    wageOverride: Boolean
    effectiveFrom: String
    effectiveTo: String
    notes: String
  }

  input WorkerProfileFilters {
    locationId: String
    teamId: String
    contractType: String
    activeOnly: Boolean
  }

  # ============================================
  # SALES TYPES
  # ============================================

  type BorkSalesRecord {
    id: ID!
    date: String!
    location_id: String
    location_name: String
    ticket_key: String
    ticket_number: String
    order_key: String
    order_line_key: String
    product_name: String
    product_sku: String
    product_number: Int
    category: String
    group_name: String
    quantity: Float
    unit_price: Float
    total_ex_vat: Float
    total_inc_vat: Float
    vat_rate: Float
    vat_amount: Float
    cost_price: Float
    payment_method: String
    table_number: Int
    waiter_name: String
    time: String
    created_at: String
  }

  type DailySalesResponse {
    success: Boolean!
    records: [BorkSalesRecord!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  # ============================================
  # CATEGORIES & PRODUCTS TYPES
  # ============================================

  type TimePeriodTotals {
    quantity: Float!
    revenueExVat: Float!
    revenueIncVat: Float!
    transactionCount: Int!
  }

  type ProductAggregate {
    productName: String!
    daily: TimePeriodTotals!
    weekly: TimePeriodTotals!
    monthly: TimePeriodTotals!
    total: TimePeriodTotals!
    workloadLevel: String
    workloadMinutes: Float
    mepLevel: String
    mepMinutes: Float
    courseType: String
  }

  type CategoryAggregate {
    categoryName: String!
    mainCategoryName: String
    products: [ProductAggregate!]!
    daily: TimePeriodTotals!
    weekly: TimePeriodTotals!
    monthly: TimePeriodTotals!
    total: TimePeriodTotals!
  }

  type MainCategoryAggregate {
    mainCategoryName: String!
    categories: [CategoryAggregate!]!
    daily: TimePeriodTotals!
    weekly: TimePeriodTotals!
    monthly: TimePeriodTotals!
    total: TimePeriodTotals!
  }

  type CategoriesProductsResponse {
    success: Boolean!
    categories: [CategoryAggregate!]!
    mainCategories: [MainCategoryAggregate!]
    totals: TimePeriodTotals!
    error: String
  }

  type PnLData {
    id: ID!
    location: Location!
    year: Int!
    month: Int!
    totalRevenue: Float!
    totalCosts: Float!
    grossProfit: Float!
    operatingExpenses: Float!
    netProfit: Float!
    categoryBreakdown: JSON
    createdAt: Date!
  }

  # ============================================
  # DASHBOARD TYPES
  # ============================================

  type DashboardData {
    id: ID!
    location: Location!
    date: Date!
    sales: SalesMetrics!
    labor: LaborMetrics!
    productivity: ProductivityMetrics!
    pnl: PnLMetrics
    createdAt: Date!
    updatedAt: Date!
  }

  type SalesMetrics {
    totalRevenue: Float!
    transactionCount: Int!
    avgTransactionValue: Float!
  }

  type LaborMetrics {
    totalHours: Float!
    totalCost: Float!
    employeeCount: Int!
  }

  type ProductivityMetrics {
    revenuePerHour: Float!
    laborCostPercentage: Float!
    efficiencyScore: Float!
  }

  type PnLMetrics {
    revenue: Float!
    costs: Float!
    profit: Float!
  }

  # ============================================
  # INPUT TYPES
  # ============================================

  input DateRange {
    start: String!
    end: String!
  }

  input HoursFilters {
    locationId: String
    environmentId: Int
    teamName: String
    userId: Int
    typeName: String
  }

  input SalesFilters {
    locationId: String
    category: String
    productName: String
  }

  input CategoriesProductsFilters {
    locationId: String
    category: String
    productName: String
  }

  # ============================================
  # SALES AGGREGATION TYPES
  # ============================================

  type WaiterPerformance {
    waiter_name: String!
    location_id: String
    location_name: String
    total_revenue: Float!
    total_transactions: Int!
    total_items_sold: Float!
    average_ticket_value: Float!
    average_items_per_transaction: Float!
  }

  type WaiterPerformanceResponse {
    success: Boolean!
    records: [WaiterPerformance!]!
    total: Int!
    error: String
  }

  type RevenueBreakdown {
    date: String!
    location_id: String
    location_name: String
    total_revenue_ex_vat: Float!
    total_revenue_inc_vat: Float!
    total_vat: Float!
    total_transactions: Int!
    average_transaction_value: Float!
    gross_profit: Float
  }

  type RevenueBreakdownResponse {
    success: Boolean!
    records: [RevenueBreakdown!]!
    total: Int!
    error: String
  }

  type PaymentMethodStats {
    payment_method: String!
    location_id: String
    location_name: String
    total_revenue: Float!
    total_transactions: Int!
    average_transaction_value: Float!
    percentage_of_total: Float!
  }

  type PaymentMethodStatsResponse {
    success: Boolean!
    records: [PaymentMethodStats!]!
    total: Int!
    error: String
  }

  type ProductPerformance {
    product_name: String!
    category: String
    location_id: String
    location_name: String
    total_quantity_sold: Float!
    total_revenue: Float!
    total_profit: Float
    average_unit_price: Float!
    transaction_count: Int!
  }

  type ProductPerformanceResponse {
    success: Boolean!
    records: [ProductPerformance!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  type TimeBasedAnalysis {
    hour: Int!
    location_id: String
    location_name: String
    total_revenue: Float!
    total_transactions: Int!
    total_items_sold: Float!
    average_transaction_value: Float!
  }

  type TimeBasedAnalysisResponse {
    success: Boolean!
    records: [TimeBasedAnalysis!]!
    total: Int!
    error: String
  }

  type TableAnalysis {
    table_number: Int!
    location_id: String
    location_name: String
    total_revenue: Float!
    total_transactions: Int!
    total_items_sold: Float!
    average_transaction_value: Float!
    turnover_rate: Float
  }

  type TableAnalysisResponse {
    success: Boolean!
    records: [TableAnalysis!]!
    total: Int!
    error: String
  }

  type TransactionAnalysis {
    ticket_number: String!
    date: String!
    location_id: String
    location_name: String
    table_number: Int
    waiter_name: String
    payment_method: String
    time: String
    total_revenue: Float!
    total_items: Float!
    item_count: Int!
  }

  type TransactionAnalysisResponse {
    success: Boolean!
    records: [TransactionAnalysis!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  # ============================================
  # DIAGNOSTICS
  # ============================================

  type TeamDataDiagnostics {
    teamsCount: Int!
    shiftsWithTeamsCount: Int!
    uniqueTeamsCount: Int!
    uniqueTeamNames: [String!]!
    workerProfilesCount: Int!
    recommendations: [String!]!
    sampleTeam: JSON
    sampleShift: JSON
  }

  # ============================================
  # KEUKEN ANALYSES TYPES
  # ============================================

  type ProductProduction {
    productName: String!
    category: String
    totalQuantity: Float!
    workloadLevel: String!
    workloadMinutes: Float!
    totalWorkloadMinutes: Float!
  }

  type WorkerActivity {
    unifiedUserId: ID!
    workerName: String!
    teamName: String
    hours: [Int!]!
    isKitchenWorker: Boolean!
  }

  type WorkloadByHour {
    hour: Int!
    totalWorkloadMinutes: Float!
    productCount: Float!
    activeWorkers: Int!
  }

  type WorkloadByWorker {
    unifiedUserId: ID!
    workerName: String!
    teamName: String
    totalWorkloadMinutes: Float!
    productCount: Float!
  }

  type WorkloadByRange {
    timeRange: String!
    totalWorkloadMinutes: Float!
    productCount: Float!
    activeWorkers: Int!
  }

  type KeukenAnalysesKPIs {
    totalOrders: Int!
    totalProductsProduced: Float!
    totalWorkloadMinutes: Float!
    averageWorkloadPerHour: Float!
    peakHour: String!
    peakTimeRange: String!
    averageWorkersPerHour: Float!
  }

  type KeukenAnalysesData {
    locationId: ID!
    date: Date!
    timeRange: String!
    productProduction: [ProductProduction!]!
    workerActivity: [WorkerActivity!]!
    workloadByHour: [WorkloadByHour!]!
    workloadByWorker: [WorkloadByWorker!]!
    workloadByRange: [WorkloadByRange!]!
    kpis: KeukenAnalysesKPIs!
  }

  type KeukenAnalysesResponse {
    success: Boolean!
    records: [KeukenAnalysesData!]!
    total: Int!
    error: String
  }

  input TimeRangeFilter {
    filter: String # "all" | "lunch" | "dinner" | "afternoon-drinks" | "after-drinks"
  }

  # ============================================
  # QUERIES
  # ============================================

  type Query {
    # Diagnostics
    checkTeamData: TeamDataDiagnostics!
    
    # Locations
    locations: [Location!]!
    location(id: ID!): Location
    
    # Users
    users(locationId: ID): [User!]!
    user(id: ID!): User
    
    # Teams
    teams(locationId: ID): [Team!]!
    team(id: ID!): Team
    
    # Dashboard queries
    dashboard(
      locationId: ID!
      startDate: String!
      endDate: String!
    ): [DashboardData!]!
    
    # Aggregated data (with pagination)
    salesAggregated(
      locationId: ID!
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
    ): SalesAggregatedResponse!
    
    laborAggregated(
      locationId: ID!
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
    ): LaborAggregatedResponse!
    
    pnlData(
      locationId: ID!
      year: Int!
      month: Int
    ): [PnLData!]!
    
    # Labor Hours (detailed)
    processedHours(
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
      filters: HoursFilters
    ): HoursResponse!
    
    aggregatedHours(
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
      filters: HoursFilters
    ): AggregatedHoursResponse!
    
    # Products Catalog
    products(page: Int, limit: Int, filters: ProductFilters): ProductsResponse!
    product(id: ID!): Product
    productByName(productName: String!): Product
    
    # Daily Sales
    dailySales(
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
      filters: SalesFilters
    ): DailySalesResponse!
    
    # Categories & Products
    categoriesProductsAggregate(
      startDate: String!
      endDate: String!
      filters: CategoriesProductsFilters
    ): CategoriesProductsResponse!
    
    # Sales Aggregations
    waiterPerformance(
      startDate: String!
      endDate: String!
      filters: SalesFilters
    ): WaiterPerformanceResponse!
    
    revenueBreakdown(
      startDate: String!
      endDate: String!
      filters: SalesFilters
    ): RevenueBreakdownResponse!
    
    paymentMethodStats(
      startDate: String!
      endDate: String!
      filters: SalesFilters
    ): PaymentMethodStatsResponse!
    
    productPerformance(
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
      filters: SalesFilters
    ): ProductPerformanceResponse!
    
    # Analysis Pages
    timeBasedAnalysis(
      startDate: String!
      endDate: String!
      filters: SalesFilters
    ): TimeBasedAnalysisResponse!
    
    tableAnalysis(
      startDate: String!
      endDate: String!
      filters: SalesFilters
    ): TableAnalysisResponse!
    
    transactionAnalysis(
      startDate: String!
      endDate: String!
      page: Int
      limit: Int
      filters: SalesFilters
    ): TransactionAnalysisResponse!
    
    # Worker Profiles
    workerProfiles(
      year: Int!
      month: Int
      day: Int
      page: Int
      limit: Int
      filters: WorkerProfileFilters
    ): WorkerProfilesResponse!
    
    workerProfile(id: ID!): WorkerProfile
    
    # API Credentials
    apiCredentials(provider: String, locationId: ID): [ApiCredential!]!
    apiCredential(id: ID!): ApiCredential
    
    # Keuken Analyses
    keukenAnalyses(
      locationId: ID!
      startDate: String!
      endDate: String!
      timeRangeFilter: String
      selectedWorkerId: ID
    ): KeukenAnalysesResponse!
  }

  # ============================================
  # MUTATIONS (for future use)
  # ============================================

  # ============================================
  # PRODUCT CATALOG TYPES
  # ============================================

  type Product {
    id: ID!
    productName: String!
    category: String
    workloadLevel: String! # "low" | "mid" | "high"
    workloadMinutes: Float!
    mepLevel: String! # "low" | "mid" | "high"
    mepMinutes: Float!
    courseType: String # "snack" | "voorgerecht" | "hoofdgerecht" | "nagerecht" | "bijgerecht" | "drank" | "overig"
    isActive: Boolean!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type ProductsResponse {
    success: Boolean!
    records: [Product!]!
    total: Int!
    page: Int!
    totalPages: Int!
    error: String
  }

  input ProductInput {
    productName: String!
    category: String
    workloadLevel: String! # "low" | "mid" | "high"
    mepLevel: String! # "low" | "mid" | "high"
    courseType: String # "snack" | "voorgerecht" | "hoofdgerecht" | "nagerecht" | "bijgerecht" | "drank" | "overig"
    notes: String
    isActive: Boolean
  }

  input ProductUpdateInput {
    productName: String
    category: String
    workloadLevel: String
    mepLevel: String
    courseType: String # "snack" | "voorgerecht" | "hoofdgerecht" | "nagerecht" | "bijgerecht" | "drank" | "overig"
    notes: String
    isActive: Boolean
  }

  input ProductFilters {
    category: String
    workloadLevel: String
    mepLevel: String
    isActive: Boolean
    search: String # Search by product name
  }

  type Mutation {
    # Worker Profiles
    createWorkerProfile(input: WorkerProfileInput!): WorkerProfile!
    updateWorkerProfile(id: ID!, input: WorkerProfileInput!): WorkerProfile!
    deleteWorkerProfile(id: ID!): Boolean!
    
    # API Credentials
    createApiCredential(input: ApiCredentialInput!): ApiCredential!
    updateApiCredential(id: ID!, input: ApiCredentialInput!): ApiCredential!
    deleteApiCredential(id: ID!): Boolean!
    
    # Products
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductUpdateInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }
`;

