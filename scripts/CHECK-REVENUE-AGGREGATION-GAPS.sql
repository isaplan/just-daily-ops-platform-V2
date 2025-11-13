-- Check Revenue Days aggregation gaps for Oct 9-29
-- Run this to see which dates are missing

SELECT 
  'Revenue Days: Missing Aggregation' as check_type,
  r.date,
  COUNT(DISTINCT r.id) as raw_records_count,
  a.date as aggregated_date,
  CASE 
    WHEN a.date IS NULL THEN '❌ Not aggregated'
    ELSE '✅ Aggregated'
  END as status
FROM eitje_revenue_days_raw r
LEFT JOIN eitje_revenue_days_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
WHERE r.date >= '2025-10-09' AND r.date <= '2025-10-29'
GROUP BY r.date, a.date
HAVING a.date IS NULL
ORDER BY r.date DESC;

-- Also show summary
SELECT 
  'Revenue Days Summary' as check_type,
  COUNT(DISTINCT r.date) as raw_dates_count,
  COUNT(DISTINCT a.date) as aggregated_dates_count,
  COUNT(DISTINCT r.date) - COUNT(DISTINCT a.date) as missing_dates_count
FROM eitje_revenue_days_raw r
LEFT JOIN eitje_revenue_days_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
WHERE r.date >= '2025-10-09' AND r.date <= '2025-10-29';


