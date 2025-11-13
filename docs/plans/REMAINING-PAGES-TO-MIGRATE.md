# Remaining Pages to Migrate to MVVM

## Summary
**Total Pages Remaining**: ~43 pages  
**Status**: Complex pages with business logic that need full MVVM migration

---

## 🔴 High Priority - Complex Finance Pages

### Main Finance Pages
1. **`/finance/page.tsx`** - Finance Dashboard
   - Uses: `useState`, `useQuery`, `useRevenueData`, `useSalesIntelligence`
   - Complex: Multiple data sources, period selection, location filtering

2. **`/finance/pnl/page.tsx`** - P&L Analysis
   - Uses: `useState`, `useQuery`, `usePnLSummary`, `usePnLByCategory`
   - Complex: Multi-location selection, category filtering, comparison mode

3. **`/finance/sales/page.tsx`** - Sales Performance
   - Uses: `useState`, `useQuery`, `useSalesData`, `useSalesTimeSeries`, `useSalesByCategory`
   - Complex: Auto-refresh, category filtering, time series data

4. **`/finance/labor/page.tsx`** - Labor Analytics
   - Uses: `useState`, `useQuery`, Supabase client
   - Complex: Date range selection, location filtering, KPI calculations

5. **`/finance/pnl/balance/page.tsx`** - P&L Balance
   - Status: Needs check

6. **`/finance/daily-ops/page.tsx`** - Daily Ops Dashboard
   - Uses: `useState`, `useQuery`, `fetch`
   - Complex: Labor data aggregation, team grouping, KPI calculations

7. **`/finance/daily-ops/insights/page.tsx`** - Daily Ops Insights
   - Uses: `useState`, `useQuery`, `fetch`
   - Complex: Cross-correlation analysis, period comparison

---

## 🟡 Medium Priority - Finance Data Pages

### Finance Eitje Data Pages
8. **`/finance/data/eitje-data/hours/page.tsx`**
   - Uses: `useState`, `useQuery`, `fetch`
   - Complex: Date filtering, location filtering, pagination

9. **`/finance/data/eitje-data/workers/page.tsx`**
   - Uses: `useState`, `useQuery`
   - Complex: Worker data display

10. **`/finance/data/eitje-data/locations-teams/page.tsx`**
    - Uses: `useState`, `useQuery`, Supabase client
    - Complex: Tabs (locations/teams), pagination, column toggles

11. **`/finance/data/eitje-data/finance/page.tsx`**
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: Date filtering, location filtering, pagination

12. **`/finance/data/eitje-data/labor-costs/page.tsx`**
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: Date filtering, location filtering, pagination

13. **`/finance/data/eitje-data/planning-shifts/page.tsx`**
    - Status: Needs check

14. **`/finance/data/eitje-data/data-imported/page.tsx`**
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: Date filtering, location filtering, pagination, network error handling

---

## 🟡 Medium Priority - Finance View Data Pages

15. **`/finance/view-data/sales/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Sales data display

16. **`/finance/view-data/labor-costs/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Labor costs display

---

## 🟡 Medium Priority - Finance API/Import Pages

17. **`/finance/eitje-api/page.tsx`**
    - Status: Needs check

18. **`/finance/bork-api/page.tsx`**
    - Uses: `useState`, `useQuery`, complex state management
    - Complex: Connection testing, sync management, validation

19. **`/finance/real-sync/page.tsx`**
    - Status: Needs check

20. **`/finance/imports/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Import management

21. **`/finance/simple-import/page.tsx`**
    - Status: Needs check

---

## 🟡 Medium Priority - Data Section Pages

### Data Labor Pages
22. **`/data/labor/hours/page.tsx`**
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: Date filtering, location filtering, pagination

23. **`/data/labor/costs/page.tsx`**
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: Date filtering, location filtering, pagination

24. **`/data/labor/workers/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Worker data display

25. **`/data/labor/locations-teams/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Locations/teams display

26. **`/data/labor/planning/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Planning data display

### Data Finance Pages
27. **`/data/finance/pnl-balance/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: P&L balance display

28. **`/data/finance/data-view/page.tsx`**
    - Status: Needs check

### Data Sales Pages
29. **`/data/sales/bork/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Sales data display

30. **`/data/sales/data-view/page.tsx`**
    - Status: Needs check

### Data Reservations Pages
31. **`/data/reservations/data-view/page.tsx`**
    - Status: Needs check

### Data Inventory Pages
32. **`/data/inventory/data-view/page.tsx`**
    - Status: Needs check

---

## 🟡 Medium Priority - View Data Pages

33. **`/view-data/eitje-data/hours/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Hours data display

34. **`/view-data/eitje-data/finance/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Finance data display

35. **`/view-data/eitje-data/workers/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Workers data display

36. **`/view-data/eitje-data/locations-teams/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Locations/teams display

37. **`/view-data/eitje-data/page.tsx`**
    - Status: Needs check

---

## 🟢 Low Priority - Settings Pages

38. **`/settings/eitje-api/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: API connection management

39. **`/settings/eitje-api/eitje-api/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: API connection management (duplicate?)

40. **`/settings/bork-api/page.tsx`**
    - Uses: `useState`, `useQuery`, complex state management
    - Complex: Connection testing, sync management, validation

41. **`/settings/bork-api/bork-api/page.tsx`**
    - Uses: `useState`, `useQuery`, complex state management
    - Complex: Connection testing, sync management, validation (duplicate?)

42. **`/settings/connections/data-import/page.tsx`**
    - Uses: `useState`, `useQuery`
    - Complex: Data import management

---

## 🟢 Low Priority - Special Pages

43. **`/roadmap/page.tsx`** - Product Roadmap
    - Uses: `useState`, `useEffect`, Supabase client, drag-and-drop
    - Complex: Real-time subscriptions, drag-and-drop, complex state management
    - Note: Very complex, can be migrated later

44. **`/docs/page.tsx`** - Documentation
    - Uses: `useState`, `useEffect`, `fetch`, markdown rendering
    - Complex: Dynamic routing, markdown parsing, API calls
    - Note: Can be migrated later

45. **`/` (homepage)`** - Homepage/Dashboard
    - Uses: `useState`, `useQuery`, `fetch`
    - Complex: KPI calculations, multiple data sources, date filtering
    - Note: Main landing page, should be migrated

46. **`/design-systems/page.tsx`** - Design Systems
    - Status: Static documentation page
    - Note: No migration needed (static content)

---

## Migration Priority Recommendations

### Phase 8: Critical Finance Pages (High Priority)
- `/finance/page.tsx`
- `/finance/pnl/page.tsx`
- `/finance/sales/page.tsx`
- `/finance/labor/page.tsx`
- `/finance/daily-ops/page.tsx`
- `/finance/daily-ops/insights/page.tsx`

### Phase 9: Finance Data Pages (Medium Priority)
- All `/finance/data/eitje-data/*` pages
- All `/finance/view-data/*` pages

### Phase 10: Data Section Pages (Medium Priority)
- All `/data/labor/*` pages
- All `/data/finance/*` pages
- All `/data/sales/*` pages
- All `/data/reservations/*` pages
- All `/data/inventory/*` pages

### Phase 11: View Data Pages (Medium Priority)
- All `/view-data/eitje-data/*` pages

### Phase 12: Settings & API Pages (Low Priority)
- All `/settings/*` pages
- All `/finance/*-api/*` pages

### Phase 13: Special Pages (Low Priority)
- `/` (homepage)
- `/roadmap` (very complex, can wait)
- `/docs` (can wait)

---

## Notes

1. **Pages Already Migrated**: 27 pages have ViewModel structure
2. **Pages Needing Migration**: ~43 pages identified
3. **Complex Pages**: Roadmap, Docs, and some API pages are very complex and can be migrated later
4. **Static Pages**: Design Systems doesn't need migration

---

## Estimated Effort

- **High Priority Pages**: ~30-40 hours
- **Medium Priority Pages**: ~40-50 hours
- **Low Priority Pages**: ~20-30 hours
- **Total Remaining**: ~90-120 hours

---

**Last Updated**: 2025-11-10  
**Status**: Comprehensive list of remaining pages compiled



