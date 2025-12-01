# 🏗️ COMPREHENSIVE REBUILD PLAN

## 📋 Overview

This document outlines the complete rebuild plan for the Just Daily Ops Platform, following the established patterns, architecture, and best practices.

**Rebuild Order:**
1. **Foundation Layer** - Unified Worker, Team, Location
2. **Hours (Labor) Data** - Raw + Aggregated
3. **Sales Data** - Raw + Aggregated
4. **Pages & UI** - Following MVVM + SSR patterns

---

## 🎯 PHASE 1: FOUNDATION LAYER

### 1.1 Core Collections (MongoDB)

#### **Collections to Create:**

**1. `locations` Collection**
```typescript
interface Location {
  _id: ObjectId;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country: string;
  isActive: boolean;
  systemMappings?: SystemMapping[]; // For multi-system support
  createdAt: Date;
  updatedAt: Date;
}
```

**2. `unified_users` Collection**
```typescript
interface UnifiedUser {
  _id: ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeNumber?: string;
  hireDate?: Date;
  isActive: boolean;
  notes?: string;
  // Relationships
  locationIds: ObjectId[]; // Many-to-many with locations
  teamIds: ObjectId[]; // Many-to-many with teams
  // System mappings (denormalized for fast queries)
  systemMappings: SystemMapping[]; // [{ system: 'eitje', externalId: '123' }, { system: 'bork', externalId: '456' }]
  createdAt: Date;
  updatedAt: Date;
}
```

**3. `unified_teams` Collection**
```typescript
interface UnifiedTeam {
  _id: ObjectId;
  name: string;
  description?: string;
  teamType?: string; // 'kitchen', 'service', 'management', etc.
  isActive: boolean;
  // Relationships
  locationIds: ObjectId[]; // Many-to-many with locations
  memberIds: ObjectId[]; // References to unified_users
  // System mappings
  systemMappings: SystemMapping[]; // [{ system: 'eitje', externalId: '789' }]
  createdAt: Date;
  updatedAt: Date;
}
```

**4. `api_credentials` Collection**
```typescript
interface ApiCredentials {
  _id: ObjectId;
  locationId: ObjectId;
  provider: string; // 'bork', 'eitje', 'api3', 'api4'
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>; // For complex auth (Eitje's 4-credential system)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 MongoDB Indexes

**Create indexes for performance:**
```typescript
// locations
{ name: 1 }
{ code: 1 }
{ isActive: 1 }

// unified_users
{ 'systemMappings.system': 1, 'systemMappings.externalId': 1 } // Compound index for fast lookups
{ locationIds: 1 }
{ teamIds: 1 }
{ isActive: 1 }
{ email: 1 } // Unique index

// unified_teams
{ 'systemMappings.system': 1, 'systemMappings.externalId': 1 }
{ locationIds: 1 }
{ memberIds: 1 }
{ isActive: 1 }

// api_credentials
{ locationId: 1, provider: 1 } // Compound unique index
{ isActive: 1 }
```

### 1.3 GraphQL Schema & Resolvers

**GraphQL Types:**
```graphql
type Location {
  id: ID!
  name: String!
  code: String
  address: String
  city: String
  country: String!
  isActive: Boolean!
  systemMappings: [SystemMapping!]!
  createdAt: String!
  updatedAt: String!
}

type UnifiedUser {
  id: ID!
  firstName: String
  lastName: String
  email: String
  phone: String
  employeeNumber: String
  hireDate: String
  isActive: Boolean!
  notes: String
  locationIds: [ID!]!
  teamIds: [ID!]!
  systemMappings: [SystemMapping!]!
  # Resolved relationships
  locations: [Location!]!
  teams: [UnifiedTeam!]!
  createdAt: String!
  updatedAt: String!
}

type UnifiedTeam {
  id: ID!
  name: String!
  description: String
  teamType: String
  isActive: Boolean!
  locationIds: [ID!]!
  memberIds: [ID!]!
  systemMappings: [SystemMapping!]!
  # Resolved relationships
  locations: [Location!]!
  members: [UnifiedUser!]!
  createdAt: String!
  updatedAt: String!
}

type SystemMapping {
  system: String! # 'eitje', 'bork', etc.
  externalId: String!
  rawData: JSON
}
```

**GraphQL Queries:**
```graphql
type Query {
  locations: [Location!]!
  location(id: ID!): Location
  
  unifiedUsers(filters: UserFilters): [UnifiedUser!]!
  unifiedUser(id: ID!): UnifiedUser
  unifiedUserBySystemMapping(system: String!, externalId: String!): UnifiedUser
  
  unifiedTeams(filters: TeamFilters): [UnifiedTeam!]!
  unifiedTeam(id: ID!): UnifiedTeam
  unifiedTeamBySystemMapping(system: String!, externalId: String!): UnifiedTeam
}
```

**GraphQL Mutations:**
```graphql
type Mutation {
  createLocation(input: LocationInput!): Location!
  updateLocation(id: ID!, input: LocationInput!): Location!
  deleteLocation(id: ID!): Boolean!
  
  createUnifiedUser(input: UnifiedUserInput!): UnifiedUser!
  updateUnifiedUser(id: ID!, input: UnifiedUserInput!): UnifiedUser!
  deleteUnifiedUser(id: ID!): Boolean!
  
  createUnifiedTeam(input: UnifiedTeamInput!): UnifiedTeam!
  updateUnifiedTeam(id: ID!, input: UnifiedTeamInput!): UnifiedTeam!
  deleteUnifiedTeam(id: ID!): Boolean!
}
```

### 1.4 Services Layer

**File Structure:**
```
src/lib/services/
  foundation/
    locations.service.ts      # Location CRUD operations
    unified-users.service.ts  # User CRUD + system mapping lookups
    unified-teams.service.ts  # Team CRUD + member management
    api-credentials.service.ts # API credential management
```

**Key Functions:**
- `getLocationById(id: string): Promise<Location>`
- `getUnifiedUserBySystemMapping(system: string, externalId: string): Promise<UnifiedUser | null>`
- `getUnifiedTeamBySystemMapping(system: string, externalId: string): Promise<UnifiedTeam | null>`
- `syncSystemMappings(userId: string, system: string, externalId: string): Promise<void>`

### 1.5 Models & ViewModels

**Models:**
```
src/models/foundation/
  location.model.ts
  unified-user.model.ts
  unified-team.model.ts
```

**ViewModels:**
```
src/viewmodels/foundation/
  useLocationsViewModel.ts
  useUnifiedUsersViewModel.ts
  useUnifiedTeamsViewModel.ts
```

---

## ⏰ PHASE 2: HOURS (LABOR) DATA

### 2.1 Raw Data Collection

**Collection: `eitje_raw_data`**
```typescript
interface EitjeRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  environmentId?: number; // Eitje's environment ID
  date: Date;
  endpoint: string; // 'time_registration_shifts', 'revenue_days', etc.
  // Store entire raw API response
  rawApiResponse: Record<string, any>;
  // Extracted/normalized fields for querying
  extracted: {
    userId?: number; // Eitje user ID
    unifiedUserId?: ObjectId; // Resolved from system mappings
    teamId?: number; // Eitje team ID
    unifiedTeamId?: ObjectId; // Resolved from system mappings
    hoursWorked?: number;
    wageCost?: number;
    revenue?: number;
    shiftStart?: Date;
    shiftEnd?: Date;
    // ... other extracted fields
  };
  importId?: string; // For tracking sync batches
  createdAt: Date;
}
```

**Indexes:**
```typescript
{ locationId: 1, date: -1 } // Compound index for fast date range queries
{ date: -1 }
{ 'extracted.unifiedUserId': 1, date: -1 }
{ 'extracted.unifiedTeamId': 1, date: -1 }
{ importId: 1 }
{ createdAt: -1 }
```

### 2.2 Aggregated Data Collection

**Collection: `eitje_aggregated`**
```typescript
interface EitjeAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized for fast queries
  date: Date;
  
  // Daily totals
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  laborCostPercentage: number;
  revenuePerHour: number;
  
  // Team breakdown (denormalized with names)
  teamStats: Array<{
    teamId: ObjectId; // Reference to unified_teams
    teamName: string; // ✅ Denormalized
    hours: number;
    cost: number;
    memberCount: number;
  }>;
  
  // Worker breakdown (denormalized with names)
  workerStats: Array<{
    unifiedUserId: ObjectId; // Reference to unified_users
    userName: string; // ✅ Denormalized (from unified_users)
    eitjeUserId: number; // For reference
    hours: number;
    wageCost: number;
    teamId?: ObjectId;
    teamName?: string; // ✅ Denormalized
  }>;
  
  // Hierarchical time-series data (for fast historical queries)
  hoursByYear?: Array<{
    year: string; // "2025"
    totalHours: number;
    totalWageCost: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string; // ✅ Denormalized
      totalHours: number;
      totalWageCost: number;
      byTeam: Array<{
        teamId: ObjectId;
        teamName: string; // ✅ Denormalized
        totalHours: number;
        totalWageCost: number;
        byWorker: Array<{
          unifiedUserId: ObjectId;
          userName: string; // ✅ Denormalized
          totalHours: number;
          totalWageCost: number;
        }>;
      }>;
    }>;
  }>;
  
  hoursByMonth?: Array<{ /* Similar structure */ }>;
  hoursByWeek?: Array<{ /* Similar structure */ }>;
  hoursByDay?: Array<{ /* Similar structure */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```typescript
{ locationId: 1, date: -1 } // Compound index for fast queries
{ date: -1 }
{ 'teamStats.teamId': 1, date: -1 }
{ 'workerStats.unifiedUserId': 1, date: -1 }
```

### 2.3 Cron Job: Eitje Data Sync

**API Route: `/api/eitje/v2/sync`**

**Process:**
1. Fetch API credentials from `api_credentials` collection
2. For each active location with Eitje credentials:
   - Call Eitje API endpoints (time_registration_shifts, revenue_days, etc.)
   - Store raw responses in `eitje_raw_data`
   - Extract and normalize data
   - Resolve `unifiedUserId` and `unifiedTeamId` from system mappings
3. Return sync summary (records inserted, errors, etc.)

**Cron Schedule:**
- Hourly sync (yesterday's data)
- Daily full sync (last 7 days for data integrity)

### 2.4 Aggregation Service

**API Route: `/api/eitje/v2/aggregate`**

**Process:**
1. Read from `eitje_raw_data` collection
2. Group by: `locationId`, `date`, `unifiedUserId`, `unifiedTeamId`
3. **Denormalize data:**
   - Query `locations` collection ONCE → store `locationName`
   - Query `unified_users` collection ONCE → store `userName`
   - Query `unified_teams` collection ONCE → store `teamName`
4. Calculate aggregates:
   - Daily totals (hours, wage cost, revenue)
   - Team breakdowns
   - Worker breakdowns
   - Hierarchical time-series data (year/month/week/day)
5. Upsert to `eitje_aggregated` collection (merge, don't overwrite)

**Key Functions:**
```typescript
// src/lib/services/eitje/eitje-aggregation.service.ts
export async function aggregateEitjeData(
  startDate?: Date,
  endDate?: Date
): Promise<{ updated: number; errors: string[] }> {
  // 1. Fetch raw data
  // 2. Denormalize (locations, users, teams)
  // 3. Calculate aggregates
  // 4. Build hierarchical time-series
  // 5. Upsert to eitje_aggregated
}
```

### 2.5 GraphQL Resolvers

**GraphQL Types:**
```graphql
type LaborAggregated {
  id: ID!
  locationId: ID!
  locationName: String!
  date: String!
  totalHoursWorked: Float!
  totalWageCost: Float!
  totalRevenue: Float!
  laborCostPercentage: Float!
  revenuePerHour: Float!
  teamStats: [TeamStats!]!
  workerStats: [WorkerStats!]!
}

type TeamStats {
  teamId: ID!
  teamName: String!
  hours: Float!
  cost: Float!
  memberCount: Int!
}

type WorkerStats {
  unifiedUserId: ID!
  userName: String!
  eitjeUserId: Int!
  hours: Float!
  wageCost: Float!
  teamId: ID
  teamName: String
}
```

**GraphQL Query:**
```graphql
type Query {
  laborAggregated(
    locationId: ID
    startDate: String!
    endDate: String!
    teamId: ID
    workerId: ID
    page: Int = 1
    limit: Int = 50
  ): LaborAggregatedResponse!
}
```

**Resolver Implementation:**
```typescript
// ✅ CORRECT: Query aggregated collection only, no enrichment
laborAggregated: async (_, { locationId, startDate, endDate, ... }) => {
  const db = await getDatabase();
  const query: any = {
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  };
  if (locationId) query.locationId = new ObjectId(locationId);
  
  // ✅ Query aggregated collection (already has all data denormalized)
  const records = await db.collection('eitje_aggregated')
    .find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  
  // ✅ Return directly - no enrichment queries needed
  return {
    records: records.map(transformToGraphQLFormat),
    total: await db.collection('eitje_aggregated').countDocuments(query),
    page,
    totalPages: Math.ceil(total / limit)
  };
}
```

### 2.6 Services & ViewModels

**Services:**
```
src/lib/services/eitje/
  eitje-sync.service.ts        # Raw data sync from Eitje API
  eitje-aggregation.service.ts # Aggregate raw → aggregated
  eitje-api-client.ts          # Eitje API client (already exists)
```

**ViewModels:**
```
src/viewmodels/labor/
  useLaborAggregatedViewModel.ts # For dashboard pages
```

---

## 💰 PHASE 3: SALES DATA

### 3.1 Raw Data Collection

**Collection: `bork_raw_data`**
```typescript
interface BorkRawData {
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
    waiterName?: string;
    waiterId?: string; // Bork waiter ID
    unifiedUserId?: ObjectId; // Resolved from system mappings
    tableNumber?: number;
    paymentMethod?: string;
    ticketKey?: string;
    orderKey?: string;
    timestamp?: Date;
  };
  importId?: string; // For tracking sync batches
  createdAt: Date;
}
```

**Indexes:**
```typescript
{ locationId: 1, date: -1 } // Compound index
{ date: -1 }
{ 'extracted.productName': 1, date: -1 }
{ 'extracted.unifiedUserId': 1, date: -1 }
{ 'extracted.category': 1, date: -1 }
{ importId: 1 }
{ createdAt: -1 }
```

### 3.2 Aggregated Data Collection

**Collection: `bork_aggregated`**
```typescript
interface BorkAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Daily totals
  totalRevenue: number;
  totalQuantity: number;
  totalTransactions: number;
  avgRevenuePerTransaction: number;
  
  // Breakdowns (denormalized with names)
  revenueByCategory: Record<string, number>; // { "food": 1000, "drinks": 500 }
  revenueByPaymentMethod: Record<string, number>;
  
  // Detailed breakdowns
  paymentMethodBreakdown?: Array<{
    paymentMethod: string;
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    percentageOfTotal: number;
  }>;
  
  waiterBreakdown?: Array<{
    waiterName: string; // ✅ Denormalized
    unifiedUserId?: ObjectId; // Reference to unified_users
    totalRevenue: number;
    totalItemsSold: number;
    totalTransactions: number;
    averageTicketValue: number;
    averageItemsPerTransaction: number;
  }>;
  
  tableBreakdown?: Array<{
    tableNumber: number;
    totalRevenue: number;
    totalItemsSold: number;
    totalTransactions: number;
    averageTransactionValue: number;
  }>;
  
  hourlyBreakdown?: Array<{
    hour: number; // 0-23
    totalRevenue: number;
    totalItemsSold: number;
    totalTransactions: number;
    averageTransactionValue: number;
  }>;
  
  // Hierarchical time-series data
  salesByYear?: Array<{
    year: string;
    totalRevenue: number;
    totalQuantity: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string; // ✅ Denormalized
      totalRevenue: number;
      totalQuantity: number;
      byCategory: Array<{
        category: string;
        totalRevenue: number;
        totalQuantity: number;
      }>;
    }>;
  }>;
  
  salesByMonth?: Array<{ /* Similar structure */ }>;
  salesByWeek?: Array<{ /* Similar structure */ }>;
  salesByDay?: Array<{ /* Similar structure */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```typescript
{ locationId: 1, date: -1 } // Compound index
{ date: -1 }
{ 'waiterBreakdown.unifiedUserId': 1, date: -1 }
```

### 3.3 Products Aggregated Collection

**Collection: `products_aggregated`**
```typescript
interface ProductsAggregated {
  _id?: ObjectId;
  productName: string;
  locationId?: ObjectId; // Optional: location-specific product info
  locationName?: string; // ✅ Denormalized
  category?: string;
  
  // Sales statistics (from bork_raw_data)
  totalQuantitySold: number;
  totalRevenueExVat: number;
  totalRevenueIncVat: number;
  totalTransactionCount: number;
  averagePrice: number;
  priceHistory: Array<{
    date: Date;
    price: number;
    quantity: number;
  }>;
  
  // Location details (denormalized)
  locationDetails: Array<{
    locationId: ObjectId;
    locationName: string; // ✅ Denormalized
    lastSoldDate: Date;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  
  // Hierarchical time-series data
  salesByYear?: Array<{
    year: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string; // ✅ Denormalized
      totalQuantity: number;
      totalRevenue: number;
    }>;
  }>;
  
  salesByMonth?: Array<{ /* Similar structure */ }>;
  salesByWeek?: Array<{ /* Similar structure */ }>;
  salesByDate?: Array<{ /* Similar structure */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```typescript
{ productName: 1 } // Unique index
{ category: 1 }
{ 'locationDetails.locationId': 1 }
```

### 3.4 Cron Job: Bork Data Sync

**API Route: `/api/bork/v2/sync`**

**Process:**
1. Fetch API credentials from `api_credentials` collection
2. For each active location with Bork credentials:
   - Call Bork API endpoints
   - Store raw responses in `bork_raw_data`
   - Extract and normalize data
   - Resolve `unifiedUserId` from system mappings (for waiters)
3. Return sync summary

**Cron Schedule:**
- Hourly sync (yesterday's data)
- Daily full sync (last 7 days)

### 3.5 Aggregation Services

**API Route: `/api/bork/v2/aggregate`**

**Process:**
1. Read from `bork_raw_data` collection
2. Group by: `locationId`, `date`
3. **Denormalize data:**
   - Query `locations` collection ONCE → store `locationName`
   - Query `unified_users` collection ONCE → store `userName` (for waiters)
4. Calculate aggregates:
   - Daily totals
   - Category breakdowns
   - Payment method breakdowns
   - Waiter breakdowns
   - Table breakdowns
   - Hourly breakdowns
   - Hierarchical time-series data
5. Upsert to `bork_aggregated` collection

**API Route: `/api/products/aggregate`**

**Process:**
1. Read from `bork_raw_data` collection
2. Group by: `productName`, `locationId`
3. **Denormalize data:**
   - Query `locations` collection ONCE → store `locationName`
4. Calculate aggregates:
   - Product sales statistics
   - Price history
   - Location details
   - Hierarchical time-series data
5. Upsert to `products_aggregated` collection

### 3.6 GraphQL Resolvers

**GraphQL Types:**
```graphql
type SalesAggregated {
  id: ID!
  locationId: ID!
  locationName: String!
  date: String!
  totalRevenue: Float!
  totalQuantity: Int!
  totalTransactions: Int!
  avgRevenuePerTransaction: Float!
  revenueByCategory: JSON!
  revenueByPaymentMethod: JSON!
  paymentMethodBreakdown: [PaymentMethodBreakdown!]!
  waiterBreakdown: [WaiterBreakdown!]!
  tableBreakdown: [TableBreakdown!]!
  hourlyBreakdown: [HourlyBreakdown!]!
}

type Product {
  id: ID!
  productName: String!
  category: String
  totalQuantitySold: Int!
  totalRevenueExVat: Float!
  totalRevenueIncVat: Float!
  averagePrice: Float!
  locationDetails: [ProductLocationDetail!]!
}
```

**GraphQL Queries:**
```graphql
type Query {
  salesAggregated(
    locationId: ID
    startDate: String!
    endDate: String!
    page: Int = 1
    limit: Int = 50
  ): SalesAggregatedResponse!
  
  products(
    filters: ProductFilters
    page: Int = 1
    limit: Int = 50
  ): ProductsResponse!
  
  product(productName: String!): Product
}
```

**Resolver Implementation:**
```typescript
// ✅ CORRECT: Query aggregated collection only
salesAggregated: async (_, { locationId, startDate, endDate, ... }) => {
  const db = await getDatabase();
  const query: any = {
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  };
  if (locationId) query.locationId = new ObjectId(locationId);
  
  // ✅ Query aggregated collection (already denormalized)
  const records = await db.collection('bork_aggregated')
    .find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  
  // ✅ Return directly - no enrichment
  return transformToGraphQLFormat(records);
}
```

### 3.7 Services & ViewModels

**Services:**
```
src/lib/services/bork/
  bork-sync.service.ts        # Raw data sync from Bork API
  bork-aggregation.service.ts # Aggregate raw → bork_aggregated
  bork-api-client.ts          # Bork API client (already exists)

src/lib/services/products/
  products-aggregation.service.ts # Aggregate raw → products_aggregated
```

**ViewModels:**
```
src/viewmodels/sales/
  useSalesAggregatedViewModel.ts # For sales dashboard pages

src/viewmodels/products/
  useProductsViewModel.ts # For product pages
```

---

## 📄 PHASE 4: PAGES & UI

### 4.1 Page Structure (MVVM + SSR Pattern)

**Pattern: Server Component Wrapper + Client Component UI**

**File Structure:**
```
src/app/(dashboard)/
  labor/
    page.tsx                    # Server Component (NO "use client")
    LaborPageClient.tsx         # Client Component ("use client")
  sales/
    page.tsx                    # Server Component
    SalesPageClient.tsx         # Client Component
  products/
    page.tsx                    # Server Component
    ProductsPageClient.tsx      # Client Component
```

**Example: Labor Dashboard Page**

**File 1: `src/app/(dashboard)/labor/page.tsx` (Server Component)**
```typescript
// ✅ NO "use client" directive - This is a Server Component
import { LaborPageClient } from './LaborPageClient';
import { fetchLaborAggregated } from '@/lib/services/labor/labor.service';

// ✅ Add ISR revalidation (30 minutes)
export const revalidate = 1800;

export default async function LaborPage() {
  // ✅ Fetch data on server (fast, SSR)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const initialData = await fetchLaborAggregated({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  
  // ✅ Pass server data to client component
  return <LaborPageClient initialData={initialData} />;
}
```

**File 2: `src/app/(dashboard)/labor/LaborPageClient.tsx` (Client Component)**
```typescript
'use client';

import { useLaborAggregatedViewModel } from '@/viewmodels/labor/useLaborAggregatedViewModel';
import { UITable } from '@/components/view-data/UITable';
import { LoadingState } from '@/components/view-data/LoadingState';
import { ErrorState } from '@/components/view-data/ErrorState';

export function LaborPageClient({ initialData }) {
  // ✅ ViewModel uses server data as initial, updates client-side
  const { data, isLoading, error, filters, setFilters } = useLaborAggregatedViewModel(initialData);
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Labor Dashboard</h1>
      
      {/* Filters */}
      <div className="mb-4">
        <LocationFilterButtons
          selectedLocation={filters.locationId}
          onLocationChange={(id) => setFilters({ ...filters, locationId: id })}
        />
        <DateFilterPresets
          onPresetSelect={(preset) => setFilters({ ...filters, ...preset })}
        />
      </div>
      
      {/* Data Table */}
      <UITable
        data={data.records}
        columns={laborColumns}
        pagination={{
          page: data.page,
          totalPages: data.totalPages,
          onPageChange: (page) => setFilters({ ...filters, page })
        }}
      />
    </div>
  );
}
```

**ViewModel: `src/viewmodels/labor/useLaborAggregatedViewModel.ts`**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getLaborAggregated } from '@/lib/services/graphql/queries';

export function useLaborAggregatedViewModel(initialData?: LaborAggregatedResponse) {
  const [filters, setFilters] = useState({
    locationId: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    page: 1,
    limit: 50,
  });
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['labor-aggregated', filters],
    queryFn: () => getLaborAggregated(filters),
    initialData, // ✅ Use server data if provided
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
  
  return {
    data,
    isLoading,
    error,
    filters,
    setFilters,
  };
}
```

### 4.2 Styling & Components

**Use shadcn/ui components:**
- ✅ `@/components/ui/table` - For data tables
- ✅ `@/components/ui/button` - For actions
- ✅ `@/components/ui/card` - For dashboard cards
- ✅ `@/components/ui/badge` - For status indicators
- ✅ `@/components/ui/select` - For dropdowns
- ✅ `@/components/ui/input` - For inputs
- ✅ `@/components/ui/date-picker` - For date selection

**Reuse existing components:**
- ✅ `@/components/view-data/UITable` - Data table component
- ✅ `@/components/view-data/LocationFilterButtons` - Location filters
- ✅ `@/components/view-data/DateFilterPresets` - Date presets
- ✅ `@/components/view-data/LoadingState` - Loading state
- ✅ `@/components/view-data/ErrorState` - Error state

**Tailwind CSS:**
- ✅ Use utility classes directly in JSX
- ✅ Use theme values from `tailwind.config.ts`
- ✅ Mobile-first responsive design
- ❌ Never use `@apply` in global CSS
- ❌ Never use inline styles

### 4.3 Layout Structure

**Dashboard Layout:**
```
src/app/(dashboard)/layout.tsx
  ├── AppSidebar (navigation)
  ├── AppTopNav (breadcrumbs, filters)
  └── {children} (page content)
```

**Page Layout Pattern:**
```typescript
<div className="p-6">
  <h1 className="text-2xl font-bold mb-4">Page Title</h1>
  
  {/* Filters Section */}
  <div className="mb-4 flex gap-4">
    {/* Filter components */}
  </div>
  
  {/* Data Section */}
  <div className="space-y-4">
    {/* Data tables, cards, charts */}
  </div>
</div>
```

---

## 🔄 PHASE 5: CRON JOBS

### 5.1 Cron Job Manager

**File: `src/lib/cron/v2-cron-manager.ts` (already exists)**

**Cron Jobs to Configure:**

**1. Eitje Data Sync (Hourly)**
```typescript
{
  name: 'eitje-sync-hourly',
  schedule: '0 * * * *', // Every hour
  handler: async () => {
    await fetch('/api/eitje/v2/sync', { method: 'POST' });
  }
}
```

**2. Eitje Aggregation (Daily)**
```typescript
{
  name: 'eitje-aggregate-daily',
  schedule: '0 2 * * *', // 2 AM daily
  handler: async () => {
    await fetch('/api/eitje/v2/aggregate', { method: 'POST' });
  }
}
```

**3. Bork Data Sync (Hourly)**
```typescript
{
  name: 'bork-sync-hourly',
  schedule: '0 * * * *', // Every hour
  handler: async () => {
    await fetch('/api/bork/v2/sync', { method: 'POST' });
  }
}
```

**4. Bork Aggregation (Daily)**
```typescript
{
  name: 'bork-aggregate-daily',
  schedule: '0 2 * * *', // 2 AM daily
  handler: async () => {
    await fetch('/api/bork/v2/aggregate', { method: 'POST' });
  }
}
```

**5. Products Aggregation (Daily)**
```typescript
{
  name: 'products-aggregate-daily',
  schedule: '0 3 * * *', // 3 AM daily (after Bork aggregation)
  handler: async () => {
    await fetch('/api/products/aggregate', { method: 'POST' });
  }
}
```

### 5.2 Cron Job API Routes

**API Routes for Manual Triggers:**
- `/api/eitje/v2/sync` - Manual Eitje sync
- `/api/eitje/v2/aggregate` - Manual Eitje aggregation
- `/api/bork/v2/sync` - Manual Bork sync
- `/api/bork/v2/aggregate` - Manual Bork aggregation
- `/api/products/aggregate` - Manual products aggregation

**All routes should:**
- ✅ Accept optional `startDate` and `endDate` parameters
- ✅ Return sync/aggregation summary (records processed, errors, etc.)
- ✅ Support pagination for large datasets
- ✅ Log operations to sync history

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Create `locations` collection + indexes
- [ ] Create `unified_users` collection + indexes
- [ ] Create `unified_teams` collection + indexes
- [ ] Create `api_credentials` collection + indexes
- [ ] Create GraphQL schema for foundation entities
- [ ] Create GraphQL resolvers for foundation entities
- [ ] Create services for foundation entities
- [ ] Create models for foundation entities
- [ ] Create ViewModels for foundation entities
- [ ] Create settings pages for managing locations, users, teams

### Phase 2: Hours (Labor) Data
- [ ] Create `eitje_raw_data` collection + indexes
- [ ] Create `eitje_aggregated` collection + indexes
- [ ] Create Eitje sync service (`/api/eitje/v2/sync`)
- [ ] Create Eitje aggregation service (`/api/eitje/v2/aggregate`)
- [ ] Create GraphQL schema for labor data
- [ ] Create GraphQL resolvers for labor data (query aggregated only)
- [ ] Create labor service (GraphQL client)
- [ ] Create labor ViewModel
- [ ] Create labor dashboard page (Server Component + Client Component)
- [ ] Configure cron job for Eitje sync
- [ ] Configure cron job for Eitje aggregation

### Phase 3: Sales Data
- [ ] Create `bork_raw_data` collection + indexes
- [ ] Create `bork_aggregated` collection + indexes
- [ ] Create `products_aggregated` collection + indexes
- [ ] Create Bork sync service (`/api/bork/v2/sync`)
- [ ] Create Bork aggregation service (`/api/bork/v2/aggregate`)
- [ ] Create products aggregation service (`/api/products/aggregate`)
- [ ] Create GraphQL schema for sales data
- [ ] Create GraphQL resolvers for sales data (query aggregated only)
- [ ] Create GraphQL schema for products
- [ ] Create GraphQL resolvers for products (query aggregated only)
- [ ] Create sales service (GraphQL client)
- [ ] Create products service (GraphQL client)
- [ ] Create sales ViewModel
- [ ] Create products ViewModel
- [ ] Create sales dashboard page (Server Component + Client Component)
- [ ] Create products page (Server Component + Client Component)
- [ ] Configure cron job for Bork sync
- [ ] Configure cron job for Bork aggregation
- [ ] Configure cron job for products aggregation

### Phase 4: Pages & UI
- [ ] Create labor dashboard page (following MVVM + SSR pattern)
- [ ] Create sales dashboard page (following MVVM + SSR pattern)
- [ ] Create products page (following MVVM + SSR pattern)
- [ ] Ensure all pages use shadcn/ui components
- [ ] Ensure all pages use existing reusable components
- [ ] Ensure all pages follow Tailwind CSS standards
- [ ] Ensure all pages have proper loading/error states
- [ ] Ensure all pages have proper pagination
- [ ] Ensure all pages have proper filters

### Phase 5: Cron Jobs
- [ ] Configure Eitje sync cron job
- [ ] Configure Eitje aggregation cron job
- [ ] Configure Bork sync cron job
- [ ] Configure Bork aggregation cron job
- [ ] Configure products aggregation cron job
- [ ] Test all cron jobs manually
- [ ] Verify cron jobs run automatically

---

## 🎯 KEY PRINCIPLES

### 1. Aggregated Collections Principle
- ✅ **ALL data pre-computed** - No enrichment queries in GraphQL resolvers
- ✅ **Denormalized data** - Store names, not just IDs
- ✅ **Zero additional queries** - GraphQL resolver reads and returns directly

### 2. MVVM Pattern
- ✅ **Model** - Data structures, TypeScript interfaces
- ✅ **View** - React components (presentation only)
- ✅ **ViewModel** - Custom hooks, state management, data transformation
- ❌ **NEVER** mix business logic in View components

### 3. SSR + ISR Pattern
- ✅ **Server Component** - Fetch data on server (fast, SEO-friendly)
- ✅ **Client Component** - Interactive UI (state management, filters)
- ✅ **ISR Revalidation** - `export const revalidate = 1800` (30 minutes)
- ✅ **Initial Data** - Pass server data to ViewModel as `initialData`

### 4. Database Pagination
- ✅ **ALWAYS paginate** - Never fetch all records
- ✅ **Database-level pagination** - Use `.skip()` and `.limit()`
- ❌ **NEVER** fetch all data and paginate in memory

### 5. Indexing
- ✅ **Compound indexes** - `{ locationId: 1, date: -1 }`
- ✅ **Query-specific indexes** - Index fields used in queries
- ✅ **System mapping indexes** - Fast lookups for unified users/teams

### 6. Cron Job Data Flow
```
External API → Raw Data Collection → Aggregation Service → Aggregated Collection → GraphQL → UI
```

---

## 📊 ESTIMATED TIMELINE

- **Phase 1 (Foundation)**: 2-3 days
- **Phase 2 (Hours Data)**: 3-4 days
- **Phase 3 (Sales Data)**: 3-4 days
- **Phase 4 (Pages & UI)**: 2-3 days
- **Phase 5 (Cron Jobs)**: 1 day

**Total**: ~11-15 days

---

## 🚀 NEXT STEPS

1. **Review this plan** with the team
2. **Start with Phase 1** (Foundation Layer)
3. **Build incrementally** - Test each phase before moving to next
4. **Follow all patterns** - MVVM, SSR, Aggregated Collections, etc.
5. **Verify with evidence** - Always check database after operations

---

**Last Updated**: 2025-01-XX  
**Status**: Planning Phase  
**Ready to Start**: Phase 1 (Foundation Layer)

