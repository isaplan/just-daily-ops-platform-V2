-- Find the exact unique constraint name and columns
-- Run this in Supabase SQL Editor

-- Check for unique constraints on the aggregated tables
SELECT 
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as constraint_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_name;

-- Also check indexes (unique indexes can be used for onConflict)
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
  AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;



