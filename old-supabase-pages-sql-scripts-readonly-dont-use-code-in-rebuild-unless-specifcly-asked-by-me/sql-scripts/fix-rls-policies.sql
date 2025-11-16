-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/fix-rls-policies.sql

-- Fix RLS policies for powerbi_pnl_aggregated tables
-- The current policies are too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.powerbi_pnl_aggregated;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.powerbi_pnl_aggregated_subcategories;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories;

-- Create more permissive policies
CREATE POLICY "Allow all operations for authenticated users" ON public.powerbi_pnl_aggregated
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
    FOR ALL USING (auth.role() = 'authenticated');

-- Also allow service role access (for server-side operations)
CREATE POLICY "Allow service role access" ON public.powerbi_pnl_aggregated
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role access" ON public.powerbi_pnl_aggregated_subcategories
    FOR ALL USING (auth.role() = 'service_role');