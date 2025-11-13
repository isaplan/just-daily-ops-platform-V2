-- Verify that the migration expanded the eitje_revenue_days_aggregated table correctly

-- 1. Check if new columns exist
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eitje_revenue_days_aggregated'
  AND column_name IN (
    'total_revenue_excl_vat',
    'total_revenue_incl_vat',
    'total_vat_amount',
    'avg_vat_rate',
    'total_cash_revenue',
    'total_card_revenue',
    'total_digital_revenue',
    'total_other_revenue',
    'cash_percentage',
    'card_percentage',
    'digital_percentage',
    'other_percentage',
    'max_transaction_value',
    'min_transaction_value',
    'currency',
    'net_revenue',
    'gross_revenue'
  )
ORDER BY column_name;

-- 2. Verify no JSONB columns exist (compliance check)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eitje_revenue_days_aggregated'
  AND data_type = 'jsonb';

-- Should return 0 rows

-- 3. Check total column count
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eitje_revenue_days_aggregated';

-- Should show approximately 25+ columns (id, date, environment_id, 3 original + 22 new + timestamps)

-- 4. Check if indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'eitje_revenue_days_aggregated'
  AND indexname LIKE 'idx_eitje_revenue_days%'
ORDER BY indexname;

-- 5. Sample check of existing data (should show 0s for new columns until aggregation is re-run)
SELECT 
  date,
  environment_id,
  total_revenue,
  total_revenue_excl_vat,
  total_revenue_incl_vat,
  total_vat_amount,
  total_cash_revenue,
  currency
FROM eitje_revenue_days_aggregated
ORDER BY date DESC, environment_id
LIMIT 5;

