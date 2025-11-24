# Master Data Sync Architecture Fixes

## Issues Identified

1. **Users**: Currently syncing to `bork_users` collection ❌
   - **Should be**: Syncing to `unified_users` with system mappings ✅
   - Pattern: Find or create unified user, add Bork system mapping

2. **Cost Centers**: Currently syncing to `bork_cost_centers` collection ❌
   - **Should be**: Syncing to `locations` collection with system mappings ✅
   - Cost centers ARE locations (e.g., "Bar Bea", "Gastropub Van Kinsbergen")
   - Pattern: Find or create location, add Bork system mapping

3. **Product Groups & Payment Methods**: ✅ CORRECT
   - These are reference data (lookup tables), not entities
   - Keep as separate collections: `bork_product_groups`, `bork_payment_methods`

## Implementation Plan

### 1. Fix Users Sync → `unified_users`

**Logic:**
- For each Bork user:
  1. Check if unified_user exists by:
     - Email match (if email exists)
     - Name match (firstName + lastName)
  2. If not found, create new unified_user:
     - Parse name: "First Last" → firstName, lastName
     - Set isActive based on Bork data
     - Add locationId to locationIds array
  3. Add/update system mapping:
     - system: 'bork'
     - externalId: Bork user Key
     - rawData: full Bork API response
  4. Ensure locationId is in locationIds array

**Collection**: `unified_users` (not `bork_users`)

---

### 2. Fix Cost Centers Sync → `locations`

**Logic:**
- For each Bork cost center:
  1. Check if location exists by:
     - Name match (exact or case-insensitive)
     - System mapping (system: 'bork', externalId: cost center Key)
  2. If not found, create new location:
     - name: cost center Name
     - code: cost center CenterNr (if available)
     - isActive: true
  3. Add/update system mapping:
     - system: 'bork'
     - externalId: cost center Key
     - rawData: full Bork API response
  4. Update location fields if needed:
     - level, revenueCenter, leftNr, rightNr (store in rawData or as metadata)

**Collection**: `locations` (not `bork_cost_centers`)

---

### 3. Keep Product Groups & Payment Methods as Reference Data

**Collections:**
- `bork_product_groups` ✅ (reference data)
- `bork_payment_methods` ✅ (reference data)

These are lookup tables, not entities, so separate collections are correct.

---

## Updated Endpoint Structure

```
POST /api/bork/v2/master-sync
- endpoint: 'product_groups' → bork_product_groups ✅
- endpoint: 'payment_methods' → bork_payment_methods ✅
- endpoint: 'cost_centers' → locations (with system mappings) ✅
- endpoint: 'users' → unified_users (with system mappings) ✅
```

---

## Files to Update

1. `src/app/api/bork/v2/master-sync/route.ts`
   - Update users sync logic → unified_users
   - Update cost_centers sync logic → locations
   - Keep product_groups and payment_methods as-is

2. Update GET endpoint to check:
   - unified_users collection (for users count)
   - locations collection (for cost centers count)
   - bork_product_groups (as-is)
   - bork_payment_methods (as-is)

---

## Migration Note

Existing data in `bork_users` and `bork_cost_centers` will need to be migrated to the new structure. This can be done in a separate migration script.





