# Route Reorganization Plan - Workforce V2

## Overview
Reorganize Workforce V2 pages from `/finance/data/eitje-data/*-v2/` to `/data/workforce/*` to match the navigation structure and improve route clarity.

**Date**: 2025-11-10  
**Status**: ✅ Complete

---

## Current Structure (Incorrect)

### File Locations
```
src/app/(dashboard)/finance/data/eitje-data/
  ├── hours-v2/
  │   └── page.tsx          → Route: /finance/data/eitje-data/hours-v2
  └── workers-v2/
      └── page.tsx          → Route: /finance/data/eitje-data/workers-v2
```

### Sidebar Navigation
```typescript
// src/components/app-sidebar.tsx
const dataWorkforceV2Items: MenuItem[] = [
  { title: "Hours", url: "/finance/data/eitje-data/hours-v2", icon: Clock },
  { title: "Workers", url: "/finance/data/eitje-data/workers-v2", icon: UserCheck },
];
```

**Problem**: Sidebar shows "Workforce V2" under "Data" section, but routes point to `/finance/data/eitje-data/*-v2/`

---

## Desired Structure (Correct)

### File Locations
```
src/app/(dashboard)/data/workforce/
  ├── layout.tsx            → Layout for Workforce V2 section
  ├── page.tsx              → Overview page (optional)
  ├── hours/
  │   └── page.tsx          → Route: /data/workforce/hours
  └── workers/
      └── page.tsx          → Route: /data/workforce/workers
```

### Sidebar Navigation
```typescript
// src/components/app-sidebar.tsx
const dataWorkforceV2Items: MenuItem[] = [
  { title: "Hours", url: "/data/workforce/hours", icon: Clock },
  { title: "Workers", url: "/data/workforce/workers", icon: UserCheck },
];
```

**Benefit**: Routes match navigation structure - "Data > Workforce V2 > Hours/Workers"

---

## Files to Move

### 1. Hours V2 Page
**From**: `src/app/(dashboard)/finance/data/eitje-data/hours-v2/page.tsx`  
**To**: `src/app/(dashboard)/data/workforce/hours/page.tsx`

**Action**: Move file and update any internal route references

### 2. Workers V2 Page
**From**: `src/app/(dashboard)/finance/data/eitje-data/workers-v2/page.tsx`  
**To**: `src/app/(dashboard)/data/workforce/workers/page.tsx`

**Action**: Move file and update any internal route references

---

## Files to Create

### 3. Workforce Layout
**Create**: `src/app/(dashboard)/data/workforce/layout.tsx`

**Purpose**: Provide navigation and structure for Workforce V2 section

**Reference**: Similar to `src/app/(dashboard)/data/finance/layout.tsx` or `src/app/(dashboard)/data/labor/layout.tsx`

**Content**:
```typescript
"use client";

import { useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const workforceItems = [
  { title: "Hours", url: "/data/workforce/hours", icon: Clock },
  { title: "Workers", url: "/data/workforce/workers", icon: UserCheck },
];

// Memoized navigation button to prevent re-renders
const NavButton = memo(({ item, isActive }: { item: typeof workforceItems[0]; isActive: boolean }) => (
  <Link href={item.url}>
    <Button
      variant={isActive ? "default" : "outline"}
      className="flex items-center gap-2"
    >
      <item.icon className="h-4 w-4" />
      {item.title}
    </Button>
  </Link>
));
NavButton.displayName = "NavButton";

export default function WorkforceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Memoize active pathname check
  const activePathname = useMemo(() => pathname, [pathname]);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Parent Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Workforce V2</CardTitle>
          <CardDescription>View and manage workforce data (Hours and Workers)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {workforceItems.map((item) => (
              <NavButton
                key={item.url}
                item={item}
                isActive={activePathname === item.url}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Child Content */}
      {children}
    </div>
  );
}
```

### 4. Workforce Overview Page (Optional)
**Create**: `src/app/(dashboard)/data/workforce/page.tsx`

**Purpose**: Overview page for Workforce V2 section (similar to `/data/labor/page.tsx`)

**Content**: Simple overview with links to Hours and Workers pages

---

## Files to Update

### 5. Sidebar Navigation
**File**: `src/components/app-sidebar.tsx`

**Update**: `dataWorkforceV2Items` array

**From**:
```typescript
const dataWorkforceV2Items: MenuItem[] = [
  { title: "Hours", url: "/finance/data/eitje-data/hours-v2", icon: Clock },
  { title: "Workers", url: "/finance/data/eitje-data/workers-v2", icon: UserCheck },
];
```

**To**:
```typescript
const dataWorkforceV2Items: MenuItem[] = [
  { title: "Hours", url: "/data/workforce/hours", icon: Clock },
  { title: "Workers", url: "/data/workforce/workers", icon: UserCheck },
];
```

**Also Update**: Main `dataItems` array - update `url` for Workforce V2

**From**:
```typescript
{ 
  title: "Workforce V2", 
  url: "/data/labor-v2",  // ← Update this
  icon: Users, 
  isCollapsible: true, 
  children: dataWorkforceV2Items 
}
```

**To**:
```typescript
{ 
  title: "Workforce V2", 
  url: "/data/workforce",  // ← New route
  icon: Users, 
  isCollapsible: true, 
  children: dataWorkforceV2Items 
}
```

### 6. Check for Internal Route References
**Files to Check**:
- Any components that link to `/finance/data/eitje-data/hours-v2`
- Any components that link to `/finance/data/eitje-data/workers-v2`
- Any redirects or navigation logic

**Search Pattern**:
```bash
grep -r "finance/data/eitje-data/hours-v2" src/
grep -r "finance/data/eitje-data/workers-v2" src/
grep -r "hours-v2" src/
grep -r "workers-v2" src/
```

---

## Files That DON'T Need Changes

### ViewModels (Already Correct)
- `src/viewmodels/eitje-v2/useHoursV2ViewModel.ts` ✅
- `src/viewmodels/eitje-v2/useWorkersV2ViewModel.ts` ✅

### Models (Already Correct)
- `src/models/eitje-v2/hours-v2.model.ts` ✅
- `src/models/eitje-v2/workers-v2.model.ts` ✅

### Services (Already Correct)
- `src/lib/services/eitje-v2/hours-v2.service.ts` ✅
- `src/lib/services/eitje-v2/workers-v2.service.ts` ✅

**Reason**: These are already in the correct `eitje-v2` namespace and don't depend on route paths.

---

## Migration Steps

### Step 1: Create New Directory Structure
```bash
mkdir -p src/app/\(dashboard\)/data/workforce/hours
mkdir -p src/app/\(dashboard\)/data/workforce/workers
```

### Step 2: Move Page Files
```bash
# Move Hours V2
mv src/app/\(dashboard\)/finance/data/eitje-data/hours-v2/page.tsx \
   src/app/\(dashboard\)/data/workforce/hours/page.tsx

# Move Workers V2
mv src/app/\(dashboard\)/finance/data/eitje-data/workers-v2/page.tsx \
   src/app/\(dashboard\)/data/workforce/workers/page.tsx
```

### Step 3: Create Layout File
- Create `src/app/(dashboard)/data/workforce/layout.tsx` (see content above)

### Step 4: Create Overview Page (Optional)
- Create `src/app/(dashboard)/data/workforce/page.tsx` (optional overview)

### Step 5: Update Sidebar
- Update `src/components/app-sidebar.tsx`:
  - Update `dataWorkforceV2Items` URLs
  - Update `dataItems` Workforce V2 URL

### Step 6: Search for Route References
- Search codebase for any hardcoded references to old routes
- Update any found references

### Step 7: Test
- Test navigation from sidebar
- Test direct URL access
- Test internal links
- Verify ViewModels still work correctly

### Step 8: Cleanup
- Remove old empty directories:
  ```bash
  rmdir src/app/\(dashboard\)/finance/data/eitje-data/hours-v2
  rmdir src/app/\(dashboard\)/finance/data/eitje-data/workers-v2
  ```

---

## Testing Checklist

- [ ] Sidebar "Workforce V2 > Hours" navigates to `/data/workforce/hours`
- [ ] Sidebar "Workforce V2 > Workers" navigates to `/data/workforce/workers`
- [ ] Direct URL `/data/workforce/hours` loads correctly
- [ ] Direct URL `/data/workforce/workers` loads correctly
- [ ] Layout navigation buttons work correctly
- [ ] ViewModels load data correctly
- [ ] No console errors
- [ ] No broken internal links
- [ ] Old routes return 404 (expected)

---

## Rollback Plan

If issues occur:

1. **Restore Files**:
   ```bash
   # Restore Hours V2
   mv src/app/\(dashboard\)/data/workforce/hours/page.tsx \
      src/app/\(dashboard\)/finance/data/eitje-data/hours-v2/page.tsx

   # Restore Workers V2
   mv src/app/\(dashboard\)/data/workforce/workers/page.tsx \
      src/app/\(dashboard\)/finance/data/eitje-data/workers-v2/page.tsx
   ```

2. **Revert Sidebar**: Restore old URLs in `app-sidebar.tsx`

3. **Remove New Files**: Delete layout and overview if created

---

## Benefits

1. ✅ **Route Clarity**: Routes match navigation structure
2. ✅ **Consistency**: Follows same pattern as `/data/finance/*` and `/data/labor/*`
3. ✅ **Maintainability**: Easier to understand and maintain
4. ✅ **User Experience**: URLs are more intuitive
5. ✅ **Future-Proof**: Better structure for adding more Workforce V2 pages

---

## Notes

- **No Breaking Changes**: ViewModels, Models, and Services remain unchanged
- **MVVM Structure Preserved**: All MVVM layers stay in correct locations
- **Backward Compatibility**: Old routes will 404 (expected behavior)
- **Optional Overview**: Overview page is optional but recommended for consistency

---

## Status

**Current**: ✅ Complete  
**Completed**: 2025-11-10

### Migration Summary
- ✅ Created `/data/workforce/` directory structure
- ✅ Moved `hours-v2/page.tsx` → `/data/workforce/hours/page.tsx`
- ✅ Moved `workers-v2/page.tsx` → `/data/workforce/workers/page.tsx`
- ✅ Created `/data/workforce/layout.tsx` with navigation
- ✅ Created `/data/workforce/page.tsx` overview page
- ✅ Updated sidebar URLs in `app-sidebar.tsx`
- ✅ Removed old route references from `eitje-data/layout.tsx`
- ✅ Cleaned up empty directories

---

**Last Updated**: 2025-11-10  
**Created By**: Route Reorganization Plan

