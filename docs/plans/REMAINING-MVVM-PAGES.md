# Remaining Pages for MVVM Migration

**Last Updated**: 2025-01-XX  
**Status**: Pages identified that still need MVVM migration

---

## 🔴 High Priority - Complex Pages with Business Logic

### 1. `/data/finance/pnl-balance/page.tsx` ⚠️ **CURRENTLY OPEN**
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useEffect`, `useCallback`, `useMemo`
- **Complexity**: High - 1404 lines, complex P&L calculations
- **ViewModel**: ❌ None

### 2. `/settings/bork-api/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useEffect`, `useCallback`, complex state management
- **Complexity**: Very High - 2455+ lines, connection testing, sync management
- **ViewModel**: ✅ Exists (`useBorkApiViewModel.ts`) but **NOT USED** in page

### 3. `/finance/labor/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`
- **Complexity**: Medium - Labor analytics, KPI calculations
- **ViewModel**: ❌ None

### 4. `/finance/daily-ops/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`, `fetch`
- **Complexity**: High - Labor data aggregation, team grouping, KPI calculations
- **ViewModel**: ❌ None

### 5. `/finance/daily-ops/insights/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`, `fetch`
- **Complexity**: High - Cross-correlation analysis, period comparison
- **ViewModel**: ❌ None

---

## 🟡 Medium Priority - Finance Data Pages

### 6. `/finance/data/eitje-data/finance/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`, Supabase client
- **Complexity**: Medium - Date filtering, location filtering, pagination
- **ViewModel**: ❌ None

### 7. `/finance/data/eitje-data/data-imported/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`, `fetch`
- **Complexity**: Medium - Date filtering, location filtering, pagination, network error handling
- **ViewModel**: ❌ None

### 8. `/finance/view-data/sales/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`
- **Complexity**: Medium - Sales data display, pagination
- **ViewModel**: ❌ None

### 9. `/finance/view-data/labor-costs/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`
- **Complexity**: Medium - Labor costs display
- **ViewModel**: ❌ None

### 10. `/finance/bork-api/page.tsx`
- **Status**: ❌ Not migrated
- **Has**: `useState`, `useQuery`, complex state management
- **Complexity**: Very High - Connection testing, sync management, validation
- **ViewModel**: ❌ None

---

## 🟢 Lower Priority - Other Finance Pages

### 11. `/finance/data/eitje-data/hours/page.tsx`
- **Status**: ⚠️ Needs check
- **ViewModel**: ❌ Unknown

### 12. `/finance/data/eitje-data/workers/page.tsx`
- **Status**: ⚠️ Needs check
- **ViewModel**: ❌ Unknown

### 13. `/finance/data/eitje-data/locations-teams/page.tsx`
- **Status**: ⚠️ Needs check
- **ViewModel**: ❌ Unknown

### 14. `/finance/data/eitje-data/labor-costs/page.tsx`
- **Status**: ⚠️ Needs check
- **ViewModel**: ❌ Unknown

### 15. `/finance/data/eitje-data/planning-shifts/page.tsx`
- **Status**: ⚠️ Needs check
- **ViewModel**: ❌ Unknown

---

## ✅ Already Migrated Pages

- ✅ `/finance/page.tsx` - Finance Dashboard
- ✅ `/finance/sales/page.tsx` - Sales Performance
- ✅ `/finance/pnl/page.tsx` - P&L Analysis
- ✅ `/settings/eitje-api/page.tsx` - Eitje API Settings
- ✅ All Daily Ops pages (finance, reports, labor, inventory, AI)
- ✅ All Operations pages (products, suppliers, locations, teams)
- ✅ All Data section placeholder pages
- ✅ All Settings placeholder pages (company, themes, data-import)
- ✅ Dashboard and View Data Overview

---

## Migration Priority Recommendations

### **Immediate Priority** (User has open):
1. **`/data/finance/pnl-balance/page.tsx`** - Currently open, 1404 lines, complex

### **High Priority** (Complex pages):
2. **`/settings/bork-api/page.tsx`** - ViewModel exists but not used!
3. **`/finance/labor/page.tsx`** - Labor analytics
4. **`/finance/daily-ops/page.tsx`** - Daily Ops dashboard
5. **`/finance/daily-ops/insights/page.tsx`** - Insights page

### **Medium Priority** (Data pages):
6. `/finance/data/eitje-data/finance/page.tsx`
7. `/finance/data/eitje-data/data-imported/page.tsx`
8. `/finance/view-data/sales/page.tsx`
9. `/finance/view-data/labor-costs/page.tsx`
10. `/finance/bork-api/page.tsx`

---

## Notes

- **`/settings/bork-api/page.tsx`** has a ViewModel (`useBorkApiViewModel.ts`) but the page is NOT using it - this should be a quick fix!
- **`/data/finance/pnl-balance/page.tsx`** is the most complex remaining page (1404 lines)
- Most remaining pages are in the `/finance` directory
- Some pages may be placeholders and can be skipped

---

**Total Remaining**: ~15-20 pages (depending on which are placeholders)



