-- Check actual table structures to see what columns exist

-- Check eitje_environments structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'eitje_environments'
ORDER BY ordinal_position;

-- Check eitje_teams structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'eitje_teams'
ORDER BY ordinal_position;

-- Check eitje_revenue_days_aggregated structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'eitje_revenue_days_aggregated'
ORDER BY ordinal_position;

-- Check eitje_labor_hours_aggregated structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'eitje_labor_hours_aggregated'
ORDER BY ordinal_position;

