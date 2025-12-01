# Aggregation Migration Plan - Fix Raw Data Usage

## 🔍 ANALYSIS: What `extractSalesRecords` Provides

### Data Extracted from `bork_raw_data`:
```typescript
{
  id, date, location_id, location_name,
  ticket_key, ticket_number, order_key, order_line_key,
  product_name, product_sku, product_number,
  category, group_name,
  quantity, unit_price,
  total_ex_vat, total_inc_vat, vat_rate, vat_amount,
  cost_price,
  payment_method, table_number, waiter_name, time,
  created_at, updated_at
}
```

---

## 📊 RESOLVERS USING RAW DATA (7 resolvers)

### 1. **productPerformance** 
**Groups by:** `product_name + location_id`
**Needs:**
- product_name, category, location_id, location_name
- quantity, total_inc_vat, cost_price, unit_price
- ticket_number, date (for transaction_count)

**Calculates:**
- total_quantity_sold, total_revenue, total_profit
- average_unit_price, transaction_count

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 2. **waiterPerformance**
**Groups by:** `waiter_name + location_id`
**Needs:**
- waiter_name, location_id, location_name
- total_inc_vat, quantity
- ticket_number, date (for transaction_count)

**Calculates:**
- total_revenue, total_items_sold, total_transactions
- average_ticket_value, average_items_per_transaction

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 3. **revenueBreakdown**
**Groups by:** `date + location_id`
**Needs:**
- date, location_id, location_name
- total_ex_vat, total_inc_vat, vat_amount
- ticket_number (for transaction_count)

**Calculates:**
- total_revenue_ex_vat, total_revenue_inc_vat, total_vat
- total_transactions, average_transaction_value

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 4. **paymentMethodStats**
**Groups by:** `payment_method + location_id`
**Needs:**
- payment_method, location_id, location_name
- total_inc_vat
- ticket_number, date (for transaction_count)

**Calculates:**
- total_revenue, total_transactions
- average_transaction_value, percentage_of_total

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 5. **timeBasedAnalysis**
**Groups by:** `hour + location_id`
**Needs:**
- time (extract hour), location_id, location_name
- total_inc_vat, quantity
- ticket_number, date (for transaction_count)

**Calculates:**
- total_revenue, total_items_sold, total_transactions
- average_transaction_value

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 6. **tableAnalysis**
**Groups by:** `table_number + location_id`
**Needs:**
- table_number, location_id, location_name
- total_inc_vat, quantity
- ticket_number, date (for transaction_count)

**Calculates:**
- total_revenue, total_items_sold, total_transactions
- average_transaction_value

**Current:** Uses `extractSalesRecords` → groups in memory

---

### 7. **transactionAnalysis**
**Groups by:** `ticket_number + date`
**Needs:**
- ticket_number, date, location_id, location_name
- table_number, waiter_name, payment_method, time
- total_inc_vat, quantity

**Calculates:**
- total_revenue, total_items, item_count

**Current:** Uses `extractSalesRecords` → groups in memory

---

## ✅ EXISTING AGGREGATED COLLECTIONS

### `products_aggregated`
**Has:**
- ✅ product_name, category, locationDetails[]
- ✅ totalQuantitySold, totalRevenue, totalTransactions
- ✅ salesByDate[] (with locationId, quantity, revenueExVat, revenueIncVat, transactionCount)
- ✅ salesByYear/Month/Week/Day (hierarchical with byLocation[])

**Missing:**
- ❌ Profit calculation (cost_price not stored)
- ❌ Per-location breakdown in time-series (has byLocation but needs date filtering)

**Can Use For:** `productPerformance` (with modifications)

---

### `bork_aggregated`
**Has:**
- ✅ date, locationId
- ✅ totalRevenue, totalQuantity, totalTransactions
- ✅ revenueByCategory[]

**Missing:**
- ❌ Payment method breakdown
- ❌ Waiter breakdown
- ❌ Table breakdown
- ❌ Hourly breakdown
- ❌ Transaction-level detail

**Can Use For:** `revenueBreakdown` (partially - needs enhancement)

---

## 🎯 SOLUTION PLAN

### **Option A: Enhance Existing Collections** (RECOMMENDED)

#### **1. Enhance `products_aggregated` for `productPerformance`**
**Add to schema:**
```typescript
// In ProductsAggregated interface
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
```

**Update aggregation:** `/api/products/aggregate` to calculate and store profit per location

**Update resolver:** Query `products_aggregated`, filter by date range using hierarchical data, flatten `productPerformanceByLocation`

---

#### **2. Enhance `bork_aggregated` for Multiple Resolvers**
**Add to schema:**
```typescript
// In BorkAggregated interface
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
```

**Update aggregation:** `/api/bork/v2/aggregate` to calculate and store these breakdowns

**Update resolvers:** Query `bork_aggregated`, filter by date range, return breakdown arrays

---

#### **3. Create `transactions_aggregated` for `transactionAnalysis`**
**New collection schema:**
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

**Update resolver:** Query `transactions_aggregated` with pagination

---

### **Option B: Create New Aggregated Collections** (If Option A too complex)

#### **1. `product_performance_aggregated`**
```typescript
{
  _id: ObjectId,
  productName: string,
  category: string,
  locationId: ObjectId,
  locationName: string,
  date: string, // YYYY-MM-DD
  totalQuantitySold: number,
  totalRevenue: number,
  totalProfit: number,
  averageUnitPrice: number,
  transactionCount: number
}
```

#### **2. `waiter_performance_aggregated`**
```typescript
{
  _id: ObjectId,
  waiterName: string,
  locationId: ObjectId,
  locationName: string,
  date: string,
  totalRevenue: number,
  totalItemsSold: number,
  totalTransactions: number,
  averageTicketValue: number,
  averageItemsPerTransaction: number
}
```

#### **3. `payment_method_stats_aggregated`**
```typescript
{
  _id: ObjectId,
  paymentMethod: string,
  locationId: ObjectId,
  locationName: string,
  date: string,
  totalRevenue: number,
  totalTransactions: number,
  averageTransactionValue: number,
  percentageOfTotal: number
}
```

#### **4. `table_analysis_aggregated`**
```typescript
{
  _id: ObjectId,
  tableNumber: number,
  locationId: ObjectId,
  locationName: string,
  date: string,
  totalRevenue: number,
  totalItemsSold: number,
  totalTransactions: number,
  averageTransactionValue: number
}
```

#### **5. `time_analysis_aggregated`**
```typescript
{
  _id: ObjectId,
  hour: number, // 0-23
  locationId: ObjectId,
  locationName: string,
  date: string,
  totalRevenue: number,
  totalItemsSold: number,
  totalTransactions: number,
  averageTransactionValue: number
}
```

---

## 🚀 RECOMMENDED APPROACH: **Option A (Enhance Existing)**

### **Phase 1: Enhance `products_aggregated`**
1. Add `productPerformanceByLocation[]` field to schema
2. Update `/api/products/aggregate` to calculate profit and store per-location stats
3. Update `productPerformance` resolver to query `products_aggregated` with date filtering

### **Phase 2: Enhance `bork_aggregated`**
1. Add breakdown arrays to schema (paymentMethod, waiter, table, hourly)
2. Update `/api/bork/v2/aggregate` to calculate and store breakdowns
3. Update resolvers: `waiterPerformance`, `paymentMethodStats`, `tableAnalysis`, `timeBasedAnalysis`, `revenueBreakdown`

### **Phase 3: Create `transactions_aggregated`**
1. Create schema and collection
2. Create `/api/bork/v2/aggregate-transactions` endpoint
3. Update `transactionAnalysis` resolver

### **Phase 4: Update All Resolvers**
1. Remove `extractSalesRecords` calls
2. Query aggregated collections with proper pagination
3. Use database-level filtering and sorting

---

## 📋 IMPLEMENTATION CHECKLIST

### **Schema Updates:**
- [ ] Add `productPerformanceByLocation[]` to `ProductsAggregated`
- [ ] Add breakdown arrays to `BorkAggregated`
- [ ] Create `TransactionAggregated` interface

### **Aggregation Updates:**
- [ ] Update `/api/products/aggregate` to calculate profit and location breakdowns
- [ ] Update `/api/bork/v2/aggregate` to calculate payment/waiter/table/hourly breakdowns
- [ ] Create `/api/bork/v2/aggregate-transactions` endpoint

### **Resolver Updates:**
- [ ] `productPerformance` → use `products_aggregated`
- [ ] `waiterPerformance` → use `bork_aggregated.waiterBreakdown[]`
- [ ] `paymentMethodStats` → use `bork_aggregated.paymentMethodBreakdown[]`
- [ ] `tableAnalysis` → use `bork_aggregated.tableBreakdown[]`
- [ ] `timeBasedAnalysis` → use `bork_aggregated.hourlyBreakdown[]`
- [ ] `revenueBreakdown` → use `bork_aggregated` (enhanced)
- [ ] `transactionAnalysis` → use `transactions_aggregated`

### **Testing:**
- [ ] Verify all resolvers return same data as before
- [ ] Verify pagination works correctly
- [ ] Verify date filtering works correctly
- [ ] Verify location filtering works correctly
- [ ] Performance test: compare query times (should be 10-100x faster)

---

## ⚠️ CRITICAL NOTES

1. **Profit Calculation:** Need to ensure `cost_price` is available in aggregation. If not, profit will be null.

2. **Date Filtering:** Use hierarchical time-series data (`salesByYear/Month/Week/Day`) for fast queries.

3. **Pagination:** All resolvers MUST use database-level pagination (`.skip()` and `.limit()`), not client-side.

4. **Indexes:** Ensure indexes exist on:
   - `products_aggregated`: `productName`, `locationDetails.locationId`, `salesByDate.date`
   - `bork_aggregated`: `date`, `locationId`
   - `transactions_aggregated`: `date`, `locationId`, `ticketNumber`

5. **Backward Compatibility:** Keep `extractSalesRecords` function for cron jobs, but mark as deprecated for GraphQL use.

---

## 🎯 SUCCESS CRITERIA

- ✅ All 7 resolvers use aggregated collections
- ✅ No `extractSalesRecords` calls in GraphQL resolvers
- ✅ All queries use database-level pagination
- ✅ Query times < 500ms (vs current 2-10 seconds)
- ✅ Memory usage < 100MB per query (vs current 500MB+)
- ✅ All existing functionality preserved









