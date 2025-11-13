-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/apply-database-indexes.sql

-- CRITICAL: Apply these database indexes to fix performance issues
-- Run this in Supabase SQL Editor to resolve 522/500 timeout errors

-- Index for created_at column (most common ordering)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_created_at 
ON bork_sales_data (created_at DESC);

-- Index for location_id column (common filtering)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_location_id 
ON bork_sales_data (location_id);

-- Composite index for common queries (location_id + created_at)
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_location_created 
ON bork_sales_data (location_id, created_at DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_category 
ON bork_sales_data (category);

-- Partial index for raw data records only
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_raw_records 
ON bork_sales_data (created_at DESC) 
WHERE category = 'STEP1_RAW_DATA';

-- Analyze table to update statistics
ANALYZE bork_sales_data;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'bork_sales_data'
ORDER BY indexname;

