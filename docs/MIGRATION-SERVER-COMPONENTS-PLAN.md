# Next.js Server Components + Service Layer Migration Plan

## Overview
Migrate all client-side data fetching pages to Next.js Server Components with a dedicated Service Layer architecture. This will improve performance, reduce bundle sizes, eliminate request waterfalls, and improve SEO.

**Estimated Total Time**: 57-76 hours (8-10 working days)  
**Start Date**: TBD  
**Target Completion**: TBD

## Current State Analysis

### Pages Requiring Migration (12 total)
1. ✅ `/finance/sales/page.tsx` - Sales dashboard (714 lines)
2. ✅ `/finance/pnl/page.tsx` - P&L dashboard
3. ✅ `/finance/pnl/balance/page.tsx` - P&L balance (1243 lines)
4. ✅ `/finance/data/eitje-data/finance/page.tsx` - Eitje finance
5. ✅ `/finance/data/eitje-data/hours/page.tsx` - Eitje hours
6. ✅ `/finance/data/eitje-data/labor-costs/page.tsx` - Labor costs
7. ✅ `/finance/data/eitje-data/data-imported/page.tsx` - Data imported (731 lines)
8. ✅ `/finance/data/eitje-data/workers/page.tsx` - Workers
9. ✅ `/finance/data/eitje-data/locations-teams/page.tsx` - Locations & teams
10. ✅ `/finance/labor/page.tsx` - Labor dashboard
11. ✅ `/finance/daily-ops/page.tsx` - Daily ops dashboard
12. ✅ `/view-data/eitje-data/*` - View data pages

### Existing Service Layer (Good Foundation)
- ✅ `lib/eitje/aggregation-service.ts` - Already exists
- ✅ `lib/finance/pnl-calculations.ts` - Already exists
- ✅ `lib/bork/aggregation-service.ts` - Already exists

---

## Phase 1: Foundation & Setup

### Task 1.1: Create Service Layer Structure
**Priority**: 🔴 High  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/
├── sales.service.ts           # Sales data service
├── pnl.service.ts             # P&L data service
├── eitje.service.ts           # Eitje data service
├── labor.service.ts           # Labor data service
├── locations.service.ts       # Locations service (shared)
└── types/
    ├── sales.types.ts
    ├── pnl.types.ts
    ├── eitje.types.ts
    └── common.types.ts
```

**Checklist:**
- [ ] Create `src/lib/services/` directory
- [ ] Create `locations.service.ts` (extract locations fetching logic)
- [ ] Create `sales.service.ts` (extract sales data logic)
- [ ] Create shared types directory
- [ ] Add error handling utilities
- [ ] Add caching utilities

**Acceptance Criteria:**
- Service layer directory structure created
- TypeScript types defined
- Basic error handling in place

---

### Task 1.2: Create Shared Utilities
**Priority**: 🔴 High  
**Estimated Time**: 1 hour  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/utils/
├── query-builder.ts           # Supabase query builder helpers
├── filter-utils.ts            # Filter transformation utilities
├── pagination-utils.ts         # Pagination helpers
└── error-handler.ts           # Standardized error handling
```

**Checklist:**
- [ ] Create query builder utilities
- [ ] Create filter transformation functions
- [ ] Create pagination helpers
- [ ] Create error handler with standardized error types

**Acceptance Criteria:**
- Utility functions are reusable
- Type-safe implementations
- Well-documented

---

## Phase 2: Migrate High-Priority Pages

### Task 2.1: Migrate Sales Page (PILOT)
**Priority**: 🔴 High  
**Estimated Time**: 4-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1, Task 1.2

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/sales/
├── page.tsx                   # Convert to Server Component
├── sales-client.tsx           # New - Client component for UI
├── loading.tsx                # New - Loading state
└── error.tsx                  # New - Error boundary
```

**Checklist:**
- [ ] Create `SalesService.fetchSalesData()` method
- [ ] Create `SalesService.fetchLocations()` method
- [ ] Convert `page.tsx` to Server Component (remove "use client")
- [ ] Extract UI logic to `sales-client.tsx`
- [ ] Create `loading.tsx` with Suspense boundary
- [ ] Create `error.tsx` for error boundaries
- [ ] Test data fetching on server
- [ ] Test client-side filtering/interactivity
- [ ] Performance testing (measure before/after)

**Acceptance Criteria:**
- ✅ Page loads faster (TTFB < 500ms)
- ✅ No client-side data fetching on initial load
- ✅ All filters still work
- ✅ No breaking changes to UI
- ✅ Performance metrics documented

**Performance Metrics to Track:**
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- JavaScript bundle size
- Number of client-side requests

---

### Task 2.2: Migrate Locations Service (Shared)
**Priority**: 🔴 High  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started

**Files to Create:**
```
src/lib/services/locations.service.ts
```

**Checklist:**
- [ ] Extract locations fetching from all pages
- [ ] Create `LocationsService.fetchAll()` method
- [ ] Create `LocationsService.fetchById()` method
- [ ] Add caching (10 min stale time)
- [ ] Update all pages to use service

**Acceptance Criteria:**
- Single source of truth for locations
- All pages use the service
- Caching implemented

---

## Phase 3: Migrate Eitje Data Pages

### Task 3.1: Create Eitje Service
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create/Modify:**
```
src/lib/services/eitje.service.ts
```

**Checklist:**
- [ ] Create `EitjeService.fetchFinanceData()` method
- [ ] Create `EitjeService.fetchHoursData()` method
- [ ] Create `EitjeService.fetchLaborCosts()` method
- [ ] Create `EitjeService.fetchRawData()` method
- [ ] Create `EitjeService.fetchWorkers()` method
- [ ] Create `EitjeService.fetchLocationsTeams()` method
- [ ] Integrate with existing `aggregation-service.ts`

**Acceptance Criteria:**
- All Eitje data fetching methods implemented
- Integrated with existing aggregation service
- Type-safe

---

### Task 3.2: Migrate Eitje Finance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/data/eitje-data/finance/
├── page.tsx                   # Server Component
├── finance-client.tsx         # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination
- [ ] Test filters (date, location)

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 3.3: Migrate Eitje Hours Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.4: Migrate Eitje Labor Costs Page
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test functionality

---

### Task 3.5: Migrate Eitje Data Imported Page
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test pagination (50 items per page)
- [ ] Test error handling

---

### Task 3.6: Migrate Eitje Workers Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 3.7: Migrate Eitje Locations-Teams Page
**Priority**: 🟢 Low  
**Estimated Time**: 1-2 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 3.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

## Phase 4: Migrate P&L Pages

### Task 4.1: Create P&L Service
**Priority**: 🔴 High  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 1.1

**Files to Create:**
```
src/lib/services/pnl.service.ts
```

**Checklist:**
- [ ] Create `PnLService.fetchSummaryData()` method
- [ ] Create `PnLService.fetchTimeSeries()` method
- [ ] Create `PnLService.fetchByCategory()` method
- [ ] Integrate with existing `pnl-calculations.ts`
- [ ] Add filtering logic

**Acceptance Criteria:**
- All P&L data fetching methods implemented
- Integrated with existing calculations
- Type-safe

---

### Task 4.2: Migrate P&L Page
**Priority**: 🔴 High  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Files to Modify/Create:**
```
src/app/(dashboard)/finance/pnl/
├── page.tsx                   # Server Component
├── pnl-client.tsx             # Client Component
├── loading.tsx
└── error.tsx
```

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test KPI cards
- [ ] Test charts
- [ ] Test comparison mode

**Acceptance Criteria:**
- Server-side data fetching
- All functionality preserved
- Performance improved

---

### Task 4.3: Migrate P&L Balance Page
**Priority**: 🟡 Medium  
**Estimated Time**: 5-6 hours  
**Status**: ⬜ Not Started  
**Dependencies**: Task 4.1

**Checklist:**
- [ ] Convert to Server Component
- [ ] Extract UI to client component
- [ ] Test complex calculations
- [ ] Test filters

---

## Phase 5: Migrate Remaining Pages

### Task 5.1: Migrate Labor Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `LaborService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.2: Migrate Daily Ops Dashboard
**Priority**: 🟡 Medium  
**Estimated Time**: 4-5 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Create `DailyOpsService`
- [ ] Convert to Server Component
- [ ] Extract UI to client component

---

### Task 5.3: Migrate View Data Pages
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours per page  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Migrate `/view-data/eitje-data/*` pages
- [ ] Reuse Eitje service

---

## Phase 6: Optimization & Cleanup

### Task 6.1: Remove Deprecated Hooks
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Files to Potentially Remove:**
- `hooks/useSalesData.ts` (if fully migrated)
- `hooks/usePnLSummary.ts` (if fully migrated)
- Other data-fetching hooks

**Checklist:**
- [ ] Audit all hooks
- [ ] Identify deprecated hooks
- [ ] Remove or mark as deprecated
- [ ] Update documentation

---

### Task 6.2: Add Caching Strategy
**Priority**: 🟡 Medium  
**Estimated Time**: 3-4 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Implement Next.js revalidation
- [ ] Add cache tags
- [ ] Configure stale time per data type
- [ ] Add cache invalidation on mutations

---

### Task 6.3: Performance Optimization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Measure page load times
- [ ] Optimize database queries
- [ ] Add streaming where appropriate
- [ ] Optimize bundle sizes

---

### Task 6.4: Error Handling Standardization
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Standardize error types
- [ ] Create error boundaries
- [ ] Add error logging
- [ ] User-friendly error messages

---

### Task 6.5: Documentation
**Priority**: 🟢 Low  
**Estimated Time**: 2-3 hours  
**Status**: ⬜ Not Started

**Checklist:**
- [ ] Document service layer patterns
- [ ] Create migration guide
- [ ] Update README
- [ ] Add code examples

---

## Implementation Checklist Template

### For Each Page Migration:

**Analysis:**
- [ ] Identify all data fetching logic
- [ ] Identify all UI state
- [ ] Identify filter logic
- [ ] Document current behavior

**Service Creation:**
- [ ] Create service methods
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Add JSDoc comments

**Server Component:**
- [ ] Remove "use client" directive
- [ ] Fetch data server-side
- [ ] Handle searchParams
- [ ] Add loading.tsx
- [ ] Add error.tsx

**Client Component:**
- [ ] Extract UI logic
- [ ] Keep only interactive state
- [ ] Use React Query for client-side updates only
- [ ] Test all interactions

**Testing:**
- [ ] Test initial load
- [ ] Test filters
- [ ] Test pagination
- [ ] Test error states
- [ ] Performance test

**Cleanup:**
- [ ] Remove unused code
- [ ] Update imports
- [ ] Remove deprecated hooks if applicable

---

## Priority Order (Sprint Planning)

### Sprint 1 (Week 1-2):
1. ✅ Task 1.1: Service layer structure
2. ✅ Task 1.2: Shared utilities
3. ✅ Task 2.1: Sales page (pilot)
4. ✅ Task 2.2: Locations service

### Sprint 2 (Week 3-4):
5. ✅ Task 3.1: Eitje service
6. ✅ Task 3.2: Eitje finance page
7. ✅ Task 3.3: Eitje hours page
8. ✅ Task 3.4: Eitje labor costs page

### Sprint 3 (Week 5-6):
9. ✅ Task 4.1: P&L service
10. ✅ Task 4.2: P&L page
11. ✅ Task 3.5: Eitje data imported page

### Sprint 4 (Week 7-8):
12. ✅ Task 4.3: P&L balance page
13. ✅ Task 5.1: Labor dashboard
14. ✅ Task 5.2: Daily Ops dashboard

### Sprint 5 (Week 9-10):
15. ✅ Task 3.6: Eitje workers page
16. ✅ Task 3.7: Eitje locations-teams page
17. ✅ Task 5.3: View Data pages
18. ✅ Task 6.1-6.5: Optimization & cleanup

---

## Success Metrics

### Performance:
- [ ] Time to First Byte (TTFB) < 500ms (target: 200-300ms)
- [ ] First Contentful Paint (FCP) < 1s (target: 400-600ms)
- [ ] JavaScript bundle size reduction: 30-50%
- [ ] Eliminate request waterfalls (parallel server fetching)

### Code Quality:
- [ ] All data fetching in service layer
- [ ] All pages use Server Components for initial load
- [ ] TypeScript coverage: 100%
- [ ] No "use client" in page components

### Developer Experience:
- [ ] Clear separation of concerns
- [ ] Reusable service methods
- [ ] Easier to test
- [ ] Better error handling

---

## Notes

1. **Start with Sales page as pilot** - Validate approach before scaling
2. **Keep old pages working** - Gradual migration, no breaking changes
3. **Test each migration thoroughly** - Don't move to next until current is stable
4. **Use feature flags if needed** - For gradual rollout
5. **Monitor performance metrics** - Before/after each migration

---

## Estimated Total Time

- Phase 1: 3-4 hours
- Phase 2: 6-8 hours
- Phase 3: 18-24 hours
- Phase 4: 12-15 hours
- Phase 5: 9-12 hours
- Phase 6: 9-13 hours

**Total: ~57-76 hours (8-10 working days)**

---

## Progress Tracking

**Overall Progress**: 0% (0/30 tasks completed)

**Phase 1**: 0% (0/2 tasks)  
**Phase 2**: 0% (0/2 tasks)  
**Phase 3**: 0% (0/7 tasks)  
**Phase 4**: 0% (0/3 tasks)  
**Phase 5**: 0% (0/3 tasks)  
**Phase 6**: 0% (0/5 tasks)

---

## Last Updated
_Date: 2025-01-03_  
_By: Migration Plan_


