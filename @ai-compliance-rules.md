# AI Compliance Rules

## Overview
This document defines the compliance rules that the Cursor AI agent must follow when making code changes to this project. These rules are enforced through automated pre-execution and post-execution checks.

## Core Principles

### 1. **Incremental Changes Only**
- Maximum 100 lines changed per file per task
- Break large changes into smaller, focused commits
- Use `search_replace` for targeted modifications instead of full file rewrites

### 2. **Code Preservation**
- Never delete existing working functionality without explicit approval
- Maximum 20 lines deletion per file (prevents accidental removal of working code)
- Preserve all existing imports and exports unless explicitly instructed

### 3. **Registry Protection**
- Files marked as "completed" with `touch_again: false` in `function-registry.json` are **STRICTLY OFF-LIMITS**
- Any modification to protected files will be **BLOCKED** and must be **REVERTED**

### 4. **Reuse Existing Code**
- Always search for existing implementations before creating new code
- Leverage existing utilities, components, and functions
- Ask before duplicating functionality

### 5. **No Full File Replacements**
- Avoid replacing entire files (threshold: >80% of lines changed)
- Use incremental modifications to update specific sections
- Maintain git history and change traceability

### 6. **Instant Paint Pattern (SSR/ISR) - MANDATORY**
- **ALL pages with tables/data MUST use Server Component pattern for instant HTML paint**
- Server Components return static HTML structure immediately (< 50ms)
- Server Components CAN fetch initial 50 items from aggregated collections (fast, < 500ms)
- Client Components handle lazy loading of filters and subsequent pages
- ISR caches HTML + initial data at CDN edge for 30 minutes (`export const revalidate = 1800`)
- **NEVER** fetch from raw_data collections in Server Components
- **ALWAYS** use aggregated collections for initial data fetch
- **ALWAYS** use database-level pagination (skip/limit) for initial fetch
- **ALWAYS** lazy load filter content and subsequent pages

## Instant Paint Architecture Pattern

### **CRITICAL: Server Component Pattern (MANDATORY)**

**For ALL pages with tables or data displays, you MUST follow this pattern:**

#### **1. Server Component (`page.tsx`) - SSR WITH INITIAL DATA**

```typescript
/**
 * Page Name - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { PageClient } from './PageClient';
import { getInitialData } from '@/lib/services/graphql/queries';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function Page() {
  // Calculate default date range (this-month or this-year)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // ✅ Fetch initial 50 items from aggregated collections (fast, < 500ms)
  const [initialData, locations] = await Promise.all([
    getInitialData(startDate, endDate, 1, 50).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <PageClient 
      initialData={{
        data: initialData || undefined,
        locations: locations || [],
      }}
    />
  );
}
```

**Rules:**
- ✅ **CAN** use `await` in Server Component `page.tsx` for initial data fetch
- ✅ **CAN** call `getLocations()`, `fetchData()` from aggregated collections only
- ✅ **ALWAYS** fetch first 50 items only (page 1, limit 50)
- ✅ **ALWAYS** use aggregated collections (never raw_data)
- ✅ **ALWAYS** use database-level pagination (skip/limit)
- ❌ **NEVER** import client-side utilities (marked with `'use client'`)
- ❌ **NEVER** fetch from raw_data collections (too slow)
- ✅ **ALWAYS** export `revalidate = 1800` for ISR caching
- ✅ **ALWAYS** pass `initialData` to Client Component

#### **2. Client Component (`PageClient.tsx`) - INTERACTIVE & LAZY LOADING**

```typescript
/**
 * Page Name - Client Component
 * Handles all interactivity - receives initial data from Server Component
 * Uses initialData for instant display, then lazy loads rest of page 1 and subsequent pages
 */

"use client";

import { usePageViewModel } from "@/viewmodels/domain/usePageViewModel";

interface PageClientProps {
  initialData?: {
    data?: any;
    locations?: any[];
  };
}

export function PageClient({ initialData }: PageClientProps) {
  // ✅ ViewModel uses initialData for instant display
  // ✅ ViewModel lazy loads rest of page 1 and subsequent pages
  const viewModel = usePageViewModel(initialData);
  
  // ✅ All interactivity (filters, pagination) happens here
  // ✅ ViewModel handles GraphQL queries with pagination
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Filters, tables, pagination - all client-side */}
    </div>
  );
}
```

**Rules:**
- ✅ **ALWAYS** mark with `'use client'` directive
- ✅ **ALWAYS** accept `initialData` prop from Server Component
- ✅ **ALWAYS** pass `initialData` to ViewModel
- ✅ **ALWAYS** use ViewModels for data fetching (not direct GraphQL calls in component)
- ✅ **ALWAYS** implement lazy loading for filters and subsequent pages
- ✅ **ALWAYS** use React Query with proper stale times (30+ minutes for static data)

### **Database & GraphQL Pattern**

#### **1. Aggregated Collections (MANDATORY)**

**ALWAYS use aggregated collections for GraphQL queries:**

```typescript
// ✅ CORRECT - Use aggregated collection
const data = await db.collection('products_aggregated')
  .find({ locationId })
  .skip((page - 1) * limit)
  .limit(limit)
  .toArray();

// ❌ WRONG - Never use raw_data in GraphQL resolvers
const data = await db.collection('bork_raw_data')
  .find({ locationId })
  .toArray(); // Too slow, causes timeouts
```

**Aggregated Collections:**
- ✅ `products_aggregated` - All product data (sales, prices, categories, workload)
- ✅ `bork_aggregated` - Daily sales aggregations
- ✅ `eitje_aggregated` - Daily labor aggregations

**Raw Data Collections:**
- ❌ **NEVER** use in GraphQL resolvers (too slow)
- ✅ **ONLY** use in cron jobs that populate aggregated collections
- ✅ **ONLY** use for diagnostics/debugging (document exception)

#### **2. Database-Level Pagination (MANDATORY)**

**ALWAYS paginate at database level, NEVER fetch all records:**

```typescript
// ✅ CORRECT - Database-level pagination
const [records, total] = await Promise.all([
  db.collection('products_aggregated')
    .find({ locationId })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray(),
  db.collection('products_aggregated')
    .countDocuments({ locationId }),
]);

return {
  records,
  total,
  page,
  totalPages: Math.ceil(total / limit),
};

// ❌ WRONG - Client-side pagination (fetches all records)
const allRecords = await db.collection('products_aggregated')
  .find({ locationId })
  .toArray(); // Fetches 100k+ records!
const page1 = allRecords.slice(0, 50); // Paginates in memory
```

**Rules:**
- ✅ **ALWAYS** use `.skip()` and `.limit()` in MongoDB queries
- ✅ **ALWAYS** return `totalPages` for pagination UI
- ✅ **ALWAYS** use indexed fields in queries (check `v2-indexes.ts`)
- ❌ **NEVER** fetch all records and paginate in memory
- ❌ **NEVER** use `limit: 10000` to fetch "all" records

#### **3. GraphQL Resolver Pattern**

```typescript
// ✅ CORRECT - Paginated GraphQL resolver
products: async (
  _: any,
  { page = 1, limit = 50, locationId }: { page?: number; limit?: number; locationId?: string }
) => {
  const db = await getDatabase();
  const skip = (page - 1) * limit;
  
  // ✅ Parallel queries for performance
  const [records, total] = await Promise.all([
    db.collection('products_aggregated')
      .find(locationId ? { locationId } : {})
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('products_aggregated')
      .countDocuments(locationId ? { locationId } : {}),
  ]);
  
  return {
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Rules:**
- ✅ **ALWAYS** accept `page` and `limit` parameters
- ✅ **ALWAYS** use aggregated collections
- ✅ **ALWAYS** return `totalPages` for pagination
- ✅ **ALWAYS** use `.sort()` with indexed fields
- ❌ **NEVER** query raw_data collections
- ❌ **NEVER** return all records without pagination

### **Lazy Loading Pattern**

#### **1. First 50 Items (Server-Side Fetch - Zero Load)**

**Server Component fetches first page (50 items) from aggregated collections:**

```typescript
// Server Component (page.tsx)
export default async function Page() {
  const [initialData, locations] = await Promise.all([
    getInitialData(startDate, endDate, 1, 50), // From aggregated collection
    getLocations(),
  ]);
  return <PageClient initialData={{ data: initialData, locations }} />;
}

// ViewModel uses initialData for instant display
const { data, isLoading } = useQuery({
  queryKey: ['products', { page: 1, limit: 50, locationId }],
  queryFn: () => fetchProducts({ page: 1, limit: 50, locationId }),
  initialData: initialData?.data, // ✅ Use server-fetched data
  staleTime: 30 * 60 * 1000, // 30 minutes
});
```

#### **2. Filter Content (Server-Side + Lazy Load)**

**Locations are fetched on server, filters load options lazily:**

```typescript
// Server Component fetches locations
const [initialData, locations] = await Promise.all([
  getInitialData(...),
  getLocations(), // ✅ Fetched on server
]);

// ViewModel uses server-fetched locations
const { data: locations = initialData?.locations || [] } = useQuery({
  queryKey: ['locations'],
  queryFn: getLocations,
  initialData: initialData?.locations, // ✅ Use server-fetched data
  staleTime: 60 * 60 * 1000, // 60 minutes (static data)
});
```

#### **3. Subsequent Pages (Lazy Load)**

**Pagination loads next pages on demand:**

```typescript
// ✅ Only fetches when user clicks "Next Page"
const handlePageChange = (newPage: number) => {
  setCurrentPage(newPage);
  // ViewModel automatically fetches new page
};
```

### **Performance Targets**

**Instant Paint Requirements:**
- ✅ HTML structure generation: < 50ms (Server Component structure)
- ✅ Initial data fetch: < 500ms (first 50 items from aggregated collections)
- ✅ Total first paint: < 1 second (HTML + initial data)
- ✅ Memory usage: < 100MB per page (with pagination)

**ISR Caching:**
- ✅ Static data (locations, products): `revalidate = 3600` (60 minutes)
- ✅ User data (workers, teams): `revalidate = 1800` (30 minutes)
- ✅ Sales/Labor data: `revalidate = 300` (5 minutes)

### **Checklist for New Pages**

When creating a new page with tables/data:

- [ ] Server Component (`page.tsx`) - NO `'use client'`, IS async, fetches initial 50 items
- [ ] Server Component uses aggregated collections only (never raw_data)
- [ ] Server Component uses database-level pagination (skip/limit)
- [ ] Client Component (`PageClient.tsx`) - Has `'use client'`, accepts `initialData` prop
- [ ] ViewModel accepts `initialData` parameter and uses it
- [ ] ISR revalidation (`export const revalidate = 1800`)
- [ ] ViewModel uses aggregated collections (not raw_data)
- [ ] GraphQL resolver supports pagination (page, limit, totalPages)
- [ ] Database queries use `.skip()` and `.limit()`
- [ ] Database queries use indexed fields only
- [ ] React Query stale time >= 30 minutes for static data
- [ ] First 50 items load immediately after HTML paint
- [ ] Filters and subsequent pages lazy load

### **Common Mistakes to Avoid**

❌ **WRONG:**
```typescript
// Server Component with async data fetching
export default async function Page() {
  const data = await fetchData(); // ❌ Blocks HTML generation
  return <Table data={data} />;
}
```

✅ **CORRECT:**
```typescript
// Server Component - static only
export default function Page() {
  return <PageClient />; // ✅ Instant HTML
}

// Client Component - data fetching
"use client";
export function PageClient() {
  const { data } = useQuery(...); // ✅ After HTML paint
  return <Table data={data} />;
}
```

❌ **WRONG:**
```typescript
// Fetching all records
const allData = await db.collection('bork_raw_data').find({}).toArray();
const page1 = allData.slice(0, 50); // ❌ Client-side pagination
```

✅ **CORRECT:**
```typescript
// Database-level pagination
const page1 = await db.collection('bork_aggregated')
  .find({})
  .skip(0)
  .limit(50)
  .toArray(); // ✅ Only fetches 50 records
```

## Pre-Execution Checks

Before starting any code modification, the AI agent must:

1. **Search for Existing Code**: Check if similar functionality already exists
2. **Verify Registry Protection**: Ensure target files are not marked as completed/protected
3. **Estimate Change Size**: Verify planned changes are within 100-line limit
4. **Report Findings**: Display any existing code found or violations detected

### Pre-Check Status Codes
- `PASS`: All checks passed, proceed with changes
- `WARN`: Existing code found or minor concerns, review before proceeding
- `BLOCK`: Critical violation detected, **DO NOT PROCEED**

## Post-Execution Checks

After making code modifications, the AI agent must:

1. **Count Lines Changed**: Verify actual changes are within 100-line limit per file
2. **Check Registry Violations**: Ensure no protected files were modified
3. **Detect Excessive Deletions**: Flag if >20 lines were deleted
4. **Identify Full Replacements**: Detect if files were replaced instead of incrementally updated
5. **Report Violations**: Display all detected violations with severity levels

### Post-Check Status Codes
- `PASS`: No violations detected, changes are compliant
- `WARN`: Minor issues detected (e.g., approaching limits)
- `VIOLATIONS`: One or more violations detected, review required

## Violation Severities

### CRITICAL 🔴
- **Registry Violations**: Modified a protected/completed file
- **Action Required**: REVERT CHANGES IMMEDIATELY

### HIGH 🟠
- **Size Violations**: Exceeded 100-line limit per file
- **Full File Replacement**: Replaced entire file instead of incremental changes
- **File Deletion**: Deleted a file containing working functionality
- **Action Required**: Break down into smaller changes or use incremental approach

### MEDIUM 🟡
- **Excessive Deletions**: Removed >20 lines from a file
- **Deleted Imports**: Removed >5 import statements
- **Removed Exports**: Removed >2 export statements
- **Action Required**: Verify deleted code is not needed

### LOW 🔵
- **Whitespace Changes**: >30 whitespace-only changes
- **Action Required**: Use formatter to avoid unnecessary changes

## Exempt Files

The following files are exempt from size checks (but still subject to registry protection):
- `function-registry.json`
- `ai-tracking-system.json`
- `.ai-compliance-messages.json`
- `.ai-compliance-status.json`
- `progress-log.json`
- `test-results.json`
- `build-log.json`

These files can grow as needed for tracking and logging purposes.

## Excluded Paths

The following paths are excluded from compliance checks:
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`
- `build/`

## File Types Monitored

Compliance checks apply to the following file types:
- `.ts` - TypeScript
- `.tsx` - TypeScript React
- `.js` - JavaScript
- `.jsx` - JavaScript React
- `.json` - JSON (with exemptions for tracking files)

## Best Practices

### DO ✅
- Search for existing code before creating new functionality
- Make small, focused changes (max 100 lines per file)
- Use `search_replace` for targeted modifications
- Preserve existing working functionality
- Respect registry protection
- Review pre-check warnings before proceeding
- Review post-check violations and fix issues

### DON'T ❌
- Don't replace entire files
- Don't modify protected/completed files
- Don't delete working functionality without approval
- Don't ignore pre-check BLOCK status
- Don't proceed without reviewing existing code found
- Don't bundle multiple unrelated changes in one commit

## Compliance Extension

This project includes a VS Code extension that automatically enforces these rules by:

1. **Intercepting File Changes**: Monitors when Cursor AI agent makes changes
2. **Running Pre-Checks**: Executes before code modifications begin
3. **Running Post-Checks**: Executes after all tasks are completed
4. **Displaying Status**: Shows compliance status in status bar and notifications
5. **Reporting Violations**: Lists all violations with severity and required actions

### Extension Features
- ✅ Real-time compliance monitoring
- ⚠️ Pre-check warnings and blocking
- 📊 Detailed violation reports
- 🔄 Automatic check execution
- 💬 Non-blocking notifications (light version)

## Configuration

Compliance rules can be customized in `tools/compliance/config/.ai-compliance-rules.json`:

```json
{
  "maxLinesPerChange": 100,
  "maxDeletions": 20,
  "fullReplacementThreshold": 0.8,
  "excludedPaths": ["node_modules", ".git", ".next", "dist", "build"],
  "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".json"],
  "exemptFiles": ["function-registry.json", "ai-tracking-system.json"],
  "search": {
    "maxResults": 5,
    "minKeywordLength": 3,
    "useContentSearch": true
  }
}
```

## Getting Help

If you need to:
- **Override a rule**: Update `.ai-compliance-rules.json`
- **Mark a file as completed**: Add to `function-registry.json` with `touch_again: false`
- **Exempt a file from size checks**: Add to `exemptFiles` in config
- **Report a false positive**: Check `tools/compliance/` scripts

## References

- Pre-execution check: `tools/compliance/pre-execution-check.js`
- Post-execution check: `tools/compliance/post-execution-check.js`
- Function registry: `function-registry.json`
- Progress log: `progress-log.json`
- Extension docs: `docs/compliance-extension.md`

---

**Remember**: These rules exist to maintain code quality, prevent regressions, and ensure the AI agent makes thoughtful, incremental changes rather than wholesale replacements. Following these rules leads to better code, clearer git history, and fewer bugs.







