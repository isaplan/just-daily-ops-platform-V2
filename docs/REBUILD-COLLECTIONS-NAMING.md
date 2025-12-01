# 🏗️ REBUILD: Collections Naming & Structure

## 🎯 New Collection Naming Strategy

**Follow page hierarchy in database collections**

---

## 📊 Page Structure → Collection Mapping

### **1. Labor (Eitje Data)**

**Page Path:** `/data/labor/*`

**Collections:**
```
labor_raw_data              # Raw Eitje API responses
  ↓
labor_hours_aggregated      # Aggregated hours data
labor_costs_aggregated      # Aggregated labor costs
labor_productivity_aggregated # Productivity metrics
staff_aggregated            # Worker profiles (unified)
```

**Sub-pages:**
- `/data/labor/hours` → Uses `labor_hours_aggregated`
- `/data/labor/costs` → Uses `labor_costs_aggregated`
- `/data/labor/productivity` → Uses `labor_productivity_aggregated`
- `/data/labor/workers` → Uses `staff_aggregated`

---

### **2. Sales (Bork Data)**

**Page Path:** `/data/sales/*`

**Collections:**
```
sales_raw_data              # Raw Bork API responses
  ↓
sales_daily_aggregated      # Daily sales totals
sales_waiter_aggregated     # Waiter performance
sales_table_aggregated      # Table analysis
sales_transaction_aggregated # Transaction details
sales_category_aggregated   # Category breakdown
products_aggregated        # Product-level data
```

**Sub-pages:**
- `/data/sales/daily` → Uses `sales_daily_aggregated`
- `/data/sales/daily/waiters` → Uses `sales_waiter_aggregated`
- `/data/sales/daily/tables` → Uses `sales_table_aggregated`
- `/data/sales/daily/transactions` → Uses `sales_transaction_aggregated`
- `/data/sales/daily/categories-products` → Uses `sales_category_aggregated`, `products_aggregated`

---

### **3. Staff (Unified Workers/Waiters/Employees)**

**Page Path:** `/data/labor/workers` (or future `/data/staff/*`)

**Collections:**
```
staff_aggregated            # Unified worker profiles
  - Links Eitje userId ↔ Bork waiterId
  - Contains: hours, costs, sales, productivity
```

**Sub-pages:**
- `/data/labor/workers` → Uses `staff_aggregated`
- Future: `/data/staff/*` → Uses `staff_aggregated`

---

## 📋 Complete Collection Schema

### **Raw Data Collections**

```typescript
// 1. Labor Raw Data
interface LaborRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  rawApiResponse: Record<string, any>; // Eitje API response
  extracted: {
    userId?: number; // Eitje user ID
    unifiedUserId?: ObjectId; // Resolved from staff_aggregated
    teamId?: number; // Eitje team ID
    unifiedTeamId?: ObjectId; // Resolved from teams
    hoursWorked?: number;
    wageCost?: number;
    shiftStart?: Date;
    shiftEnd?: Date;
  };
  importId?: string;
  createdAt: Date;
}

// 2. Sales Raw Data
interface SalesRawData {
  _id?: ObjectId;
  locationId: ObjectId;
  date: Date;
  rawApiResponse: Record<string, any>; // Bork API response
  extracted: {
    waiterId?: string; // Bork waiter ID
    unifiedUserId?: ObjectId; // Resolved from staff_aggregated
    productName?: string;
    category?: string;
    quantity?: number;
    revenue?: number;
    tableNumber?: number;
    paymentMethod?: string;
    ticketKey?: string;
    orderKey?: string;
    timestamp?: Date;
  };
  importId?: string;
  createdAt: Date;
}
```

---

### **Aggregated Collections**

```typescript
// 1. Labor Hours Aggregated
interface LaborHoursAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Daily totals
  totalHoursWorked: number;
  totalShifts: number;
  
  // Team breakdown
  teamStats: Array<{
    teamId: ObjectId;
    teamName: string; // ✅ Denormalized
    totalHours: number;
    shiftCount: number;
  }>;
  
  // Worker breakdown
  workerStats: Array<{
    unifiedUserId: ObjectId; // Reference to staff_aggregated
    userName: string; // ✅ Denormalized
    eitjeUserId: number;
    totalHours: number;
    shiftCount: number;
    teamId?: ObjectId;
    teamName?: string; // ✅ Denormalized
  }>;
  
  // Hierarchical time-series
  hoursByYear?: Array<{ /* ... */ }>;
  hoursByMonth?: Array<{ /* ... */ }>;
  hoursByWeek?: Array<{ /* ... */ }>;
  hoursByDay?: Array<{ /* ... */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 2. Labor Costs Aggregated
interface LaborCostsAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Daily totals
  totalWageCost: number;
  totalHoursWorked: number;
  averageHourlyCost: number;
  
  // Team breakdown
  teamStats: Array<{
    teamId: ObjectId;
    teamName: string; // ✅ Denormalized
    totalCost: number;
    totalHours: number;
  }>;
  
  // Worker breakdown
  workerStats: Array<{
    unifiedUserId: ObjectId; // Reference to staff_aggregated
    userName: string; // ✅ Denormalized
    totalCost: number;
    totalHours: number;
    hourlyWage: number;
  }>;
  
  // Hierarchical time-series
  costsByYear?: Array<{ /* ... */ }>;
  costsByMonth?: Array<{ /* ... */ }>;
  costsByWeek?: Array<{ /* ... */ }>;
  costsByDay?: Array<{ /* ... */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 3. Labor Productivity Aggregated
interface LaborProductivityAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Productivity metrics
  totalRevenue: number; // From sales
  totalHoursWorked: number; // From hours
  totalWageCost: number; // From costs
  revenuePerHour: number; // Calculated
  laborCostPercentage: number; // Calculated
  
  // Team breakdown
  teamStats: Array<{
    teamId: ObjectId;
    teamName: string; // ✅ Denormalized
    revenue: number;
    hours: number;
    cost: number;
    productivity: number;
  }>;
  
  // Worker breakdown
  workerStats: Array<{
    unifiedUserId: ObjectId; // Reference to staff_aggregated
    userName: string; // ✅ Denormalized
    revenue: number;
    hours: number;
    cost: number;
    productivity: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 4. Sales Daily Aggregated
interface SalesDailyAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Daily totals
  totalRevenue: number;
  totalQuantity: number;
  totalTransactions: number;
  avgRevenuePerTransaction: number;
  
  // Category breakdown
  revenueByCategory: Record<string, number>;
  
  // Payment method breakdown
  revenueByPaymentMethod: Record<string, number>;
  
  // Hierarchical time-series
  salesByYear?: Array<{ /* ... */ }>;
  salesByMonth?: Array<{ /* ... */ }>;
  salesByWeek?: Array<{ /* ... */ }>;
  salesByDay?: Array<{ /* ... */ }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 5. Sales Waiter Aggregated
interface SalesWaiterAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Waiter breakdown
  waiters: Array<{
    unifiedUserId: ObjectId; // Reference to staff_aggregated
    userName: string; // ✅ Denormalized
    borkWaiterId?: string;
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
    averageTicketValue: number;
    averageItemsPerTransaction: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 6. Sales Table Aggregated
interface SalesTableAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Table breakdown
  tables: Array<{
    tableNumber: number;
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
    averageTransactionValue: number;
    turnoverRate: number; // Transactions per hour
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 7. Sales Transaction Aggregated
interface SalesTransactionAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Transaction breakdown
  transactions: Array<{
    ticketKey: string;
    ticketNumber: string;
    tableNumber?: number;
    waiterName?: string;
    unifiedUserId?: ObjectId; // Reference to staff_aggregated
    paymentMethod: string;
    time: Date;
    totalRevenue: number;
    totalItems: number;
    itemCount: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 8. Sales Category Aggregated
interface SalesCategoryAggregated {
  _id?: ObjectId;
  locationId: ObjectId;
  locationName: string; // ✅ Denormalized
  date: Date;
  
  // Category breakdown
  categories: Array<{
    categoryName: string;
    totalRevenue: number;
    totalQuantity: number;
    totalTransactions: number;
    averagePrice: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 9. Staff Aggregated (Unified Workers/Waiters/Employees)
interface StaffAggregated {
  _id?: ObjectId;
  
  // Unified identity
  unifiedUserId: ObjectId; // Primary key
  userName: string; // ✅ Denormalized from unified_users
  firstName?: string;
  lastName?: string;
  email?: string;
  
  // System mappings
  eitjeUserId?: number;
  borkWaiterId?: string;
  
  // Location & Team
  locationId?: ObjectId;
  locationName?: string; // ✅ Denormalized
  locationIds?: ObjectId[];
  locationNames?: string[]; // ✅ Denormalized
  
  teamIds?: ObjectId[];
  teamNames?: string[]; // ✅ Denormalized
  
  // Contract data
  contractType?: string;
  contractHours?: number;
  hourlyWage?: number;
  wageOverride: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  
  // Aggregated metrics (from other collections)
  thisMonth: {
    hours: number; // From labor_hours_aggregated
    cost: number; // From labor_costs_aggregated
    sales: number; // From sales_waiter_aggregated
    productivity: number; // Calculated: sales / hours
  };
  
  lastMonth: {
    hours: number;
    cost: number;
    sales: number;
    productivity: number;
  };
  
  total: {
    hours: number;
    cost: number;
    sales: number;
    productivity: number;
  };
  
  // Active periods
  activeYears: number[];
  activeMonths: Array<{ year: number; month: number }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 Migration from Old Names

### **Old → New Collection Mapping**

```
eitje_raw_data          → labor_raw_data
eitje_aggregated       → labor_hours_aggregated (split)
                        → labor_costs_aggregated (split)
                        → labor_productivity_aggregated (split)

bork_raw_data          → sales_raw_data
bork_aggregated        → sales_daily_aggregated
                        → sales_waiter_aggregated (new)
                        → sales_table_aggregated (new)
                        → sales_transaction_aggregated (new)
                        → sales_category_aggregated (new)

worker_profiles_aggregated → staff_aggregated
products_aggregated    → products_aggregated (keep)
```

---

## 📁 File Structure Updates

### **Models**
```
src/models/
  labor/
    labor-raw.model.ts
    labor-hours-aggregated.model.ts
    labor-costs-aggregated.model.ts
    labor-productivity-aggregated.model.ts
  sales/
    sales-raw.model.ts
    sales-daily-aggregated.model.ts
    sales-waiter-aggregated.model.ts
    sales-table-aggregated.model.ts
    sales-transaction-aggregated.model.ts
    sales-category-aggregated.model.ts
  staff/
    staff-aggregated.model.ts
  products/
    products-aggregated.model.ts (keep)
```

### **Services**
```
src/lib/services/
  labor/
    labor-sync.service.ts          # Sync from Eitje API
    labor-hours-aggregation.service.ts
    labor-costs-aggregation.service.ts
    labor-productivity-aggregation.service.ts
  sales/
    sales-sync.service.ts          # Sync from Bork API
    sales-daily-aggregation.service.ts
    sales-waiter-aggregation.service.ts
    sales-table-aggregation.service.ts
    sales-transaction-aggregation.service.ts
    sales-category-aggregation.service.ts
  staff/
    staff-aggregation.service.ts   # Aggregate worker profiles
```

### **GraphQL Resolvers**
```
src/lib/graphql/
  v2-resolvers.ts
    - laborHoursAggregated()      # Query labor_hours_aggregated
    - laborCostsAggregated()      # Query labor_costs_aggregated
    - laborProductivityAggregated() # Query labor_productivity_aggregated
    - salesDailyAggregated()      # Query sales_daily_aggregated
    - salesWaiterAggregated()     # Query sales_waiter_aggregated
    - salesTableAggregated()      # Query sales_table_aggregated
    - salesTransactionAggregated() # Query sales_transaction_aggregated
    - salesCategoryAggregated()   # Query sales_category_aggregated
    - staffAggregated()           # Query staff_aggregated
```

---

## ✅ Benefits

1. **Clear Mapping:** Collection names match page paths
2. **Easy Navigation:** Developers know which collection to use
3. **Better Organization:** Related data grouped logically
4. **Scalability:** Easy to add new aggregations per page
5. **Maintainability:** Clear naming convention

---

## 🎯 Next Steps

1. **Create new collection schemas** in `src/lib/mongodb/v2-schema.ts`
2. **Update models** to match new collection names
3. **Create aggregation services** for each new collection
4. **Update GraphQL resolvers** to use new collections
5. **Migrate existing data** from old collections to new ones
6. **Update pages** to use new GraphQL queries

---

**Status:** Planning Phase  
**Ready to Start:** Create new collection schemas

