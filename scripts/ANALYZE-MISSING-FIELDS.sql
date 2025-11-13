-- Analyze why fields might be missing in aggregated data

-- 1. Check normalized columns population in raw table
SELECT 
  COUNT(*) as total_records,
  -- Revenue fields
  COUNT(CASE WHEN total_revenue IS NOT NULL AND total_revenue > 0 THEN 1 END) as has_total_revenue,
  COUNT(CASE WHEN revenue IS NOT NULL AND revenue > 0 THEN 1 END) as has_revenue,
  COUNT(CASE WHEN net_revenue IS NOT NULL AND net_revenue > 0 THEN 1 END) as has_net_revenue,
  COUNT(CASE WHEN gross_revenue IS NOT NULL AND gross_revenue > 0 THEN 1 END) as has_gross_revenue,
  -- VAT fields
  COUNT(CASE WHEN vat_amount IS NOT NULL AND vat_amount > 0 THEN 1 END) as has_vat_amount,
  COUNT(CASE WHEN vat_percentage IS NOT NULL AND vat_percentage > 0 THEN 1 END) as has_vat_percentage,
  -- Payment methods
  COUNT(CASE WHEN cash_revenue IS NOT NULL AND cash_revenue > 0 THEN 1 END) as has_cash_revenue,
  COUNT(CASE WHEN card_revenue IS NOT NULL AND card_revenue > 0 THEN 1 END) as has_card_revenue,
  COUNT(CASE WHEN digital_revenue IS NOT NULL AND digital_revenue > 0 THEN 1 END) as has_digital_revenue,
  -- Other fields
  COUNT(CASE WHEN currency IS NOT NULL THEN 1 END) as has_currency,
  COUNT(CASE WHEN transaction_count IS NOT NULL AND transaction_count > 0 THEN 1 END) as has_transaction_count
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 2. Check what's in raw_data JSONB (keys available)
SELECT 
  'revenue_days' as table_name,
  jsonb_object_keys(raw_data) as jsonb_key,
  COUNT(*) as occurrences
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY jsonb_key
ORDER BY jsonb_key;

-- 3. Check aggregated table - which columns have values
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_revenue > 0 THEN 1 END) as has_total_revenue,
  COUNT(CASE WHEN total_revenue_excl_vat > 0 THEN 1 END) as has_excl_vat,
  COUNT(CASE WHEN total_revenue_incl_vat > 0 THEN 1 END) as has_incl_vat,
  COUNT(CASE WHEN total_vat_amount > 0 THEN 1 END) as has_vat_amount,
  COUNT(CASE WHEN avg_vat_rate > 0 THEN 1 END) as has_vat_rate,
  COUNT(CASE WHEN total_cash_revenue > 0 THEN 1 END) as has_cash,
  COUNT(CASE WHEN total_card_revenue > 0 THEN 1 END) as has_card,
  COUNT(CASE WHEN total_digital_revenue > 0 THEN 1 END) as has_digital,
  COUNT(CASE WHEN cash_percentage > 0 THEN 1 END) as has_cash_pct,
  COUNT(CASE WHEN currency IS NOT NULL THEN 1 END) as has_currency
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

