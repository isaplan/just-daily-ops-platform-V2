-- Verify aggregation is complete for Oct 9-29
-- Check for any remaining gaps

-- 1. Revenue Days: Check for missing dates
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

-- 2. Revenue Days Summary
SELECT 
  'Revenue Days Summary (Oct 9-29)' as check_type,
  COUNT(DISTINCT r.date) as raw_dates_count,
  COUNT(DISTINCT a.date) as aggregated_dates_count,
  COUNT(DISTINCT r.date) - COUNT(DISTINCT a.date) as missing_dates_count,
  MIN(r.date) as earliest_raw_date,
  MAX(r.date) as latest_raw_date,
  MIN(a.date) as earliest_agg_date,
  MAX(a.date) as latest_agg_date
FROM eitje_revenue_days_raw r
LEFT JOIN eitje_revenue_days_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
WHERE r.date >= '2025-10-09' AND r.date <= '2025-10-29';

-- 3. Labor Hours: Check for missing dates (Oct 11-30)
SELECT 
  'Labor Hours: Missing Aggregation' as check_type,
  r.date,
  COUNT(DISTINCT r.id) as raw_records_count,
  a.date as aggregated_date,
  CASE 
    WHEN a.date IS NULL THEN '❌ Not aggregated'
    ELSE '✅ Aggregated'
  END as status
FROM eitje_time_registration_shifts_raw r
LEFT JOIN eitje_labor_hours_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
  AND a.team_id IS NULL
WHERE r.date >= '2025-10-11' AND r.date <= '2025-10-30'
GROUP BY r.date, a.date
HAVING a.date IS NULL
ORDER BY r.date DESC;

-- 4. Labor Hours Summary
SELECT 
  'Labor Hours Summary (Oct 11-30)' as check_type,
  COUNT(DISTINCT r.date) as raw_dates_count,
  COUNT(DISTINCT a.date) as aggregated_dates_count,
  COUNT(DISTINCT r.date) - COUNT(DISTINCT a.date) as missing_dates_count,
  MIN(r.date) as earliest_raw_date,
  MAX(r.date) as latest_raw_date,
  MIN(a.date) as earliest_agg_date,
  MAX(a.date) as latest_agg_date
FROM eitje_time_registration_shifts_raw r
LEFT JOIN eitje_labor_hours_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
  AND a.team_id IS NULL
WHERE r.date >= '2025-10-11' AND r.date <= '2025-10-30';

-- 5. Total aggregated records count
SELECT 
  'Total Aggregated Records' as metric,
  (SELECT COUNT(*) FROM eitje_labor_hours_aggregated) as labor_hours_count,
  (SELECT COUNT(*) FROM eitje_revenue_days_aggregated) as revenue_days_count,
  (SELECT MAX(date) FROM eitje_labor_hours_aggregated) as labor_max_date,
  (SELECT MAX(date) FROM eitje_revenue_days_aggregated) as revenue_max_date;


