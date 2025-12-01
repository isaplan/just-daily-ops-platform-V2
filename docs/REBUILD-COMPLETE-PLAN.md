# 🏗️ COMPLETE REBUILD PLAN - SUMMARY

## 📋 Overview

Complete rebuild plan with:
1. ✅ **Collection naming** following page hierarchy
2. ✅ **Default page structure** component
3. ✅ **Date formatting** DD.MM.YY (default)
4. ✅ **Number formatting** 1.000, 100K, 1.4M (no decimals > 1000)

---

## 🎯 1. Collection Naming (Page-Aligned)

### **Labor Collections**
```
labor_raw_data              → /data/labor/hours
labor_hours_aggregated      → /data/labor/hours
labor_costs_aggregated      → /data/labor/costs
labor_productivity_aggregated → /data/labor/productivity
staff_aggregated            → /data/labor/workers
```

### **Sales Collections**
```
sales_raw_data              → /data/sales/daily
sales_daily_aggregated      → /data/sales/daily
sales_waiter_aggregated    → /data/sales/daily/waiters
sales_table_aggregated     → /data/sales/daily/tables
sales_transaction_aggregated → /data/sales/daily/transactions
sales_category_aggregated  → /data/sales/daily/categories-products
products_aggregated         → /data/sales/daily/categories-products
```

**See:** `docs/REBUILD-COLLECTIONS-NAMING.md` for full schema

---

## 🎨 2. Default Page Structure

### **Component:** `DefaultPageLayout`

**Features:**
- ✅ Standard header (title + subtitle)
- ✅ Date filter (presets)
- ✅ Location filter (buttons)
- ✅ Loading state
- ✅ Error state
- ✅ Consistent spacing

**Usage:**
```typescript
<DefaultPageLayout
  title="Labor Hours"
  subtitle="View processed and aggregated hours data"
  showDateFilter={true}
  showLocationFilter={true}
>
  {/* Page content */}
</DefaultPageLayout>
```

**See:** `docs/REBUILD-DEFAULTS-AND-FORMATTING.md` for full implementation

---

## 📅 3. Date Formatting: DD.MM.YY (Default)

### **Format:** `DD.MM.YY` (not `DD.MM'YY`)

**Examples:**
- `2025-01-15` → `15.01.25`
- `2025-12-31` → `31.12.25`

**Function:**
```typescript
formatDateDDMMYY(date) // Returns: "15.01.25"
```

**Usage:**
```typescript
import { formatDateDDMMYY } from '@/lib/dateFormatters';

<TableCell>{formatDateDDMMYY(record.date)}</TableCell>
```

**See:** `docs/REBUILD-DEFAULTS-AND-FORMATTING.md` for implementation

---

## 🔢 4. Number Formatting: Large Numbers

### **Rules:**
- **Numbers ≤ 1000:** Show decimals (e.g., `999,50`)
- **Numbers > 1000:** No decimals, use abbreviations (e.g., `1K`, `1.5K`, `1.4M`)

### **Examples:**
```typescript
formatNumber(500)        // "500"
formatNumber(999.50)    // "999,50"
formatNumber(1000)       // "1K" (no decimals)
formatNumber(1500)       // "1.5K" (1 decimal if needed)
formatNumber(10000)      // "10K" (no decimals)
formatNumber(1500000)    // "1.5M" (1 decimal if needed)

formatCurrency(500)      // "€500"
formatCurrency(999.50)   // "€999,50"
formatCurrency(1000)     // "€1K"
formatCurrency(1500)     // "€1.5K"
formatCurrency(1500000)  // "€1.5M"
```

**Functions:**
```typescript
formatNumber(num)      // Returns: "1.5K"
formatCurrency(num)    // Returns: "€1.5K"
```

**See:** `docs/REBUILD-DEFAULTS-AND-FORMATTING.md` for implementation

---

## 📊 Complete Data Flow

```
Raw Data Sources
  ↓
labor_raw_data / sales_raw_data
  ↓
Aggregation Services (denormalize: locationName, userName, teamName)
  ↓
Aggregated Collections (labor_hours_aggregated, sales_daily_aggregated, etc.)
  ↓
GraphQL Resolvers (query aggregated only)
  ↓
Pages (DefaultPageLayout + formatDateDDMMYY + formatNumber)
```

---

## ✅ Implementation Order

### **Phase 1: Foundation**
1. ✅ Create collection schemas (new naming)
2. ✅ Create `DefaultPageLayout` component
3. ✅ Update date formatter (DD.MM.YY)
4. ✅ Update number formatter (no decimals > 1000)

### **Phase 2: Collections**
1. ✅ Create `labor_raw_data` collection
2. ✅ Create `labor_hours_aggregated` collection
3. ✅ Create `labor_costs_aggregated` collection
4. ✅ Create `labor_productivity_aggregated` collection
5. ✅ Create `sales_raw_data` collection
6. ✅ Create `sales_daily_aggregated` collection
7. ✅ Create `sales_waiter_aggregated` collection
8. ✅ Create `sales_table_aggregated` collection
9. ✅ Create `sales_transaction_aggregated` collection
10. ✅ Create `sales_category_aggregated` collection
11. ✅ Create `staff_aggregated` collection

### **Phase 3: Services**
1. ✅ Create aggregation services for each collection
2. ✅ Update GraphQL resolvers to use new collections
3. ✅ Update GraphQL schema with new types

### **Phase 4: Pages**
1. ✅ Update all labor pages to use `DefaultPageLayout`
2. ✅ Update all sales pages to use `DefaultPageLayout`
3. ✅ Apply `formatDateDDMMYY()` to all date displays
4. ✅ Apply `formatNumber()` / `formatCurrency()` to all number displays

---

## 📁 File Structure

```
src/
  components/
    page/
      DefaultPageLayout.tsx        # NEW: Default page structure
  lib/
    dateFormatters.ts              # UPDATE: DD.MM.YY format
    utils.ts                        # UPDATE: Number formatting (no decimals > 1000)
  models/
    labor/
      labor-raw.model.ts           # NEW
      labor-hours-aggregated.model.ts # NEW
      labor-costs-aggregated.model.ts # NEW
      labor-productivity-aggregated.model.ts # NEW
    sales/
      sales-raw.model.ts            # NEW
      sales-daily-aggregated.model.ts # NEW
      sales-waiter-aggregated.model.ts # NEW
      sales-table-aggregated.model.ts # NEW
      sales-transaction-aggregated.model.ts # NEW
      sales-category-aggregated.model.ts # NEW
    staff/
      staff-aggregated.model.ts    # NEW
  lib/services/
    labor/
      labor-sync.service.ts         # NEW
      labor-hours-aggregation.service.ts # NEW
      labor-costs-aggregation.service.ts # NEW
      labor-productivity-aggregation.service.ts # NEW
    sales/
      sales-sync.service.ts         # NEW
      sales-daily-aggregation.service.ts # NEW
      sales-waiter-aggregation.service.ts # NEW
      sales-table-aggregation.service.ts # NEW
      sales-transaction-aggregation.service.ts # NEW
      sales-category-aggregation.service.ts # NEW
    staff/
      staff-aggregation.service.ts # NEW
```

---

## 🎯 Key Principles

1. **Collection names match page paths** - Easy to find which collection to use
2. **Default page structure** - Consistent UI across all pages
3. **Default date format** - DD.MM.YY everywhere
4. **Smart number formatting** - No decimals for large numbers, abbreviations
5. **Worker-centric** - `staff_aggregated` connects everything

---

## 📚 Documentation

- **Collection Naming:** `docs/REBUILD-COLLECTIONS-NAMING.md`
- **Defaults & Formatting:** `docs/REBUILD-DEFAULTS-AND-FORMATTING.md`
- **Data Architecture:** `docs/DATA-ARCHITECTURE-SCHEMA.md`
- **GraphQL Coverage:** `docs/GRAPHQL-QUERIES-COVERAGE.md`
- **Rebuild Summary:** `docs/REBUILD-PLAN-SUMMARY.md`

---

**Status:** Ready to Start  
**Priority:** High - Foundation for entire rebuild  
**Estimated Time:** 2-3 weeks

