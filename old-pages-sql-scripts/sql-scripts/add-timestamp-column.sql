-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/add-timestamp-column.sql

-- Add timestamp column to track when each location was last aggregated
ALTER TABLE public.bork_sales_aggregated 
ADD COLUMN IF NOT EXISTS last_location_aggregation TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient timestamp queries
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_last_aggregation 
ON public.bork_sales_aggregated(location_id, last_location_aggregation DESC);

