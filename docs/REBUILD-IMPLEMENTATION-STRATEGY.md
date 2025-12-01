# 🚀 REBUILD IMPLEMENTATION STRATEGY

## 🎯 Overview

**Strategy:** Incremental migration with parallel collections + feature branch

---

## 🌿 Branch Strategy

### **Option 1: Single Feature Branch (Recommended)**

**Branch:** `rebuild/v2-collections-and-pages`

**Why:**
- ✅ All changes in one place
- ✅ Easier to review
- ✅ Can merge incrementally
- ✅ Rollback is simple

**Workflow:**
```bash
# Create feature branch
git checkout -b rebuild/v2-collections-and-pages

# Work on all changes
# - New collections
# - New models
# - New services
# - Updated pages

# Merge when ready
git checkout main
git merge rebuild/v2-collections-and-pages
```

---

### **Option 2: Multiple Feature Branches (If Very Large)**

**Branches:**
- `rebuild/v2-collections` - Database collections only
- `rebuild/v2-models-services` - Models and services
- `rebuild/v2-pages` - Page updates

**Why:**
- ✅ Smaller, focused PRs
- ✅ Can review incrementally
- ❌ More complex merge process
- ❌ Need to coordinate dependencies

**Recommendation:** Use **Option 1** unless the changes are too large (>500 files)

---

## 💾 Database Migration Strategy

### **Approach: Parallel Collections (No Data Loss)**

**Strategy:** Create new collections alongside old ones, migrate data incrementally

### **Phase 1: Create New Collections (No Data Migration)**

**Step 1: Create new collection schemas**
```typescript
// src/lib/mongodb/v2-schema.ts
// Add new interfaces alongside old ones

// OLD (keep for now)
export interface EitjeRawData { ... }
export interface BorkRawData { ... }

// NEW (add new)
export interface LaborRawData { ... }
export interface LaborHoursAggregated { ... }
export interface SalesRawData { ... }
export interface SalesDailyAggregated { ... }
```

**Step 2: Create indexes for new collections**
```typescript
// src/lib/mongodb/v2-indexes.ts
// Add indexes for new collections

await db.collection('labor_raw_data').createIndex({ locationId: 1, date: -1 });
await db.collection('labor_hours_aggregated').createIndex({ locationId: 1, date: -1 });
// ... etc
```

**Step 3: Create aggregation services (write to new collections)**
```typescript
// src/lib/services/labor/labor-hours-aggregation.service.ts
// Aggregates from labor_raw_data → labor_hours_aggregated
// (Doesn't touch old collections yet)
```

**Result:**
- ✅ New collections exist (empty)
- ✅ Old collections still work
- ✅ No breaking changes
- ✅ Can test new collections independently

---

### **Phase 2: Data Migration (Incremental)**

**Option A: Dual-Write (Recommended)**

**Strategy:** Write to both old and new collections during transition

```typescript
// src/lib/services/labor/labor-sync.service.ts
export async function syncLaborData() {
  // 1. Fetch from Eitje API
  const rawData = await fetchEitjeData();
  
  // 2. Write to OLD collection (for backward compatibility)
  await db.collection('eitje_raw_data').insertMany(rawData);
  
  // 3. Write to NEW collection (for new pages)
  await db.collection('labor_raw_data').insertMany(rawData);
  
  // 4. Aggregate to NEW collections
  await aggregateLaborHours(rawData);
}
```

**Benefits:**
- ✅ Old pages keep working
- ✅ New pages can use new collections
- ✅ No data loss
- ✅ Can rollback easily

**Option B: One-Time Migration Script**

**Strategy:** Migrate all historical data at once

```typescript
// scripts/migrate-to-v2-collections.ts
export async function migrateToV2Collections() {
  // 1. Migrate raw data
  const oldRawData = await db.collection('eitje_raw_data').find({}).toArray();
  await db.collection('labor_raw_data').insertMany(oldRawData);
  
  // 2. Re-aggregate to new collections
  await aggregateLaborHours();
  await aggregateLaborCosts();
  // ... etc
}
```

**When to use:** After new collections are tested and working

**Recommendation:** Use **Option A (Dual-Write)** during development, then **Option B** for final migration

---

### **Phase 3: Switch Pages to New Collections**

**Strategy:** Update pages one by one to use new collections

**Step 1: Update GraphQL resolvers**
```typescript
// src/lib/graphql/v2-resolvers.ts

// OLD (keep for backward compatibility)
laborAggregated: async (...) => {
  return await db.collection('eitje_aggregated').find(...);
}

// NEW (add new resolver)
laborHoursAggregated: async (...) => {
  return await db.collection('labor_hours_aggregated').find(...);
}
```

**Step 2: Update pages to use new resolvers**
```typescript
// src/app/(dashboard)/data/labor/hours/page.tsx

// OLD
const data = await getLaborAggregated(...);

// NEW
const data = await getLaborHoursAggregated(...);
```

**Step 3: Test each page**
- ✅ Verify data matches
- ✅ Verify performance
- ✅ Verify UI works

---

### **Phase 4: Remove Old Collections (After All Pages Migrated)**

**Strategy:** Only remove after all pages are using new collections

**Checklist:**
- [ ] All labor pages use new collections
- [ ] All sales pages use new collections
- [ ] All GraphQL queries use new resolvers
- [ ] No references to old collections in code
- [ ] Backup old collections (just in case)

**Script:**
```typescript
// scripts/remove-old-collections.ts
export async function removeOldCollections() {
  // 1. Verify no references
  // 2. Backup old collections
  // 3. Drop old collections
  await db.collection('eitje_raw_data').drop();
  await db.collection('eitje_aggregated').drop();
  // ... etc
}
```

**Timeline:** After 1-2 weeks of stable operation with new collections

---

## 📄 Page Migration Strategy

### **Approach: Incremental Page Updates**

**Strategy:** Update pages one section at a time

### **Phase 1: Foundation Components**

**Step 1: Create default components**
- [ ] `DefaultPageLayout.tsx`
- [ ] Update `formatDateDDMMYY()` (DD.MM.YY)
- [ ] Update `formatNumber()` (no decimals > 1000)

**Step 2: Test components**
- [ ] Create test page
- [ ] Verify formatting works
- [ ] Verify layout works

---

### **Phase 2: Update Pages by Section**

**Order:**
1. **Labor Pages** (smallest section)
   - [ ] `/data/labor/hours` → Use `labor_hours_aggregated`
   - [ ] `/data/labor/costs` → Use `labor_costs_aggregated`
   - [ ] `/data/labor/productivity` → Use `labor_productivity_aggregated`
   - [ ] `/data/labor/workers` → Use `staff_aggregated`

2. **Sales Pages** (larger section)
   - [ ] `/data/sales/daily` → Use `sales_daily_aggregated`
   - [ ] `/data/sales/daily/waiters` → Use `sales_waiter_aggregated`
   - [ ] `/data/sales/daily/tables` → Use `sales_table_aggregated`
   - [ ] `/data/sales/daily/transactions` → Use `sales_transaction_aggregated`
   - [ ] `/data/sales/daily/categories-products` → Use `sales_category_aggregated`

3. **Other Pages** (if any)
   - [ ] Update remaining pages

---

### **Page Update Checklist (Per Page)**

For each page:

1. **Update Data Fetching**
   - [ ] Change GraphQL query to use new resolver
   - [ ] Update service call
   - [ ] Verify data structure matches

2. **Update UI Components**
   - [ ] Wrap in `DefaultPageLayout`
   - [ ] Update date formatting (`formatDateDDMMYY`)
   - [ ] Update number formatting (`formatNumber` / `formatCurrency`)
   - [ ] Update filters (if needed)

3. **Test**
   - [ ] Verify data displays correctly
   - [ ] Verify filters work
   - [ ] Verify formatting is correct
   - [ ] Verify performance (should be same or better)

4. **Commit**
   - [ ] Commit per page (small, reviewable changes)
   - [ ] Or commit per section (labor, sales, etc.)

---

## 🔄 Migration Timeline

### **Week 1: Foundation**
- [ ] Create feature branch
- [ ] Create new collection schemas
- [ ] Create indexes
- [ ] Create `DefaultPageLayout` component
- [ ] Update formatting utilities

### **Week 2: Collections & Services**
- [ ] Create aggregation services (write to new collections)
- [ ] Implement dual-write (old + new collections)
- [ ] Create GraphQL resolvers for new collections
- [ ] Test aggregation services

### **Week 3: Page Migration - Labor**
- [ ] Migrate `/data/labor/hours`
- [ ] Migrate `/data/labor/costs`
- [ ] Migrate `/data/labor/productivity`
- [ ] Migrate `/data/labor/workers`
- [ ] Test all labor pages

### **Week 4: Page Migration - Sales**
- [ ] Migrate `/data/sales/daily`
- [ ] Migrate `/data/sales/daily/waiters`
- [ ] Migrate `/data/sales/daily/tables`
- [ ] Migrate `/data/sales/daily/transactions`
- [ ] Migrate `/data/sales/daily/categories-products`
- [ ] Test all sales pages

### **Week 5: Cleanup**
- [ ] Remove old GraphQL resolvers (or mark deprecated)
- [ ] Remove dual-write (only write to new collections)
- [ ] Update documentation
- [ ] Final testing

### **Week 6+ (Optional): Remove Old Collections**
- [ ] Backup old collections
- [ ] Remove old collections
- [ ] Update any remaining references

---

## ✅ Safety Measures

### **1. Feature Flags (Optional)**

```typescript
// src/lib/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_V2_COLLECTIONS: process.env.USE_V2_COLLECTIONS === 'true',
  USE_V2_PAGES: process.env.USE_V2_PAGES === 'true',
};

// In resolvers
laborHoursAggregated: async (...) => {
  if (FEATURE_FLAGS.USE_V2_COLLECTIONS) {
    return await db.collection('labor_hours_aggregated').find(...);
  } else {
    return await db.collection('eitje_aggregated').find(...);
  }
}
```

**Benefits:**
- ✅ Can toggle on/off per environment
- ✅ Can test in staging before production
- ✅ Easy rollback

---

### **2. Data Validation**

```typescript
// scripts/validate-v2-collections.ts
export async function validateV2Collections() {
  // Compare counts
  const oldCount = await db.collection('eitje_aggregated').countDocuments();
  const newCount = await db.collection('labor_hours_aggregated').countDocuments();
  
  if (oldCount !== newCount) {
    throw new Error(`Count mismatch: old=${oldCount}, new=${newCount}`);
  }
  
  // Compare sample records
  const oldSample = await db.collection('eitje_aggregated').findOne();
  const newSample = await db.collection('labor_hours_aggregated').findOne();
  
  // Validate structure matches
  // ...
}
```

---

### **3. Rollback Plan**

**If something goes wrong:**

1. **Revert code** (git revert)
2. **Switch feature flag** (if using)
3. **Pages automatically use old collections** (if dual-write)
4. **No data loss** (old collections still exist)

---

## 📋 Implementation Checklist

### **Pre-Implementation**
- [ ] Create feature branch: `rebuild/v2-collections-and-pages`
- [ ] Review plan with team
- [ ] Set up feature flags (optional)
- [ ] Create backup of current database

### **Phase 1: Foundation**
- [ ] Create new collection schemas
- [ ] Create indexes for new collections
- [ ] Create `DefaultPageLayout` component
- [ ] Update date formatter (DD.MM.YY)
- [ ] Update number formatter (no decimals > 1000)

### **Phase 2: Collections**
- [ ] Create aggregation services
- [ ] Implement dual-write (old + new)
- [ ] Create GraphQL resolvers
- [ ] Test aggregation

### **Phase 3: Pages - Labor**
- [ ] Migrate `/data/labor/hours`
- [ ] Migrate `/data/labor/costs`
- [ ] Migrate `/data/labor/productivity`
- [ ] Migrate `/data/labor/workers`

### **Phase 4: Pages - Sales**
- [ ] Migrate `/data/sales/daily`
- [ ] Migrate `/data/sales/daily/waiters`
- [ ] Migrate `/data/sales/daily/tables`
- [ ] Migrate `/data/sales/daily/transactions`
- [ ] Migrate `/data/sales/daily/categories-products`

### **Phase 5: Cleanup**
- [ ] Remove dual-write (only new collections)
- [ ] Remove old resolvers (or mark deprecated)
- [ ] Update documentation
- [ ] Final testing

### **Phase 6: Remove Old Collections (Optional)**
- [ ] Backup old collections
- [ ] Verify no references
- [ ] Remove old collections

---

## 🎯 Recommended Approach

**For This Rebuild:**

1. **Single Feature Branch:** `rebuild/v2-collections-and-pages`
2. **Parallel Collections:** Create new alongside old
3. **Dual-Write:** Write to both during transition
4. **Incremental Pages:** Update one section at a time
5. **No Feature Flags:** Not needed if using dual-write
6. **Remove Old Later:** After 1-2 weeks of stable operation

**Why:**
- ✅ Safe (no data loss)
- ✅ Testable (can compare old vs new)
- ✅ Rollback-able (just revert code)
- ✅ Incremental (small, reviewable changes)

---

**Status:** Ready to Start  
**Next Step:** Create feature branch and begin Phase 1

