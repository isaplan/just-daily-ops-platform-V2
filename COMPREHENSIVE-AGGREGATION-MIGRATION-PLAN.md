# Comprehensive Aggregation Migration Plan

## 🔍 COMPLETE ANALYSIS: All Resolvers Using Raw Data

### **Summary:**
- **Total Resolvers Using Raw Data:** 11
- **Pages Affected:** 12+
- **Critical Issues:** N+1 queries, client-side pagination, memory-intensive processing

---

## 📊 RESOLVERS USING RAW DATA

### **1. Sales Resolvers (8 resolvers using `extractSalesRecords` or `bork_raw_data`)**

#### **1.1. `productPerformance`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/products`
- **Groups by:** `product_name + location_id`
- **Needs:**
  - product_name, category, location_id, location_name
  - quantity, total_inc_vat, cost_price, unit_price
  - ticket_number, date (for transaction_count)
- **Calculates:** total_quantity_sold, total_revenue, total_profit, average_unit_price, transaction_count
- **Issue:** Fetches up to 5000 raw records, processes in memory, client-side pagination

#### **1.2. `waiterPerformance`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/waiters`
- **Groups by:** `waiter_name + location_id`
- **Needs:** waiter_name, location_id, location_name, total_inc_vat, quantity, ticket_number, date
- **Calculates:** total_revenue, total_items_sold, total_transactions, average_ticket_value, average_items_per_transaction
- **Issue:** Same as productPerformance

#### **1.3. `revenueBreakdown`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/revenue`
- **Groups by:** `date + location_id`
- **Needs:** date, location_id, location_name, total_ex_vat, total_inc_vat, vat_amount, ticket_number
- **Calculates:** total_revenue_ex_vat, total_revenue_inc_vat, total_vat, total_transactions, average_transaction_value
- **Issue:** Same as productPerformance

#### **1.4. `paymentMethodStats`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/payment-methods`
- **Groups by:** `payment_method + location_id`
- **Needs:** payment_method, location_id, location_name, total_inc_vat, ticket_number, date
- **Calculates:** total_revenue, total_transactions, average_transaction_value, percentage_of_total
- **Issue:** Same as productPerformance

#### **1.5. `timeBasedAnalysis`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/time-analysis`
- **Groups by:** `hour + location_id`
- **Needs:** time (extract hour), location_id, location_name, total_inc_vat, quantity, ticket_number, date
- **Calculates:** total_revenue, total_items_sold, total_transactions, average_transaction_value
- **Issue:** Same as productPerformance

#### **1.6. `tableAnalysis`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/tables`
- **Groups by:** `table_number + location_id`
- **Needs:** table_number, location_id, location_name, total_inc_vat, quantity, ticket_number, date
- **Calculates:** total_revenue, total_items_sold, total_transactions, average_transaction_value
- **Issue:** Same as productPerformance

#### **1.7. `transactionAnalysis`** ❌
- **Uses:** `extractSalesRecords()` → `bork_raw_data`
- **Pages:** `/data/sales/bork/transactions`
- **Groups by:** `ticket_number + date`
- **Needs:** ticket_number, date, location_id, location_name, table_number, waiter_name, payment_method, time, total_inc_vat, quantity
- **Calculates:** total_revenue, total_items, item_count
- **Issue:** Same as productPerformance

#### **1.8. `dailySales`** ❌
- **Uses:** `bork_raw_data` directly
- **Pages:** `/data/sales/bork` (main page)
- **Needs:** **Line-item level detail** (NOT transaction summaries!)
  - Each record = one product sold in one order
  - Fields: `product_name`, `quantity`, `unit_price`, `total_ex_vat`, `total_inc_vat`
  - Fields: `ticket_key`, `ticket_number`, `order_key`, `order_line_key`
  - Fields: `category`, `table_number`, `waiter_name`, `payment_method`, `time`
  - Fields: `product_sku`, `product_number`, `vat_rate`, `vat_amount`, `cost_price`
- **Issue:** Fetches up to 1500 raw records, processes in memory, extracts line items from nested structure
- **Note:** **CRITICAL** - Needs `sales_line_items_aggregated` collection (line-item level), NOT `transactions_aggregated` (transaction summaries)

---

### **2. Labor Resolvers (3 resolvers using `eitje_raw_data`)**

#### **2.1. `processedHours`** ❌
- **Uses:** `eitje_raw_data` directly
- **Pages:** `/data/labor/hours` (Processed tab)
- **Needs:** Individual shift records with:
  - date, user_id, user_name, environment_id, environment_name
  - team_id, team_name
  - start, end, break_minutes, worked_hours
  - hourly_wage, wage_cost
  - type_name, shift_type, remarks, approved
- **Issue:** Queries raw_data with complex filters, N+1 queries for user names
- **Current:** Uses `eitje_raw_data` with pagination (good), but should use aggregated collection

#### **2.2. `aggregatedHours`** ✅
- **Uses:** `eitje_aggregated` ✅
- **Pages:** `/data/labor/hours` (Aggregated tab)
- **Status:** ✅ **ALREADY USING AGGREGATED COLLECTION**
- **Note:** This resolver is correct! Uses hierarchical data when available.

#### **2.3. `workerProfiles`** ❌
- **Uses:** `worker_profiles` + `eitje_raw_data` (for user name lookups)
- **Pages:** 
  - `/data/labor/workers`
  - `/data/labor/productivity` (for autocomplete)
  - `/data/labor/labor-cost` (for autocomplete)
- **Needs:** Worker profile data + user names from `eitje_raw_data`
- **Issue:** **N+1 QUERIES** - Fetches user names from `eitje_raw_data` for each worker
- **Current Query:**
  ```typescript
  // ❌ N+1 Query Pattern
  const userIds = [...new Set(records.map(r => r.eitje_user_id).filter(Boolean))];
  const users = await db.collection('eitje_raw_data').find({
    endpoint: 'users',
    'extracted.id': { $in: userIds }
  }).toArray();
  ```
- **Fix:** Store user names in `worker_profiles` collection during aggregation

---

### **3. Master Data Resolvers (2 resolvers)**

#### **3.1. `teams`** ⚠️
- **Uses:** `eitje_raw_data` (endpoint: 'teams')
- **Pages:** Various (used for filters)
- **Status:** Master data from Eitje API
- **Issue:** Queries raw_data for master data (teams list)
- **Fix:** Create `teams_aggregated` collection or use `unified_teams` collection

#### **3.2. `checkTeamData`** ✅
- **Uses:** `eitje_raw_data` (for diagnostics)
- **Status:** ✅ **OK - Diagnostics only, documented exception**

---

## 🎯 SOLUTION PLAN

### **Phase 1: Fix Sales Resolvers (7 resolvers)**

#### **1.1. Enhance `bork_aggregated` Collection**

**Add breakdown arrays to `BorkAggregated` schema:**
```typescript
interface BorkAggregated {
  // ... existing fields ...
  
  // NEW: Breakdown arrays for fast queries
  paymentMethodBreakdown?: Array<{
    paymentMethod: string;
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    percentageOfTotal: number;
  }>;
  
  waiterBreakdown?: Array<{
    waiterName: string;
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
}
```

**Update aggregation:** `/api/bork/v2/aggregate` to calculate and store these breakdowns

**Update resolvers:**
- `waiterPerformance` → use `bork_aggregated.waiterBreakdown[]`
- `paymentMethodStats` → use `bork_aggregated.paymentMethodBreakdown[]`
- `tableAnalysis` → use `bork_aggregated.tableBreakdown[]`
- `timeBasedAnalysis` → use `bork_aggregated.hourlyBreakdown[]`
- `revenueBreakdown` → use `bork_aggregated` (enhanced)

---

#### **1.2. Enhance `products_aggregated` Collection**

**Add product performance data to `ProductsAggregated` schema:**
```typescript
interface ProductsAggregated {
  // ... existing fields ...
  
  // NEW: Product performance by location
  productPerformanceByLocation?: Array<{
    locationId: ObjectId;
    locationName: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalProfit: number; // Calculate from cost_price if available
    averageUnitPrice: number;
    transactionCount: number;
    lastSoldDate: Date;
  }>;
}
```

**Update aggregation:** `/api/products/aggregate` to calculate and store profit per location

**Update resolver:**
- `productPerformance` → use `products_aggregated`, filter by date range using hierarchical data, flatten `productPerformanceByLocation`

---

#### **1.3. Create `sales_line_items_aggregated` Collection** ⚠️ **CRITICAL**

**New collection schema for LINE-ITEM level data:**
```typescript
interface SalesLineItemAggregated {
  _id?: ObjectId;
  ticketNumber: string;
  ticketKey: string;
  orderKey: string;
  orderLineKey: string;
  date: string; // YYYY-MM-DD
  locationId: ObjectId;
  locationName: string;
  productName: string;
  productSku?: string;
  productNumber?: string;
  category: string;
  groupName?: string;
  quantity: number;
  unitPrice: number;
  totalExVat: number;
  totalIncVat: number;
  vatRate: number;
  vatAmount: number;
  costPrice?: number;
  tableNumber?: number;
  waiterName?: string;
  paymentMethod?: string;
  time?: string; // HH:MM
  createdAt: Date;
  updatedAt: Date;
}
```

**Create aggregation:** `/api/bork/v2/aggregate-sales-line-items` (runs daily)

**Update resolver:**
- `dailySales` → use `sales_line_items_aggregated` with pagination

**Note:** This is DIFFERENT from `transactions_aggregated` (transaction summaries). This is for individual line items.

---

#### **1.4. Create `transactions_aggregated` Collection**

**New collection schema for TRANSACTION SUMMARY level data:**
```typescript
interface TransactionAggregated {
  _id?: ObjectId;
  ticketNumber: string;
  date: string; // YYYY-MM-DD
  locationId: ObjectId;
  locationName: string;
  tableNumber?: number;
  waiterName?: string;
  paymentMethod?: string;
  time?: string; // HH:MM
  totalRevenue: number;
  totalItems: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Create aggregation:** `/api/bork/v2/aggregate-transactions` (runs daily)

**Update resolver:**
- `transactionAnalysis` → use `transactions_aggregated` with pagination

---

### **Phase 2: Fix Labor Resolvers (2 resolvers)**

#### **2.1. Create `processed_hours_aggregated` Collection**

**New collection schema:**
```typescript
interface ProcessedHoursAggregated {
  _id?: ObjectId;
  date: string; // YYYY-MM-DD
  locationId: ObjectId;
  locationName: string;
  userId: number;
  userName: string; // ✅ Store name here (no N+1 queries!)
  environmentId?: number;
  environmentName?: string;
  teamId?: number;
  teamName?: string;
  start: string; // HH:MM
  end: string; // HH:MM
  breakMinutes: number;
  workedHours: number;
  hourlyWage: number;
  wageCost: number;
  typeName?: string;
  shiftType?: string;
  remarks?: string;
  approved?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Create aggregation:** `/api/eitje/v2/aggregate-processed-hours` (runs daily)

**Update resolver:**
- `processedHours` → use `processed_hours_aggregated` with pagination

---

#### **2.2. Fix `workerProfiles` N+1 Queries**

**Enhance `worker_profiles` collection:**
- Store `userName` field directly in `worker_profiles` during aggregation
- Update `/api/eitje/v2/aggregate-worker-profiles` to include user names

**Update resolver:**
- `workerProfiles` → remove `eitje_raw_data` lookup, use `userName` from `worker_profiles`

---

### **Phase 3: Fix Master Data Resolvers (1 resolver)**

#### **3.1. Use `unified_teams` Collection**

**Update resolver:**
- `teams` → use `unified_teams` collection instead of `eitje_raw_data`
- If `unified_teams` doesn't have all teams, create aggregation to populate it from `eitje_raw_data`

---

## 📋 IMPLEMENTATION CHECKLIST

### **Schema Updates:**
- [ ] Add breakdown arrays to `BorkAggregated` interface
- [ ] Add `productPerformanceByLocation[]` to `ProductsAggregated` interface
- [ ] Create `SalesLineItemAggregated` interface ⚠️ **CRITICAL - for dailySales**
- [ ] Create `TransactionAggregated` interface
- [ ] Create `ProcessedHoursAggregated` interface
- [ ] Add `userName` field to `worker_profiles` schema

### **Aggregation Updates:**
- [ ] Update `/api/bork/v2/aggregate` to calculate payment/waiter/table/hourly breakdowns
- [ ] Update `/api/products/aggregate` to calculate profit and location breakdowns
- [ ] Create `/api/bork/v2/aggregate-sales-line-items` endpoint ⚠️ **CRITICAL - for dailySales**
- [ ] Create `/api/bork/v2/aggregate-transactions` endpoint
- [ ] Create `/api/eitje/v2/aggregate-processed-hours` endpoint
- [ ] Update `/api/eitje/v2/aggregate-worker-profiles` to include user names

### **Resolver Updates:**
- [ ] `productPerformance` → use `products_aggregated`
- [ ] `waiterPerformance` → use `bork_aggregated.waiterBreakdown[]`
- [ ] `paymentMethodStats` → use `bork_aggregated.paymentMethodBreakdown[]`
- [ ] `tableAnalysis` → use `bork_aggregated.tableBreakdown[]`
- [ ] `timeBasedAnalysis` → use `bork_aggregated.hourlyBreakdown[]`
- [ ] `revenueBreakdown` → use `bork_aggregated` (enhanced)
- [ ] `dailySales` → use `sales_line_items_aggregated` ⚠️ **CRITICAL - line-item level**
- [ ] `transactionAnalysis` → use `transactions_aggregated`
- [ ] `processedHours` → use `processed_hours_aggregated`
- [ ] `workerProfiles` → remove `eitje_raw_data` lookup, use `userName` from `worker_profiles`
- [ ] `teams` → use `unified_teams` collection

### **Testing:**
- [ ] Verify all resolvers return same data as before
- [ ] Verify pagination works correctly
- [ ] Verify date filtering works correctly
- [ ] Verify location filtering works correctly
- [ ] Performance test: compare query times (should be 10-100x faster)
- [ ] Memory test: verify memory usage < 100MB per query

---

## 🎯 SUCCESS CRITERIA

- ✅ All 11 resolvers use aggregated collections
- ✅ No `extractSalesRecords` calls in GraphQL resolvers (except documented exceptions)
- ✅ No N+1 queries (user name lookups fixed)
- ✅ All queries use database-level pagination
- ✅ Query times < 500ms (vs current 2-10 seconds)
- ✅ Memory usage < 100MB per query (vs current 500MB+)
- ✅ All existing functionality preserved

---

## ⚠️ EXCEPTIONS (Documented)

1. **`checkTeamData`** - Uses `eitje_raw_data` for diagnostics only. This is acceptable.

**Note:** `dailySales` is NO LONGER an exception - it will use `sales_line_items_aggregated` collection (line-item level, not transaction summaries).

---

## 📊 PERFORMANCE IMPACT

### **Before:**
- Query time: 2-10 seconds
- Memory usage: 500MB+ per query
- Database load: High (queries raw_data with 5000+ records)
- Client-side pagination: Yes (fetches all, paginates in memory)

### **After:**
- Query time: < 500ms
- Memory usage: < 100MB per query
- Database load: Low (queries aggregated collections with < 100 records)
- Database-level pagination: Yes (only fetches requested page)

---

## 🚀 PRIORITY ORDER

1. **HIGH:** Fix `workerProfiles` N+1 queries (affects 3 pages)
2. **HIGH:** Fix 7 sales resolvers using `extractSalesRecords` (affects 7 pages)
3. **HIGH:** Fix `dailySales` - create `sales_line_items_aggregated` (affects main sales page)
4. **MEDIUM:** Fix `processedHours` (affects 1 page)
5. **LOW:** Fix `teams` resolver (affects filters only)

---

## 🔍 CRITICAL DISTINCTION

### **`sales_line_items_aggregated` vs `transactions_aggregated`**

**`sales_line_items_aggregated`** (for `dailySales`):
- **Level:** Line-item level
- **One record per:** Product sold in one order line
- **Fields:** `product_name`, `quantity`, `unit_price`, `order_line_key`, etc.
- **Use case:** Display individual product sales in table

**`transactions_aggregated`** (for `transactionAnalysis`):
- **Level:** Transaction summary level
- **One record per:** Ticket/transaction
- **Fields:** `totalRevenue`, `totalItems`, `itemCount` (aggregated)
- **Use case:** Display transaction summaries

**These are DIFFERENT collections for DIFFERENT purposes!**

