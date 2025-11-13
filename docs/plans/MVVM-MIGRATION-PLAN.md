# MVVM Migration Plan

## Overview
Migrate the entire application to MVVM (Model-View-ViewModel) architecture pattern, ensuring separation of concerns, improved maintainability, and optimized performance.

**Estimated Total Time**: 80-100 hours (10-12 working days)  
**Start Date**: 2025-11-10  
**Current Phase**: Phase 1 Complete ✅

---

## Architecture Principles

### MVVM Pattern Structure
```
Model Layer (src/models/)      → Type definitions, interfaces
Service Layer (src/lib/services/) → API/data fetching logic
ViewModel Layer (src/viewmodels/) → Business logic, state management
View Layer (src/app/)          → Pure UI components
```

### Optimization Requirements (MANDATORY)
Every MVVM rebuild MUST include:

1. **Performance Optimization**
   - ✅ Remove unnecessary re-renders (use `useMemo`, `useCallback`)
   - ✅ Optimize data fetching (React Query caching, stale time)
   - ✅ Code splitting (dynamic imports for heavy components)
   - ✅ Memoize expensive calculations
   - ✅ Debounce/throttle user inputs where appropriate

2. **Error Handling**
   - ✅ Safe fetch with content-type validation
   - ✅ Proper error boundaries
   - ✅ User-friendly error messages
   - ✅ Graceful degradation

3. **Code Quality**
   - ✅ TypeScript strict mode compliance
   - ✅ Remove unused code/imports
   - ✅ Consistent naming conventions
   - ✅ Proper JSDoc comments

4. **Bundle Size**
   - ✅ Tree-shake unused exports
   - ✅ Lazy load heavy dependencies
   - ✅ Optimize imports (avoid barrel imports where possible)

---

## Phase 1: Foundation & Infrastructure ✅ COMPLETE

### ✅ Task 1.1: Create Layout Components
**Status**: ✅ Complete  
**Files Created**:
- `src/app/(dashboard)/operations/layout.tsx`
- `src/app/(dashboard)/data/labor/layout.tsx`
- `src/app/(dashboard)/data/finance/layout.tsx`
- `src/app/(dashboard)/data/sales/layout.tsx`
- `src/app/(dashboard)/data/inventory/layout.tsx`
- `src/app/(dashboard)/settings/layout.tsx`

### ✅ Task 1.2: Document Shared Components
**Status**: ✅ Complete  
**File**: `docs/plans/SHARED-FILTER-COMPONENTS.md`

### ✅ Task 1.3: Create Service Layer Directories
**Status**: ✅ Complete  
**Directories Created**:
- `src/lib/services/daily-ops/`
- `src/lib/services/operations/`
- `src/lib/services/data/`
- `src/lib/services/settings/`

### ✅ Task 1.4: Fix Critical Fetch Errors
**Status**: ✅ Complete  
**Files Fixed**:
- `src/app/(dashboard)/daily-ops/finance/page.tsx` - Added safe JSON parsing
- `src/app/(dashboard)/daily-ops/finance/dashboard/page.tsx` - Added safe JSON parsing
- `src/app/(dashboard)/daily-ops/finance/pnl-balance/page.tsx` - Added safe JSON parsing
- `src/lib/safe-fetch.ts` - Created safe fetch utility

---

## Phase 2: Daily Ops Section Migration

### Task 2.1: Daily Ops Finance Dashboard
**Priority**: 🔴 High  
**Estimated Time**: 6-8 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/daily-ops/finance.model.ts
src/lib/services/daily-ops/finance.service.ts
src/viewmodels/daily-ops/useFinanceViewModel.ts
```

**Files to Modify**:
```
src/app/(dashboard)/daily-ops/finance/page.tsx → View only
```

**Optimization Checklist**:
- [ ] Extract all business logic to ViewModel
- [ ] Use React Query with proper caching (staleTime: 5min)
- [ ] Memoize filter calculations
- [ ] Debounce filter inputs (300ms)
- [ ] Lazy load chart components
- [ ] Remove unnecessary re-renders
- [ ] Optimize data transformations
- [ ] Add loading states (skeleton UI)
- [ ] Add error boundaries
- [ ] Measure performance before/after

**Acceptance Criteria**:
- ✅ All logic in ViewModel
- ✅ View is pure presentational
- ✅ Performance improved (measure metrics)
- ✅ No console errors
- ✅ Proper error handling

---

### Task 2.2: Daily Ops Reports
**Priority**: 🟡 Medium  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/daily-ops/reports.model.ts
src/lib/services/daily-ops/reports.service.ts
src/viewmodels/daily-ops/useReportsViewModel.ts
```

**Optimization Checklist**:
- [ ] Same as Task 2.1
- [ ] Pagination optimization
- [ ] Virtual scrolling for large lists (if needed)

---

### Task 2.3: Daily Ops Labor
**Priority**: 🟡 Medium  
**Estimated Time**: 5-7 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/daily-ops/labor.model.ts
src/lib/services/daily-ops/labor.service.ts
src/viewmodels/daily-ops/useLaborViewModel.ts
```

**Optimization Checklist**:
- [ ] Same as Task 2.1
- [ ] Optimize date range calculations
- [ ] Cache location/team data

---

## Phase 3: Operations Section Migration

### Task 3.1: Operations Products
**Priority**: 🟡 Medium  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/operations/products.model.ts
src/lib/services/operations/products.service.ts
src/viewmodels/operations/useProductsViewModel.ts
```

**Optimization Checklist**:
- [ ] Same as Task 2.1
- [ ] Search optimization (debounce)
- [ ] Table virtualization if >100 rows

---

### Task 3.2: Operations Suppliers
**Priority**: 🟡 Medium  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/operations/suppliers.model.ts
src/lib/services/operations/suppliers.service.ts
src/viewmodels/operations/useSuppliersViewModel.ts
```

---

### Task 3.3: Operations Locations
**Priority**: 🟡 Medium  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/operations/locations.model.ts
src/lib/services/operations/locations.service.ts
src/viewmodels/operations/useLocationsViewModel.ts
```

---

### Task 3.4: Operations Teams
**Priority**: 🟡 Medium  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/operations/teams.model.ts
src/lib/services/operations/teams.service.ts
src/viewmodels/operations/useTeamsViewModel.ts
```

---

## Phase 4: Data Section Migration

### Task 4.1: Data Labor Section
**Priority**: 🔴 High  
**Estimated Time**: 8-10 hours  
**Status**: ⬜ Not Started

**Pages to Migrate**:
- `/data/labor/hours/page.tsx`
- `/data/labor/costs/page.tsx`
- `/data/labor/planning/page.tsx`
- `/data/labor/workers/page.tsx`
- `/data/labor/locations-teams/page.tsx`

**Files to Create**:
```
src/models/data/labor.model.ts
src/lib/services/data/labor.service.ts
src/viewmodels/data/useLaborViewModel.ts
```

**Optimization Checklist**:
- [ ] Consolidate shared filter logic
- [ ] Optimize date range queries
- [ ] Cache environment/location mappings
- [ ] Virtual scrolling for large tables
- [ ] Optimize aggregation calculations

---

### Task 4.2: Data Finance Section
**Priority**: 🔴 High  
**Estimated Time**: 8-10 hours  
**Status**: ⬜ Not Started

**Pages to Migrate**:
- `/data/finance/*` pages

**Files to Create**:
```
src/models/data/finance.model.ts
src/lib/services/data/finance.service.ts
src/viewmodels/data/useFinanceViewModel.ts
```

---

### Task 4.3: Data Sales Section
**Priority**: 🟡 Medium  
**Estimated Time**: 6-8 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/data/sales.model.ts
src/lib/services/data/sales.service.ts
src/viewmodels/data/useSalesViewModel.ts
```

---

### Task 4.4: Data Inventory Section
**Priority**: 🟡 Medium  
**Estimated Time**: 6-8 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/data/inventory.model.ts
src/lib/services/data/inventory.service.ts
src/viewmodels/data/useInventoryViewModel.ts
```

---

## Phase 5: Settings Section Migration

### Task 5.1: Settings Eitje API
**Priority**: 🟡 Medium  
**Estimated Time**: 6-8 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/settings/eitje-api.model.ts
src/lib/services/settings/eitje-api.service.ts
src/viewmodels/settings/useEitjeApiViewModel.ts
```

**Optimization Checklist**:
- [ ] Debounce API test calls
- [ ] Cache connection status
- [ ] Optimize credential validation

---

### Task 5.2: Settings Bork API
**Priority**: 🟡 Medium  
**Estimated Time**: 6-8 hours  
**Status**: ⬜ Not Started

**Files to Create**:
```
src/models/settings/bork-api.model.ts
src/lib/services/settings/bork-api.service.ts
src/viewmodels/settings/useBorkApiViewModel.ts
```

---

### Task 5.3: Other Settings Pages
**Priority**: 🟢 Low  
**Estimated Time**: 4-6 hours per page  
**Status**: ⬜ Not Started

---

## Phase 6: Finance Section Migration

### Task 6.1: Finance Data Eitje Data Pages
**Priority**: 🔴 High  
**Estimated Time**: 10-12 hours  
**Status**: ⬜ Not Started

**Pages to Migrate**:
- `/finance/data/eitje-data/workers-v2/page.tsx` (already has MVVM ✅)
- `/finance/data/eitje-data/locations-teams/page.tsx`
- `/finance/data/eitje-data/*` other pages

**Note**: `workers-v2` already follows MVVM pattern - use as reference!

---

## Standard MVVM Migration Checklist

### For Each Page Migration:

**1. Analysis Phase**
- [ ] Identify all data fetching logic
- [ ] Identify all business logic
- [ ] Identify all UI state vs business state
- [ ] Document current behavior
- [ ] Measure current performance (baseline)

**2. Model Layer**
- [ ] Create model file with TypeScript interfaces
- [ ] Define query parameter types
- [ ] Define response types
- [ ] Export all types

**3. Service Layer**
- [ ] Create service file
- [ ] Implement data fetching functions
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Add JSDoc comments
- [ ] Use safe-fetch utility

**4. ViewModel Layer**
- [ ] Create ViewModel hook
- [ ] Move all business logic here
- [ ] Use React Query for data fetching
- [ ] Manage UI state (filters, pagination)
- [ ] Memoize expensive calculations
- [ ] Debounce/throttle inputs
- [ ] Handle errors gracefully

**5. View Layer**
- [ ] Keep View pure presentational
- [ ] Remove all business logic
- [ ] Remove data fetching
- [ ] Use ViewModel hook
- [ ] Pass props to child components
- [ ] Add loading states
- [ ] Add error boundaries

**6. Optimization**
- [ ] Remove unnecessary re-renders
- [ ] Optimize React Query caching
- [ ] Lazy load heavy components
- [ ] Memoize calculations
- [ ] Debounce user inputs
- [ ] Measure performance (after)
- [ ] Compare before/after metrics

**7. Testing**
- [ ] Test all functionality
- [ ] Test error states
- [ ] Test loading states
- [ ] Test filters/pagination
- [ ] Performance test
- [ ] No console errors

**8. Cleanup**
- [ ] Remove unused code
- [ ] Remove unused imports
- [ ] Update documentation
- [ ] Run linter
- [ ] Fix all warnings

---

## Performance Metrics to Track

### Before Each Migration:
- [ ] Page load time
- [ ] Time to First Byte (TTFB)
- [ ] First Contentful Paint (FCP)
- [ ] JavaScript bundle size
- [ ] Number of API calls
- [ ] Console errors/warnings

### After Each Migration:
- [ ] Same metrics as above
- [ ] Compare improvements
- [ ] Document in migration notes

### Target Metrics:
- TTFB: < 500ms (target: 200-300ms)
- FCP: < 1s (target: 400-600ms)
- Bundle size: Reduce by 20-30%
- API calls: Minimize waterfalls
- Re-renders: Minimize unnecessary renders

---

## Reference Implementation

### Example: Workers V2 (Already MVVM)
**Location**: `src/app/(dashboard)/finance/data/eitje-data/workers-v2/page.tsx`

**Structure**:
- Model: `src/models/eitje-v2/workers-v2.model.ts`
- Service: `src/lib/services/eitje-v2/workers-v2.service.ts`
- ViewModel: `src/viewmodels/eitje-v2/useWorkersV2ViewModel.ts`
- View: `src/app/(dashboard)/finance/data/eitje-data/workers-v2/page.tsx`

**Use this as a template for all migrations!**

---

## Progress Tracking

**Overall Progress**: 95% (Phases 1-7 Complete)

**Phase 1**: ✅ 100% Complete  
**Phase 2**: ✅ 100% Complete (All Daily Ops pages migrated)  
**Phase 3**: ✅ 100% Complete (All Operations pages migrated)  
**Phase 4**: ✅ 100% Complete (All Data pages migrated)  
**Phase 5**: ✅ 100% Complete (All Settings pages migrated)  
**Phase 6**: ✅ 100% Complete (All Finance pages migrated)  
**Phase 7**: ✅ 100% Complete (View Data, Dashboard pages migrated)

---

## Notes

1. **Always optimize during migration** - Don't migrate then optimize later
2. **Measure before/after** - Track performance improvements
3. **Use Workers V2 as reference** - It's the gold standard
4. **Follow the checklist** - Don't skip optimization steps
5. **Test thoroughly** - Each migration must be stable before moving on
6. **Document changes** - Update this plan as you progress

---

## Phase 7: Remaining Pages Migration ✅ COMPLETE

### ✅ Task 7.1: View Data Pages
**Status**: ✅ Complete  
**Files Created**:
- `src/models/misc/view-data.model.ts`
- `src/lib/services/misc/view-data.service.ts`
- `src/viewmodels/misc/useViewDataViewModel.ts`

**Files Modified**:
- `src/app/(dashboard)/view-data/page.tsx` → View only

### ✅ Task 7.2: Dashboard Page
**Status**: ✅ Complete  
**Files Created**:
- `src/models/misc/dashboard.model.ts`
- `src/lib/services/misc/dashboard.service.ts`
- `src/viewmodels/misc/useDashboardViewModel.ts`

**Files Modified**:
- `src/app/(dashboard)/dashboard/page.tsx` → View only

### 📝 Note: Complex Pages for Future Migration
The following pages have complex logic and can be migrated later:
- `/roadmap` - Drag-and-drop, Supabase real-time subscriptions
- `/docs` - Markdown rendering, API calls, dynamic routing
- `/` (homepage) - Complex KPI calculations, multiple data sources
- `/design-systems` - Static documentation (no migration needed)

---

## Related Plans

- **Route Reorganization Plan**: See `docs/plans/ROUTE-REORGANIZATION-PLAN.md` for Workforce V2 route reorganization

---

## Last Updated
_Date: 2025-11-10_  
_By: MVVM Migration Plan_  
_Status: Phases 1-7 Complete (95% of app migrated to MVVM)_


