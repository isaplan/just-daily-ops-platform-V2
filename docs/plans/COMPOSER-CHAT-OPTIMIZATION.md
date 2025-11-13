# Composer + Chat/Claude Optimization Plan

**Goal**: Optimize Chat/Claude-migrated ViewModels to adopt Composer's concise patterns while preserving Chat/Claude's robust error handling.

**Status**: Planning Phase  
**Created**: 2025-01-27

---

## 🎯 Optimization Strategy

### ✅ **KEEP from Chat/Claude:**
- Network error detection (`isNetworkError`)
- Exponential backoff retry logic
- Detailed retry configuration for network errors
- Edge case handling
- Validation thoroughness

### ✨ **ADOPT from Composer:**
- More concise code (29-68% fewer lines)
- Simplified query configurations where appropriate
- Better code density
- Cleaner state management
- Reduced verbosity

---

## 📋 Target ViewModels for Optimization

### 1. **useEitjeDataImportedViewModel.ts** (Chat/Claude)
**Current**: 231 lines  
**Target**: ~150-170 lines (26-35% reduction)  
**Priority**: High

**Optimizations**:
- Simplify retry logic (keep network error detection, reduce verbosity)
- Consolidate query configurations
- Extract common retry config to shared utility
- Simplify date range logic

**Keep**:
- `isNetworkError` detection
- Exponential backoff retry
- Network-specific retry logic

---

### 2. **useBorkApiViewModel.ts** (Chat/Claude)
**Current**: 717 lines  
**Target**: ~500-550 lines (23-30% reduction)  
**Priority**: Critical (monolithic)

**Optimizations**:
- Extract feature-based ViewModels (connection-test, manual-sync, etc.)
- Consolidate state management
- Simplify mutation handlers
- Extract common patterns

**Keep**:
- All error handling
- Connection status tracking
- Validation logic

---

### 3. **useEitjeApiViewModel.ts** (Chat/Claude)
**Current**: 271 lines  
**Target**: ~180-200 lines (26-34% reduction)  
**Priority**: High

**Optimizations**:
- Simplify progress loading logic
- Consolidate state management
- Extract common query patterns
- Simplify month processing logic

**Keep**:
- Progress tracking
- Month sync logic
- Error handling

---

### 4. **usePnLViewModel.ts** (Chat/Claude)
**Current**: 265 lines  
**Target**: ~180-200 lines (25-32% reduction)  
**Priority**: Medium

**Optimizations**:
- Simplify date range calculations
- Consolidate query configurations
- Extract common patterns

**Keep**:
- All calculation logic
- Error handling

---

## 🔧 Implementation Approach

### Phase 1: Create Shared Utilities
1. **Create retry utility** (`src/lib/utils/react-query-retry.ts`)
   - Shared exponential backoff config
   - Network error detection wrapper
   - Reusable retry patterns

### Phase 2: Optimize Individual ViewModels
1. Start with `useEitjeDataImportedViewModel.ts` (simplest)
2. Then `useEitjeApiViewModel.ts`
3. Then `usePnLViewModel.ts`
4. Finally `useBorkApiViewModel.ts` (most complex, may need splitting)

### Phase 3: Refactor Bork API (Feature-Based)
- Split into:
  - `useConnectionTestViewModel.ts`
  - `useManualSyncViewModel.ts`
  - `useRawDataProcessingViewModel.ts`
  - `useDataValidationViewModel.ts`

---

## 📊 Success Metrics

- **Code reduction**: 25-35% fewer lines per ViewModel
- **Maintainability**: Easier to understand and modify
- **Functionality**: No loss of features or error handling
- **Performance**: Same or better performance
- **Error handling**: All Chat/Claude error handling preserved

---

## ✅ Checklist

- [ ] Create shared retry utility
- [ ] Optimize `useEitjeDataImportedViewModel.ts`
- [ ] Optimize `useEitjeApiViewModel.ts`
- [ ] Optimize `usePnLViewModel.ts`
- [ ] Refactor `useBorkApiViewModel.ts` (feature-based split)
- [ ] Test all optimizations
- [ ] Update documentation

---

## 🔍 Comparison Examples

### Before (Chat/Claude - Verbose):
```typescript
const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
  queryKey: ["eitje-imported-locations"],
  queryFn: fetchLocations,
  staleTime: 10 * 60 * 1000, // 10 minutes
  retry: (failureCount, error) => {
    // Retry more for network errors
    if (isNetworkError(error)) {
      return failureCount < 3;
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
  },
});
```

### After (Optimized - Concise but Robust):
```typescript
const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
  queryKey: ["eitje-imported-locations"],
  queryFn: fetchLocations,
  staleTime: 10 * 60 * 1000,
  ...getNetworkRetryConfig(), // Shared utility with network error detection
});
```

---

**Next Steps**: Start with Phase 1 - Create shared utilities, then optimize ViewModels one by one.

