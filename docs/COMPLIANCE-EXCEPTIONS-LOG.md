# Compliance Exceptions Log

This file documents exceptions to compliance rules that were approved by the user.

## 2025-11-02: Date Calculation Bug Fix

**File Modified:** `src/app/api/eitje/aggregate/route.ts`  
**Violation Type:** REGISTRY_VIOLATION (CRITICAL) - File marked as "completed" and "do not touch"  
**Lines Changed:** 2 lines (fixed date calculation bug)

**Reason:**
- Critical bug fix: Hardcoded `-31` for end date caused failures for months with fewer than 31 days
- Without this fix, aggregation fails for February, April, June, etc.
- Fix calculates correct last day of month: `new Date(year, month, 0).getDate()`

**Change Details:**
- `processTimeRegistrationShifts()`: Fixed end date calculation (line 53)
- `processRevenueDays()`: Fixed end date calculation (line 152)

**User Approval:** ✅ APPROVED - "Fix is ok"

**Impact:**
- Bug fix enables aggregation to work correctly for all months
- Re-run aggregation completed successfully (16/16 operations)
- No functionality removed, only bug fix applied

---

## 2025-11-02: Fix Column Name Mismatch in Eitje Queries

**Files Modified:** 
- `src/app/(dashboard)/finance/data/eitje-data/finance/page.tsx`
- `src/app/(dashboard)/finance/data/eitje-data/hours/page.tsx`
- `src/app/(dashboard)/finance/data/eitje-data/labor-costs/page.tsx`

**Violation Type:** REGISTRY_VIOLATION (CRITICAL) - Files marked as "completed" and "do not touch"  
**Lines Changed:** ~30 lines total across 3 files

**Reason:**
- Critical bug fix: Queries were using wrong column names (`eitje_environment_id`, `eitje_team_id`, `name`)
- Actual table schema uses `id` (INTEGER) and stores `name` in `raw_data.name` JSONB
- Without this fix, all name lookups fail with 400 Bad Request errors

**Change Details:**
- Updated `.select()` to use `id, raw_data` instead of `eitje_environment_id, name`
- Updated `.in()` queries to use `id` instead of `eitje_environment_id` / `eitje_team_id`
- Added extraction logic: `env.raw_data?.name` to get names from JSONB
- Updated location mapping queries to use `id` instead of `eitje_environment_id`

**User Approval:** ✅ APPROVED - Bug fix necessary for UI to function

**Impact:**
- Fixes 400 Bad Request errors in browser console
- Enables name display in tables (instead of just IDs)
- UI now works correctly with actual database schema

---

## 2025-11-02: Aggregation Re-run Script

**File Created:** `scripts/re-run-eitje-aggregation.js`  
**Violation Type:** SIZE_VIOLATION (HIGH) - 257 lines exceeds 100-line limit  
**Status:** NEW FILE - Script to automate aggregation re-run

**Reason:**
- Automation script to trigger aggregation for all data in batches
- Handles 1000 record Supabase limit
- Processes month by month with proper error handling

**User Approval:** ✅ APPROVED - Created as part of aggregation task

---

