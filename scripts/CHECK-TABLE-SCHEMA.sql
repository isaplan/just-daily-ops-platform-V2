-- Check exact table schema and constraints
-- This will help identify why upsert is failing

-- 1. Check table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
ORDER BY table_name, ordinal_position;

-- 2. Check PRIMARY KEY
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 3. Check UNIQUE constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 4. Check indexes (might reveal unique constraints)
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
ORDER BY tablename, indexname;



