-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/cleanup-duplicates.sql

-- Clean up duplicate records in Eitje raw tables
-- Keep only the most recent record for each (eitje_id, date) combination

-- Clean up eitje_time_registration_shifts_raw duplicates
WITH duplicates AS (
  SELECT 
    id,
    eitje_id,
    date,
    ROW_NUMBER() OVER (
      PARTITION BY eitje_id, date 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM eitje_time_registration_shifts_raw
)
DELETE FROM eitje_time_registration_shifts_raw 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up eitje_planning_shifts_raw duplicates
WITH duplicates AS (
  SELECT 
    id,
    eitje_id,
    date,
    ROW_NUMBER() OVER (
      PARTITION BY eitje_id, date 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM eitje_planning_shifts_raw
)
DELETE FROM eitje_planning_shifts_raw 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up eitje_revenue_days_raw duplicates
WITH duplicates AS (
  SELECT 
    id,
    eitje_id,
    date,
    ROW_NUMBER() OVER (
      PARTITION BY eitje_id, date 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM eitje_revenue_days_raw
)
DELETE FROM eitje_revenue_days_raw 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);


