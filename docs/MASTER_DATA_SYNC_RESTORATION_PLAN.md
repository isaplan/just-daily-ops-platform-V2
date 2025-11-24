# Master Data Sync Restoration Plan

## 📋 Overview

The **Master Data Sync** system existed in V1 but was NOT migrated to V2. This sync handles synchronizing master/catalog data from Bork API:
- Product Groups (Categories with hierarchy)
- Payment Methods
- Cost Centers  
- Users/Employees

**Currently Missing**: No master data sync runs, so we don't have the product hierarchy (parent categories)!

---

## 🔍 What Exists in V1

### 1. **API Endpoints (src-v1/app/api/bork/)**
- ✅ `master-sync/route.ts` - POST/GET endpoint for master data sync
  - Calls Supabase edge function `bork-sync-master-data`
  - Endpoints: `product_groups`, `payment_methods`, `cost_centers`, `users`
  - Database tables: `bork_product_groups`, `bork_payment_methods`, `bork_cost_centers`, `bork_users`

### 2. **UI Components (src-v1/components/)**
- ✅ `BorkMasterSync.tsx` - Master data sync UI component
  - Shows sync status and counts for each master data type
  - "Refresh Master Data" button
  - Displays last sync timestamps

- ✅ `MasterDataUpdateNotification.tsx` - Notification component
  - Detects unknown references in sales data
  - Prompts user to update master data

### 3. **Edge Function**
- ⚠️ `bork-sync-master-data` - NOT IN CURRENT REPO (Supabase function)
  - Calls Bork API for master data:
    - `/catalog/productgrouplist.json` - Product groups/categories
    - `/catalog/paymodegrouplist.json` - Payment methods
    - `/centers.json` - Cost centers
    - `/users.json` - Users/employees
  - Stores in PostgreSQL tables

### 4. **Bork API Documentation (docs/BORK_API_INTEGRATION.md)**
```
Additional Endpoints (Available but NOT Currently Used):
- /catalog/productgrouplist.json - Returns product groups/categories
- /catalog/paymodegrouplist.json - Returns payment methods
- /centers.json - Returns list of cost centers
- /users.json - Returns list of users/employees
```

---

## 🛠️ What Needs to Be Done

### Phase 1: Create V2 Master Data Sync Endpoint
**Goal**: Implement master data API endpoint for MongoDB

**Tasks**:
1. Create `/src/app/api/bork/v2/master-sync/route.ts`
   - GET: Check status of master data collections
   - POST: Trigger master data sync from Bork API
   - Handle all 4 endpoints: product_groups, payment_methods, cost_centers, users

2. Create MongoDB collections:
   - `bork_product_groups`
   - `bork_payment_methods`
   - `bork_cost_centers`
   - `bork_users`

3. Implement extraction logic:
   - Map Bork API responses to MongoDB schema
   - Handle product group hierarchy
   - Store raw API responses

**Estimated Work**: 4-6 hours

---

### Phase 2: Create Master Data Service
**Goal**: Provide service functions for fetching master data

**Tasks**:
1. Create `/src/lib/bork/v2-master-data-client.ts`
   - `fetchProductGroups(baseUrl, apiKey)` → Returns product groups with hierarchy
   - `fetchPaymentMethods(baseUrl, apiKey)` → Returns payment methods
   - `fetchCostCenters(baseUrl, apiKey)` → Returns cost centers
   - `fetchUsers(baseUrl, apiKey)` → Returns users

2. Create `/src/lib/services/bork/master-data.service.ts`
   - `saveMasterData(location, dataType, data)` → Store in MongoDB
   - `getMasterDataStatus()` → Get counts and last sync for each type
   - `getMasterDataByLocation(location)` → Retrieve from MongoDB

**Estimated Work**: 2-3 hours

---

### Phase 3: Integrate into Cron Job
**Goal**: Add master data sync to existing Bork cron system

**Tasks**:
1. Update `/src/app/api/bork/v2/cron/route.ts`
   - Add `master_data` to `enabledEndpoints`
   - Schedule master data sync (daily? weekly?)
   - Default: `{ sales: true, products: true, master_data: true }`

2. Create cron job handler:
   - Fetch credentials for each location
   - Call Bork API master endpoints
   - Store in MongoDB
   - Log results

**Estimated Work**: 2-3 hours

---

### Phase 4: Create Product Hierarchy Extraction
**Goal**: Extract parent/main category from product groups

**Tasks**:
1. Update `/src/app/api/bork/v2/categories-products/aggregate/route.ts`
   - Query `bork_product_groups` for product hierarchy
   - Map `product.parentGroupId` → Main Category
   - Map `product.groupId` → Category
   - Map `product.name` → Product

2. Update category extraction logic:
   - Use `bork_product_groups` as source of truth
   - Fallback to sales data extraction if not found
   - Build proper Main Category → Category → Product hierarchy

**Estimated Work**: 2-3 hours

---

### Phase 5: UI Components (V2)
**Goal**: Create master data sync UI for new system

**Tasks**:
1. Create `/src/components/settings/BorkMasterDataSync.tsx`
   - Migrate from V1 component
   - Show status of all 4 master data types
   - "Refresh Master Data" button
   - Display last sync timestamps

2. Create notification component
   - Detect unknown references
   - Prompt user to sync master data

**Estimated Work**: 2-3 hours

---

## 📊 Implementation Sequence

```
Priority 1: Phase 1 (Endpoint) + Phase 2 (Service)
  ↓ (4-9 hours)
Priority 2: Phase 3 (Cron Integration)
  ↓ (2-3 hours)
Priority 3: Phase 4 (Hierarchy Extraction)
  ↓ (2-3 hours)
Priority 4: Phase 5 (UI)
  ↓ (2-3 hours)

Total Estimated: 12-18 hours
```

---

## 🎯 Expected Outcomes

After restoration:

✅ **Master data synced automatically** (via cron or manual trigger)
✅ **Product hierarchy available** (Main Category → Category → Product)
✅ **Unknown references eliminated** (products linked to master data)
✅ **Bork API fully utilized** (all 5 endpoints: sales + 4 master data)
✅ **Settings page working** (master data management UI)

---

## 🔗 Related Documentation

- `docs/BORK_API_INTEGRATION.md` - API endpoints and integration guide
- `docs/BORK_API_DOCUMENTATION.md` - API specification
- `src-v1/app/api/bork/master-sync/route.ts` - V1 implementation reference
- `src-v1/components/finance/BorkMasterSync.tsx` - V1 UI reference

---

## ⚠️ Critical Notes

1. **Edge Function Missing**: The Supabase edge function `bork-sync-master-data` doesn't exist in current repo
   - May need to recreate or adapt for MongoDB
   - Alternative: Implement directly in Next.js API route

2. **Cron Integration**: Need to wire master data sync into existing Bork cron system
   - Currently: Only `sales` endpoint enabled
   - Needed: Enable `products` (master data) endpoint

3. **Database Schema**: Need to define MongoDB collection schema for:
   - Product group hierarchy
   - Payment methods
   - Cost centers
   - Users

4. **Hierarchy Detection**: After sync, need to update categories-products aggregation to use master data for parent categories

---

## 📅 Recommendation

**Start with Phase 1 + 2** to get the API and service layer working.
Then integrate into cron (**Phase 3**) to automate sync.
Finally, update aggregation logic (**Phase 4**) to use hierarchy.
UI (**Phase 5**) can be done last or integrated incrementally.





