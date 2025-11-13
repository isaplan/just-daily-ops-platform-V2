-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/check-duplicates.sql

-- Check for duplicate records in Eitje raw tables

-- Check eitje_time_registration_shifts_raw duplicates
SELECT 
  'eitje_time_registration_shifts_raw' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT (eitje_id, date)) as unique_combinations,
  COUNT(*) - COUNT(DISTINCT (eitje_id, date)) as duplicate_records
FROM eitje_time_registration_shifts_raw;

-- Check eitje_planning_shifts_raw duplicates
SELECT 
  'eitje_planning_shifts_raw' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT (eitje_id, date)) as unique_combinations,
  COUNT(*) - COUNT(DISTINCT (eitje_id, date)) as duplicate_records
FROM eitje_planning_shifts_raw;

-- Check eitje_revenue_days_raw duplicates
SELECT 
  'eitje_revenue_days_raw' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT (eitje_id, date)) as unique_combinations,
  COUNT(*) - COUNT(DISTINCT (eitje_id, date)) as duplicate_records
FROM eitje_revenue_days_raw;

-- Show specific duplicate examples
SELECT 
  'eitje_time_registration_shifts_raw' as table_name,
  eitje_id,
  date,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at DESC) as record_ids
FROM eitje_time_registration_shifts_raw
GROUP BY eitje_id, date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;


