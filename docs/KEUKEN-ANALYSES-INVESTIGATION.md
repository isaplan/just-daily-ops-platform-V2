# Keuken Analyses - Investigation & Implementation Plan

## 🔍 INVESTIGATION FINDINGS

### ✅ **What We Have:**

#### **1. Aggregated Collections (FAST - Use These!)**
- **`bork_aggregated`** - Daily sales aggregations
  - Fields: `date`, `locationId`, `totalRevenue`, `totalQuantity`, `totalTransactions`, `revenueByCategory`
  - GraphQL Query: `salesAggregated(locationId, startDate, endDate)`
  - **BUT**: Missing product-level detail (only totals per day)

- **`eitje_aggregated`** - Daily labor aggregations
  - Fields: `date`, `locationId`, `totalHoursWorked`, `totalWageCost`, `teamStats[]`
  - GraphQL Query: `laborAggregated(locationId, startDate, endDate)`
  - **BUT**: Missing worker-level detail (only team stats)

- **`daily_dashboard`** - Cross-correlated metrics
  - Fields: `sales`, `labor`, `productivity` metrics
  - **BUT**: Too high-level, doesn't have product/worker breakdown

#### **2. Worker Unifier System**
- **`unified_users`** collection
  - Maps: `systemMappings[]` with `{ system: 'eitje'|'bork', externalId: string }`
  - Links Eitje `userId` → Unified User → Bork `userId`
  - **CRITICAL**: Use this to connect labor (Eitje) with sales (Bork)

#### **3. Products Catalog**
- **`products`** collection
  - Fields: `productName`, `workloadLevel`, `workloadMinutes`, `category`
  - GraphQL Query: `products(filters)`

#### **4. Raw Data (SLOW - Don't Use!)**
- `bork_raw_data` - Raw sales (has product details but slow)
- `eitje_raw_data` - Raw labor (has worker details but slow)

---

### ❌ **What's Missing:**

1. **Product-level sales data** in `bork_aggregated` (only has totals)
2. **Worker-level labor data** in `eitje_aggregated` (only has team stats)
3. **Hourly breakdowns** (both aggregated collections are daily only)
4. **Time range filtering** (lunch/dinner) in aggregated data
5. **Worker-to-product correlation** (who made what, when)

---

### 🎯 **What We Need to Create:**

#### **New Collection: `keuken_analyses_aggregated`**

```typescript
{
  _id: ObjectId,
  locationId: ObjectId,
  date: Date,
  hour?: number,  // Optional: for hourly breakdowns
  timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks" | "all",
  
  // Product Production (from bork_raw_data aggregated by product)
  productProduction: [{
    productName: string,
    category?: string,
    totalQuantity: number,
    workloadLevel: "low" | "mid" | "high",
    workloadMinutes: number,
    totalWorkloadMinutes: number,  // quantity × workloadMinutes
  }],
  
  // Worker Activity (from eitje_raw_data + unified_users)
  workerActivity: [{
    unifiedUserId: ObjectId,  // Reference to unified_users
    workerName: string,
    teamName?: string,
    hours: number[],  // [11, 12, 13, ...] - hours active
    isKitchenWorker: boolean,  // Based on team name
  }],
  
  // Workload Metrics (pre-calculated)
  workloadByHour: [{
    hour: number,  // 0-23
    totalWorkloadMinutes: number,
    productCount: number,
    activeWorkers: number,  // Count of kitchen workers active
  }],
  
  workloadByWorker: [{
    unifiedUserId: ObjectId,
    workerName: string,
    teamName?: string,
    totalWorkloadMinutes: number,
    productCount: number,
  }],
  
  workloadByRange: [{
    timeRange: "lunch" | "dinner" | "afternoon-drinks" | "after-drinks",
    totalWorkloadMinutes: number,
    productCount: number,
    activeWorkers: number,
  }],
  
  // KPIs (pre-calculated)
  kpis: {
    totalOrders: number,
    totalProductsProduced: number,
    totalWorkloadMinutes: number,
    averageWorkloadPerHour: number,
    peakHour: string,  // "14:00"
    peakTimeRange: "lunch" | "dinner",
    averageWorkersPerHour: number,
  },
  
  createdAt: Date,
  updatedAt: Date,
}
```

---

## 📋 IMPLEMENTATION PLAN

### **Phase 1: Check Actual Data Dates** ⚠️ **DO THIS FIRST**

**Action**: Query database to find what dates actually have data

**Endpoints Available:**
- `/api/bork/v2/check-data?month=11&year=2024` - Check Bork data
- `/api/eitje/v2/check-data?month=11&year=2024` - Check Eitje data
- `/api/admin/check-data` - Check all collections

**What to Check:**
1. What's the earliest date in `bork_aggregated`?
2. What's the latest date in `bork_aggregated`?
3. What's the earliest date in `eitje_aggregated`?
4. What's the latest date in `eitje_aggregated`?
5. Do dates overlap? (Can we correlate sales + labor?)

**Implementation:**
```typescript
// Create endpoint: /api/admin/keuken-data-check
// Query both collections, return date ranges
```

---

### **Phase 2: Create Aggregation Service**

**File**: `src/lib/services/daily-ops/keuken-analyses-aggregation.service.ts`

**Function**: `aggregateKeukenAnalysesData(dateRange, locationId)`

**Data Sources:**
1. **Sales**: Query `bork_raw_data` (need product-level detail)
   - Extract: `product_name`, `quantity`, `time`, `date`
   - Group by: product, hour, date
   
2. **Labor**: Query `eitje_raw_data` with `endpoint: 'time_registration_shifts'`
   - Extract: `extracted.userId`, `extracted.teamName`, `extracted.start`, `extracted.end`
   - Map via `unified_users` to get unified user ID
   - Filter: Only kitchen workers (team name contains "kitchen"|"keuken"|"kok")
   
3. **Products**: Query `products` collection
   - Get `workloadLevel` and `workloadMinutes` per product
   
4. **Join Logic**:
   - Match sales `time` with labor `start`/`end` hours
   - Use `unified_users.systemMappings` to connect:
     - Eitje `userId` → `unified_users` → Bork `userId` (if exists)
     - Or: Match by location + team name

**Calculations:**
- Product Production: Group sales by product, sum quantities
- Workload: `quantity × workloadMinutes` per product
- Worker Activity: Match labor shifts to sales hours
- Workload by Hour: Aggregate workload per hour (0-23)
- Workload by Range: Aggregate by time range (lunch/dinner/etc)
- KPIs: Calculate all metrics

**Output**: Store in `keuken_analyses_aggregated` collection

---

### **Phase 3: Create GraphQL Query**

**File**: `src/lib/graphql/v2-schema.ts`

**Add Query:**
```graphql
keukenAnalyses(
  locationId: ID!
  startDate: String!
  endDate: String!
  timeRangeFilter: TimeRangeFilter  # "all" | "lunch" | "dinner" | etc
  selectedWorkerId: ID  # Optional: filter by unified user
): KeukenAnalysesResponse!
```

**File**: `src/lib/graphql/v2-resolvers.ts`

**Resolver Logic:**
1. Query `keuken_analyses_aggregated` collection
2. If missing, call aggregation service (on-demand)
3. Apply filters (timeRange, worker)
4. Return data

---

### **Phase 4: Create Cron Job Hook**

**File**: `src/lib/services/daily-ops/keuken-analyses-aggregation.service.ts`

**Function**: `aggregateKeukenAnalysesOnDataSync(locationId, dateRange)`

**Trigger**: After Bork/Eitje sync completes
- Hook into existing sync endpoints
- Or: Create separate cron endpoint

**Logic:**
1. Get last aggregation date
2. Aggregate for missing dates
3. Update existing aggregations if data changed
4. Store in `keuken_analyses_aggregated`

---

### **Phase 5: Update Service to Use Aggregated Data**

**File**: `src/lib/services/daily-ops/keuken-analyses.service.ts`

**Change**: 
- ❌ Remove: `getDailySales()` (raw data)
- ❌ Remove: `getProcessedHours()` (raw data)
- ✅ Use: GraphQL `keukenAnalyses()` query (aggregated)
- ✅ Fallback: If aggregated missing, trigger aggregation on-demand

---

### **Phase 6: Add Calculation Transparency UI**

**File**: `src/app/(dashboard)/daily-ops/keuken-analyses/KeukenAnalysesClient.tsx`

**Add**: Calculator icon dropdown per KPI

**Show**:
- Data Source: Collection name + query
- Formula: Calculation steps
- Input Values: Actual numbers used
- Calculation Steps: Step-by-step breakdown
- Final Result: KPI value

**Example**:
```
Products Produced: 1,250
[📊] Show Calculation
  ├─ Data Source: keuken_analyses_aggregated
  ├─ Query: date BETWEEN '2024-11-01' AND '2024-11-30', locationId = 'all'
  ├─ Formula: SUM(productProduction[].totalQuantity)
  ├─ Records: 30 days × 45 products = 1,350 product entries
  ├─ Calculation: 
  │   - Product "Pizza": 250 units
  │   - Product "Pasta": 180 units
  │   - Product "Salad": 120 units
  │   - ... (all products)
  └─ Result: 1,250 total products produced
```

---

## 🚀 EXECUTION ORDER

1. **✅ Check actual data dates** - Use `/api/admin/check-data` or create check endpoint
2. **✅ Create aggregation service** - Build `keuken_analyses_aggregated` collection
3. **✅ Create GraphQL query** - Add `keukenAnalyses` query
4. **✅ Update service** - Use aggregated data instead of raw
5. **✅ Add calculation UI** - Show formulas and data sources
6. **✅ Create cron hook** - Auto-aggregate after data sync

---

## ❓ QUESTIONS TO ANSWER

1. **What dates have data?** → Check `/api/admin/check-data` or query collections directly
2. **Does `bork_aggregated` have product-level detail?** → Check schema/structure
3. **Does `eitje_aggregated` have worker-level detail?** → Check schema/structure
4. **How to match workers?** → Use `unified_users.systemMappings` to connect Eitje userId → Bork userId
5. **Where are cron hooks?** → Check existing sync endpoints for hooks

---

## 📝 NEXT STEPS

1. **Query actual data dates** - Don't guess, check!
2. **Review aggregated collection structures** - See what detail they have
3. **Create aggregation service** - Build the new collection
4. **Test with real dates** - Use dates that actually have data
5. **Add calculation transparency** - Show formulas in UI




