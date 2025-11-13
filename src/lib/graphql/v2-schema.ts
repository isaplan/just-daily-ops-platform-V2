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
    teamStats: [TeamStats!]!
    createdAt: Date!
  }

  type TeamStats {
    team: Team!
    hours: Float!
    cost: Float!
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

  # ============================================
  # QUERIES
  # ============================================

  type Query {
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
    
    # Aggregated data
    salesAggregated(
      locationId: ID!
      startDate: String!
      endDate: String!
    ): [SalesData!]!
    
    laborAggregated(
      locationId: ID!
      startDate: String!
      endDate: String!
    ): [LaborData!]!
    
    pnlData(
      locationId: ID!
      year: Int!
      month: Int
    ): [PnLData!]!
  }

  # ============================================
  # MUTATIONS (for future use)
  # ============================================

  type Mutation {
    # Placeholder for future mutations
    _empty: String
  }
`;

