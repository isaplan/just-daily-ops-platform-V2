# Keuken Analyses - Implementation Plan (CURRENT DATA FOCUS)

## 🎯 GOAL
Show CURRENT data (November 2025, this week, yesterday) using aggregated collections and smart joins.

---

## ✅ WHAT WE HAVE (Verified)

### **Data Available:**
- **Bork Sales**: November 2025 (Nov 1-18) - 50 records in `bork_aggregated`
- **Eitje Labor**: November 2025 - 1,108 raw records, 57 aggregated in `eitje_aggregated`
- **Unified Users**: Worker mapping system (`unified_users` collection)
- **Products Catalog**: `products` collection with workload levels

### **Collections Available:**
- ✅ `bork_aggregated` - Daily sales totals (but missing product-level detail)
- ✅ `eitje_aggregated` - Daily labor totals (but missing worker-level detail)
- ✅ `unified_users` - Maps Eitje userId → Bork userId
- ✅ `products` - Product catalog with workload levels

---

## ❌ WHAT'S MISSING

1. **Product-level sales breakdown** (need to query `bork_raw_data` for product detail)
2. **Worker-level labor breakdown** (need to query `eitje_raw_data` for worker detail)
3. **Hourly breakdowns** (aggregated collections are daily only)
4. **Worker-to-product correlation** (who made what, when)
5. **Pre-calculated keuken analyses** (new collection needed)

---

## 🚀 IMPLEMENTATION PLAN

### **Phase 1: Create Smart Aggregated Collection**

**New Collection**: `keuken_analyses_aggregated`

**Structure:**
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
    totalWorkloadMinutes: number,
  }],
  
  // Worker Activity (from eitje_raw_data + unified_users)
  workerActivity: [{
    unifiedUserId: ObjectId,  // Reference to unified_users
    workerName: string,
    teamName?: string,
    hours: number[],  // [11, 12, 13, ...] - hours active
    isKitchenWorker: boolean,
  }],
  
  // Workload Metrics (pre-calculated)
  workloadByHour: [{ hour: 0-23, totalWorkloadMinutes, productCount, activeWorkers }],
  workloadByWorker: [{ unifiedUserId, workerName, totalWorkloadMinutes, productCount }],
  workloadByRange: [{ timeRange, totalWorkloadMinutes, productCount, activeWorkers }],
  
  // KPIs (pre-calculated)
  kpis: {
    totalOrders: number,
    totalProductsProduced: number,
    totalWorkloadMinutes: number,
    averageWorkloadPerHour: number,
    peakHour: string,
    peakTimeRange: "lunch" | "dinner",
    averageWorkersPerHour: number,
  },
  
  createdAt: Date,
  updatedAt: Date,
}
```

---

### **Phase 2: Create Aggregation Service**

**File**: `src/lib/services/daily-ops/keuken-analyses-aggregation.service.ts`

**Function**: `aggregateKeukenAnalysesData(dateRange, locationId)`

**Data Sources:**
1. **Sales**: `bork_raw_data` (need product-level detail)
   - Extract: `extracted.productName`, `extracted.quantity`, `rawApiResponse.Time`, `date`
   - Group by: product, hour, date
   
2. **Labor**: `eitje_raw_data` with `endpoint: 'time_registration_shifts'`
   - Extract: `extracted.userId`, `extracted.teamName`, `extracted.start`, `extracted.end`
   - Map via `unified_users.systemMappings` to get unified user ID
   - Filter: Only kitchen workers (team name contains "kitchen"|"keuken"|"kok")
   
3. **Products**: `products` collection
   - Get `workloadLevel` and `workloadMinutes` per product
   
4. **Join Logic**:
   - Match sales `time` (hour) with labor `start`/`end` hours
   - Use `unified_users` to connect workers:
     - Eitje `userId` → `unified_users.systemMappings` → unified user ID
     - Match by location + team name if no mapping exists

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

### **Phase 4: Update Service to Use Aggregated Data**

**File**: `src/lib/services/daily-ops/keuken-analyses.service.ts`

**Change**: 
- ❌ Remove: `getDailySales()` (raw data)
- ❌ Remove: `getProcessedHours()` (raw data)
- ✅ Use: GraphQL `keukenAnalyses()` query (aggregated)
- ✅ Fallback: If aggregated missing, trigger aggregation on-demand

---

### **Phase 5: Add Calculation Transparency UI**

**File**: `src/app/(dashboard)/daily-ops/keuken-analyses/KeukenAnalysesClient.tsx`

**Add**: Calculator icon dropdown per KPI

**Show**:
- Data Source: Collection name + query
- Formula: Calculation steps
- Input Values: Actual numbers used
- Calculation Steps: Step-by-step breakdown
- Final Result: KPI value

---

### **Phase 6: Create Cron Hook**

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

## 📋 EXECUTION ORDER

1. ✅ **Create aggregation service** - Build `keuken_analyses_aggregated` collection
2. ✅ **Create GraphQL query** - Add `keukenAnalyses` query
3. ✅ **Update service** - Use aggregated data instead of raw
4. ✅ **Add calculation UI** - Show formulas and data sources
5. ✅ **Create cron hook** - Auto-aggregate after data sync

---

## 🎯 CURRENT DATA FOCUS

**Default Date Range**: "This Month" (November 2025)
- Start: 2025-11-01
- End: 2025-11-30 (or current date if earlier)

**Data Available**: ✅ Confirmed
- Bork: Nov 1-18, 2025 (50 records)
- Eitje: Nov 2025 (1,108 raw, 57 aggregated)

**Next Steps**: Create aggregation service to build `keuken_analyses_aggregated` for November 2025.

