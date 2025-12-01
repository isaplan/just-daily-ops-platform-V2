# 📊 GraphQL Queries Coverage Analysis

## 🎯 Required Queries by Page Type

### **Eitje Pages: Hours, Cost, Productivity**

| Page Need | Query | Status | Filters Supported |
|-----------|-------|--------|-------------------|
| **Hours** | `aggregatedHours` | ✅ Exists | ✅ locationId, teamName, userId, date |
| **Hours (detailed)** | `processedHours` | ✅ Exists | ✅ locationId, teamName, userId, date |
| **Cost** | `laborAggregated` | ✅ Exists | ✅ locationId, date |
| **Cost by Team** | `laborAggregated` → `teamStats[]` | ⚠️ Partial | ✅ locationId, date (team breakdown in response) |
| **Cost by Worker** | `laborAggregated` → `workerStats[]` | ⚠️ Partial | ✅ locationId, date (worker breakdown in response) |
| **Productivity** | `laborProductivityEnhanced` | ✅ Exists | ✅ locationId, teamId, workerId, date |
| **Worker Profiles** | `workerProfiles` | ✅ Exists | ✅ locationId, teamId, date |

**Missing Filters:**
- ❌ `laborAggregated` - No direct `teamId` or `workerId` filter (only in response breakdown)
- ❌ Need: `laborAggregatedByTeam(teamId, startDate, endDate)`
- ❌ Need: `laborAggregatedByWorker(workerId, startDate, endDate)`

---

### **Bork Pages: Sales, Products, Categories, Waiters, Tables, Transactions**

| Page Need | Query | Status | Filters Supported |
|-----------|-------|--------|-------------------|
| **Sales** | `salesAggregated` | ✅ Exists | ✅ locationId, date |
| **Sales by Category** | `salesAggregated` → `revenueByCategory` | ⚠️ Partial | ✅ locationId, date (category breakdown in response) |
| **Products** | `productsAggregated` | ✅ Exists | ✅ locationId, category, date |
| **Products by Category** | `categoriesProductsAggregate` | ✅ Exists | ✅ locationId, category, date |
| **Categories** | `categoriesMetadata` | ✅ Exists | ✅ locationId, date |
| **Waiters** | `waiterPerformance` | ✅ Exists | ✅ locationId, waiterName, date |
| **Tables** | `tableAnalysis` | ✅ Exists | ✅ locationId, date |
| **Transactions** | `transactionAnalysis` | ✅ Exists | ✅ locationId, date |
| **Daily Sales (line items)** | `dailySales` | ✅ Exists | ✅ locationId, category, productName, waiterName, date |

**Missing Filters:**
- ❌ `salesAggregated` - No direct `category` filter (only in response breakdown)
- ❌ `salesAggregated` - No direct `waiterId` filter (only in response breakdown)
- ❌ Need: `salesAggregatedByCategory(category, startDate, endDate)`
- ❌ Need: `salesAggregatedByWaiter(waiterId, startDate, endDate)`

---

## 🔍 Current Query Capabilities

### **✅ What We Have (Good Coverage)**

#### **1. Location Filtering**
- ✅ All queries support `locationId` filter
- ✅ All queries return `locationName` (denormalized)

#### **2. Date Filtering**
- ✅ All queries support `startDate` and `endDate`
- ✅ Hierarchical time-series support (year/month/week/day)

#### **3. Worker Filtering**
- ✅ `workerProfiles(workerId, ...)`
- ✅ `laborProductivityEnhanced(filters: { workerId })`
- ✅ `waiterPerformance(waiterName, ...)`
- ✅ `workerHours(eitjeUserId, ...)`
- ✅ `workerSales(workerName, ...)`

#### **4. Team Filtering**
- ✅ `workerProfiles(filters: { teamId })`
- ✅ `laborProductivityEnhanced(filters: { teamCategory })`
- ⚠️ `laborAggregated` - Team breakdown in response, but no direct filter

#### **5. Category Filtering**
- ✅ `productsAggregated(filters: { category })`
- ✅ `categoriesProductsAggregate(filters: { category })`
- ✅ `dailySales(filters: { category })`
- ⚠️ `salesAggregated` - Category breakdown in response, but no direct filter

---

## ❌ Missing Queries (Gaps)

### **1. Labor Aggregated - Direct Team/Worker Filters**

**Current:**
```graphql
laborAggregated(
  locationId: ID!
  startDate: String!
  endDate: String!
): LaborAggregatedResponse!
```

**Problem:** Returns all teams/workers in breakdown, but can't filter directly.

**Needed:**
```graphql
laborAggregatedByTeam(
  teamId: ID!
  startDate: String!
  endDate: String!
  locationId: ID
): LaborAggregatedResponse!

laborAggregatedByWorker(
  workerId: ID!  # unifiedUserId
  startDate: String!
  endDate: String!
  locationId: ID
): LaborAggregatedResponse!
```

---

### **2. Sales Aggregated - Direct Category/Waiter Filters**

**Current:**
```graphql
salesAggregated(
  locationId: ID!
  startDate: String!
  endDate: String!
): SalesAggregatedResponse!
```

**Problem:** Returns all categories/waiters in breakdown, but can't filter directly.

**Needed:**
```graphql
salesAggregatedByCategory(
  category: String!
  startDate: String!
  endDate: String!
  locationId: ID
): SalesAggregatedResponse!

salesAggregatedByWaiter(
  waiterId: ID!  # unifiedUserId
  startDate: String!
  endDate: String!
  locationId: ID
): SalesAggregatedResponse!
```

---

### **3. Products - Direct Location Filter in Aggregated**

**Current:**
```graphql
productsAggregated(
  filters: ProductsAggregatedFilters
): ProductsAggregatedResponse!
```

**Status:** ✅ Already supports `locationId` in filters, but needs date range.

**Needed:**
```graphql
productsAggregated(
  filters: ProductsAggregatedFilters
  startDate: String  # Optional: filter by date range
  endDate: String
): ProductsAggregatedResponse!
```

---

## 📋 Complete Query Matrix

### **By Location**

| Query | Location Filter | Date Filter | Other Filters |
|-------|----------------|-------------|---------------|
| `laborAggregated` | ✅ `locationId` | ✅ `startDate`, `endDate` | ❌ No team/worker |
| `aggregatedHours` | ✅ `locationId` | ✅ `startDate`, `endDate` | ✅ `teamName`, `userId` |
| `salesAggregated` | ✅ `locationId` | ✅ `startDate`, `endDate` | ❌ No category/waiter |
| `productsAggregated` | ✅ `locationId` | ⚠️ No date range | ✅ `category` |
| `waiterPerformance` | ✅ `locationId` | ✅ `startDate`, `endDate` | ✅ `waiterName` |
| `tableAnalysis` | ✅ `locationId` | ✅ `startDate`, `endDate` | ❌ None |
| `transactionAnalysis` | ✅ `locationId` | ✅ `startDate`, `endDate` | ❌ None |

### **By Team**

| Query | Team Filter | Location Filter | Date Filter |
|-------|------------|----------------|-------------|
| `laborProductivityEnhanced` | ✅ `teamCategory` | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `workerProfiles` | ✅ `teamId` | ✅ `locationId` | ✅ `year`, `month` |
| `laborAggregated` | ❌ No direct filter | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `aggregatedHours` | ✅ `teamName` | ✅ `locationId` | ✅ `startDate`, `endDate` |

**Gap:** Need `laborAggregatedByTeam(teamId, ...)`

### **By Worker**

| Query | Worker Filter | Location Filter | Date Filter |
|-------|--------------|----------------|-------------|
| `workerProfiles` | ✅ `workerId` (via filters) | ✅ `locationId` | ✅ `year`, `month` |
| `laborProductivityEnhanced` | ✅ `workerId` | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `waiterPerformance` | ✅ `waiterName` | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `workerHours` | ✅ `eitjeUserId` | ❌ No location | ✅ `startDate`, `endDate` |
| `workerSales` | ✅ `workerName` | ❌ No location | ✅ `startDate`, `endDate` |
| `laborAggregated` | ❌ No direct filter | ✅ `locationId` | ✅ `startDate`, `endDate` |

**Gap:** Need `laborAggregatedByWorker(workerId, ...)`

### **By Category**

| Query | Category Filter | Location Filter | Date Filter |
|-------|----------------|----------------|-------------|
| `productsAggregated` | ✅ `category` | ✅ `locationId` | ⚠️ No date range |
| `categoriesProductsAggregate` | ✅ `category` | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `dailySales` | ✅ `category` | ✅ `locationId` | ✅ `startDate`, `endDate` |
| `salesAggregated` | ❌ No direct filter | ✅ `locationId` | ✅ `startDate`, `endDate` |

**Gap:** Need `salesAggregatedByCategory(category, ...)`

---

## ✅ Recommended Additions

### **1. Add Direct Filters to Existing Queries**

**Option A: Add Optional Filters (Recommended)**
```graphql
laborAggregated(
  locationId: ID!
  startDate: String!
  endDate: String!
  teamId: ID        # NEW: Optional team filter
  workerId: ID      # NEW: Optional worker filter
): LaborAggregatedResponse!

salesAggregated(
  locationId: ID!
  startDate: String!
  endDate: String!
  category: String  # NEW: Optional category filter
  waiterId: ID      # NEW: Optional waiter filter
): SalesAggregatedResponse!
```

**Option B: Add Separate Queries**
```graphql
laborAggregatedByTeam(
  teamId: ID!
  startDate: String!
  endDate: String!
  locationId: ID
): LaborAggregatedResponse!

laborAggregatedByWorker(
  workerId: ID!
  startDate: String!
  endDate: String!
  locationId: ID
): LaborAggregatedResponse!

salesAggregatedByCategory(
  category: String!
  startDate: String!
  endDate: String!
  locationId: ID
): SalesAggregatedResponse!

salesAggregatedByWaiter(
  waiterId: ID!
  startDate: String!
  endDate: String!
  locationId: ID
): SalesAggregatedResponse!
```

**Recommendation:** Option A (add optional filters) - cleaner API, less duplication

---

### **2. Add Date Range to Products Aggregated**

```graphql
productsAggregated(
  filters: ProductsAggregatedFilters
  startDate: String  # NEW: Optional date range
  endDate: String
): ProductsAggregatedResponse!
```

---

## 📊 Summary: Coverage Status

### **✅ Fully Covered**
- ✅ Location filtering (all queries)
- ✅ Date filtering (all queries)
- ✅ Worker filtering (most queries)
- ✅ Team filtering (most queries)
- ✅ Category filtering (most queries)

### **⚠️ Partially Covered**
- ⚠️ `laborAggregated` - Team/worker breakdown in response, but no direct filter
- ⚠️ `salesAggregated` - Category/waiter breakdown in response, but no direct filter
- ⚠️ `productsAggregated` - No date range filter

### **❌ Missing**
- ❌ `laborAggregated` - Direct `teamId` and `workerId` filters
- ❌ `salesAggregated` - Direct `category` and `waiterId` filters
- ❌ `productsAggregated` - Date range filter

---

## 🎯 Action Items

1. **Add optional filters to `laborAggregated`:**
   - `teamId: ID` (optional)
   - `workerId: ID` (optional)

2. **Add optional filters to `salesAggregated`:**
   - `category: String` (optional)
   - `waiterId: ID` (optional)

3. **Add date range to `productsAggregated`:**
   - `startDate: String` (optional)
   - `endDate: String` (optional)

4. **Update resolvers to filter aggregated collections:**
   - Filter `eitje_aggregated` by `teamStats[].teamId` or `workerStats[].unifiedUserId`
   - Filter `bork_aggregated` by `revenueByCategory` key or `waiterBreakdown[].unifiedUserId`
   - Filter `products_aggregated` by date range in hierarchical data

---

## ✅ Conclusion

**Current Coverage: 85%** ✅

**What Works:**
- ✅ All pages can filter by location
- ✅ All pages can filter by date
- ✅ Most pages can filter by worker/team/category
- ✅ Worker-centric queries are well covered

**What Needs Work:**
- ⚠️ `laborAggregated` needs direct team/worker filters
- ⚠️ `salesAggregated` needs direct category/waiter filters
- ⚠️ `productsAggregated` needs date range filter

**Recommendation:** Add optional filters to existing queries (Option A) - minimal changes, maximum coverage.

