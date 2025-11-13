-- Verify aggregated data includes the new columns with actual values

-- 1. Check sample records with new columns populated
SELECT 
  date,
  environment_id,
  total_revenue,
  total_revenue_excl_vat,
  total_revenue_incl_vat,
  total_vat_amount,
  avg_vat_rate,
  total_cash_revenue,
  total_card_revenue,
  total_digital_revenue,
  cash_percentage,
  card_percentage,
  currency,
  transaction_count,
  max_transaction_value,
  min_transaction_value
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, environment_id
LIMIT 10;

-- 2. Check if new columns have non-zero values
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_revenue_excl_vat > 0 THEN 1 END) as has_excl_vat,
  COUNT(CASE WHEN total_vat_amount > 0 THEN 1 END) as has_vat,
  COUNT(CASE WHEN total_cash_revenue > 0 THEN 1 END) as has_cash,
  COUNT(CASE WHEN total_card_revenue > 0 THEN 1 END) as has_card,
  COUNT(CASE WHEN currency IS NOT NULL THEN 1 END) as has_currency,
  COUNT(CASE WHEN max_transaction_value > 0 THEN 1 END) as has_max_transaction
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 3. Summary statistics for new columns
SELECT 
  COUNT(*) as record_count,
  SUM(total_revenue) as sum_total_revenue,
  SUM(total_revenue_excl_vat) as sum_excl_vat,
  SUM(total_revenue_incl_vat) as sum_incl_vat,
  SUM(total_vat_amount) as sum_vat,
  SUM(total_cash_revenue) as sum_cash,
  SUM(total_card_revenue) as sum_card,
  AVG(avg_vat_rate) as avg_vat_rate_overall,
  AVG(cash_percentage) as avg_cash_percentage
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 4. Check latest record details
SELECT 
  date,
  environment_id,
  total_revenue,
  transaction_count,
  total_revenue_excl_vat,
  total_revenue_incl_vat,
  total_vat_amount,
  avg_vat_rate,
  total_cash_revenue,
  total_card_revenue,
  total_digital_revenue,
  cash_percentage,
  card_percentage,
  digital_percentage,
  max_transaction_value,
  min_transaction_value,
  currency,
  net_revenue,
  gross_revenue,
  updated_at
FROM eitje_revenue_days_aggregated
ORDER BY updated_at DESC
LIMIT 5;

