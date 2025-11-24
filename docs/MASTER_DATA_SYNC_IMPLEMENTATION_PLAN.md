# Master Data Sync UI Implementation Plan

## 🎯 User Requirements

1. ✅ Remove "products" from Daily and Historical Data cron (not active)
2. ✅ Add new "Master Sync Data" tab between Historical and Backward Sync
3. ✅ Add all missing endpoints to Master Sync including "products"
4. ✅ Create new cron job for Master Data sync
5. ✅ Add buttons: Start, Save, Test, Run Now
6. ✅ Show/capture last run information

---

## 📋 Implementation Tasks

### Task 1: Update Cron Route (/src/app/api/bork/v2/cron/route.ts)
**Purpose**: Handle master-data cron job type

**Changes**:
- Map `master-data` UI job type to `bork-master-data` cron manager type
- Add support for master data endpoints in config
- Return master data cron status
- Handle master data sync actions (start, stop, run)

**Time**: 1-2 hours

---

### Task 2: Update Settings Page UI (/src/app/(dashboard)/settings/bork-api/page.tsx)

#### 2A: Remove "products" from Daily & Historical
**Current state**: `{ sales: true, products: false }`
**New state**: `{ sales: true }` (products removed)
**Lines to modify**: 
- Line 65-68 (Daily endpoints)
- Line 78-81 (Historical endpoints)
- Remove product endpoint checkboxes from UI

#### 2B: Add State for Master Data Sync
**New state variables**:
```typescript
const [isMasterDataCronjobActive, setIsMasterDataCronjobActive] = useState(false);
const [enabledMasterDataEndpoints, setEnabledMasterDataEndpoints] = useState({
  product_groups: true,
  payment_methods: true,
  cost_centers: true,
  users: true,
});
const [masterDataSyncInterval, setMasterDataSyncInterval] = useState(86400); // 24h default
const [lastRunMasterData, setLastRunMasterData] = useState<Date | null>(null);
```

#### 2C: Add useEffect to Load Master Data Cron Status
**Similar to daily/historical loading**:
- Fetch `/api/bork/v2/cron?jobType=master-data`
- Parse response and populate state
- Capture lastRun timestamp

#### 2D: Add Handlers for Master Data Cron
**New functions**:
- `handleSaveMasterDataConfig()` - Save master data sync config
- `handleTestMasterDataSync()` - Test master data endpoints
- `handleRunMasterDataNow()` - Trigger immediate sync
- `handleToggleMasterDataCronjob()` - Toggle active/inactive

#### 2E: Add Master Data Tab UI
**Location**: Between "Historical Data Cron" and "Backward Sync" tabs
**Content**:
- Enabled endpoints checkboxes (product_groups, payment_methods, cost_centers, users)
- Sync interval setting (daily/weekly/monthly)
- Active toggle
- Buttons: Save, Test, Run Now, Start, Stop
- Last run timestamp display
- Status indicator

**Time**: 3-4 hours

---

### Task 3: Update Cron Manager (/src/lib/cron/v2-cron-manager.ts)
**Purpose**: Support master-data job type

**Changes**:
- Add master-data to supported job types
- Implement master data sync logic
- Handle product_groups, payment_methods, cost_centers, users endpoints
- Store last run timestamp

**Time**: 2-3 hours

---

### Task 4: Create Master Data Sync Endpoint (/src/app/api/bork/v2/master-sync/route.ts)
**Purpose**: API endpoint for master data sync operations

**Functionality**:
- GET: Return master data sync status
- POST: Trigger master data sync from Bork API

**Implementation**:
- Fetch from Bork API endpoints
- Store in MongoDB collections
- Return results

**Time**: 3-4 hours

---

### Task 5: Create MongoDB Collections
**Collections to create**:
- `bork_product_groups`
- `bork_payment_methods`
- `bork_cost_centers`
- `bork_users`

**Time**: 1 hour

---

## 📊 Implementation Sequence

```
1. Task 1: Update Cron Route (1-2 hours)
   ↓
2. Task 3: Update Cron Manager (2-3 hours)
   ↓
3. Task 4: Create Master Sync Endpoint (3-4 hours)
   ↓
4. Task 5: Create Collections (1 hour)
   ↓
5. Task 2: Update Settings UI (3-4 hours)
   ↓
   Total: 10-16 hours
```

---

## 🔧 File Changes Summary

| File | Changes | Status |
|------|---------|--------|
| `/src/app/api/bork/v2/cron/route.ts` | Add master-data job type support | To Do |
| `/src/lib/cron/v2-cron-manager.ts` | Implement master data sync | To Do |
| `/src/app/api/bork/v2/master-sync/route.ts` | NEW: Master data sync endpoint | To Create |
| `/src/app/(dashboard)/settings/bork-api/page.tsx` | Add tab + remove products from daily/historical | To Do |
| MongoDB | Create 4 new collections | To Do |

---

## 📋 UI Components Needed

### Master Data Sync Tab Content

```
┌─────────────────────────────────────────────────────────┐
│ Master Sync Data                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Status: ○ Inactive  [Toggle Switch]                     │
│                                                          │
│ Enabled Endpoints:                                       │
│ ☑ Product Groups      (includes hierarchy)               │
│ ☑ Payment Methods                                        │
│ ☑ Cost Centers                                           │
│ ☑ Users/Employees                                        │
│                                                          │
│ Sync Interval: [Daily ▼]                                │
│                                                          │
│ Last Run: November 16, 2025 at 02:30 AM                │
│ Status: ✅ Success - Synced 450 records                 │
│                                                          │
│ [Save] [Test] [Run Now] [Start] [Stop]                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Expected Outcomes

After implementation:
1. ✅ "products" removed from daily/historical cron
2. ✅ New Master Sync Data tab visible and functional
3. ✅ All 4 master data endpoints available
4. ✅ Cron job runs master data sync
5. ✅ Last run timestamp captured and displayed
6. ✅ Full button suite (Save, Test, Run Now, Start, Stop)
7. ✅ Status indicator shows sync results

---

## 🚀 Ready to Implement

All planning complete. Ready to start with Task 1.

Confirm to proceed? 
- Start with Cron Route updates
- Then update Cron Manager
- Then create Master Sync endpoint
- Then create MongoDB collections
- Finally update UI





