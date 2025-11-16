-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/VIEW-JSONB-HERE.sql

-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR RIGHT NOW

-- Show formatted JSONB (pretty print)
SELECT jsonb_pretty(raw_data) as jsonb_data
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, id
LIMIT 1;

