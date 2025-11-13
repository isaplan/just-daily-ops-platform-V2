-- Quick syntax verification for CHECK-EITJE-DATA-FLOW.sql
-- This checks if all tables exist before running the full check

-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'eitje_time_registration_shifts_raw',
      'eitje_revenue_days_raw',
      'eitje_labor_hours_aggregated',
      'eitje_revenue_days_aggregated',
      'eitje_sync_state'
    ) THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'eitje_time_registration_shifts_raw',
    'eitje_revenue_days_raw',
    'eitje_labor_hours_aggregated',
    'eitje_revenue_days_aggregated',
    'eitje_sync_state'
  );



