# Keuken Analyses - Implementation Steps Plan

## 🎯 GOAL
Complete all 3 remaining tasks: Test aggregation, Add calculation transparency UI, Create cron hook

---

## 📋 STEP-BY-STEP PLAN

### **STEP 1: Test Aggregation** ✅
**Goal**: Verify aggregation service works and creates data in `keuken_analyses_aggregated`

**Actions**:
1. Create API endpoint: `/api/admin/keuken-analyses/aggregate`
   - Accepts: `startDate`, `endDate`, `locationId` (optional)
   - Calls: `aggregateKeukenAnalysesData()`
   - Returns: `{ success, aggregated, errors }`

2. Test with November 2025 data:
   - Start: 2025-11-01
   - End: 2025-11-30
   - Location: All locations (or first location)

3. Verify data created:
   - Query `keuken_analyses_aggregated` collection
   - Check record count matches expected days
   - Verify KPIs are calculated correctly

**Files to Create/Modify**:
- `src/app/api/admin/keuken-analyses/aggregate/route.ts` (NEW)

---

### **STEP 2: Add Calculation Transparency UI** ✅
**Goal**: Show formulas and data sources for each KPI

**Actions**:
1. Create `CalculationBreakdown` component:
   - Props: `kpi`, `data`, `formula`, `inputs`
   - Shows: Data source, formula, input values, calculation steps, result
   - Collapsible dropdown (default: collapsed)

2. Add calculator icon to each KPI card:
   - Icon: `Calculator` from lucide-react
   - On click: Show/hide breakdown dropdown

3. Define calculation formulas for each KPI:
   - **Products Produced**: `SUM(productProduction[].totalQuantity)`
   - **Total Workload Minutes**: `SUM(productProduction[].totalWorkloadMinutes)`
   - **Average Workload Per Hour**: `totalWorkloadMinutes / hoursWithData`
   - **Peak Hour**: `MAX(workloadByHour[].totalWorkloadMinutes).hour`
   - **Peak Time Range**: `MAX(workloadByRange[].totalWorkloadMinutes).timeRange`
   - **Average Workers Per Hour**: `SUM(workloadByHour[].activeWorkers) / hoursWithData`

4. Show data source for each:
   - Collection: `keuken_analyses_aggregated`
   - Query: Date range, location filter, time range filter, worker filter

**Files to Create/Modify**:
- `src/components/daily-ops/CalculationBreakdown.tsx` (NEW)
- `src/app/(dashboard)/daily-ops/keuken-analyses/KeukenAnalysesClient.tsx` (MODIFY)

---

### **STEP 3: Create Cron Hook** ✅
**Goal**: Auto-aggregate after data sync completes

**Actions**:
1. Create hook function: `aggregateKeukenAnalysesOnDataSync()`
   - Location: `src/lib/services/daily-ops/keuken-analyses-aggregation.service.ts`
   - Parameters: `locationId`, `dateRange` (from sync)
   - Logic: Call `aggregateKeukenAnalysesData()` for synced dates

2. Add hook to Bork sync endpoint:
   - File: `src/app/api/bork/v2/sync/route.ts`
   - After successful sync: Call aggregation hook
   - Date range: Use synced date range

3. Add hook to Eitje sync endpoint:
   - File: `src/app/api/eitje/v2/sync/route.ts` (or similar)
   - After successful sync: Call aggregation hook
   - Date range: Use synced date range

4. Handle errors gracefully:
   - Don't fail sync if aggregation fails
   - Log aggregation errors separately
   - Return success even if aggregation fails (non-blocking)

**Files to Create/Modify**:
- `src/lib/services/daily-ops/keuken-analyses-aggregation.service.ts` (ADD function)
- `src/app/api/bork/v2/sync/route.ts` (ADD hook call)
- `src/app/api/eitje/v2/sync/route.ts` (ADD hook call) - if exists

---

### **BONUS STEP 4: Handle All Locations** ✅
**Goal**: Support "all" locations in resolver

**Actions**:
1. Update GraphQL resolver:
   - If `locationId === 'all'`: Query all locations
   - Aggregate results across all locations
   - Return combined data

2. Update service:
   - Handle "all" locations properly
   - Query each location separately or use aggregation

**Files to Modify**:
- `src/lib/graphql/v2-resolvers.ts` (UPDATE keukenAnalyses resolver)
- `src/lib/services/daily-ops/keuken-analyses.service.ts` (UPDATE to handle all locations)

---

## 🚀 EXECUTION ORDER

1. **STEP 1**: Test aggregation (create endpoint, test, verify)
2. **STEP 2**: Add calculation transparency UI (create component, add to KPIs)
3. **STEP 3**: Create cron hook (add function, hook into sync endpoints)
4. **STEP 4**: Handle all locations (update resolver and service)

---

## ✅ SUCCESS CRITERIA

- [ ] Aggregation endpoint works and creates data
- [ ] Data appears in `keuken_analyses_aggregated` collection
- [ ] KPIs show calculation breakdowns on click
- [ ] Aggregation runs automatically after data sync
- [ ] "All locations" filter works correctly
- [ ] No errors in console
- [ ] Data displays correctly in UI


