-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/disable-rls-complete.sql

-- Complete RLS disable script
-- Run this in Supabase SQL Editor

-- First, check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('powerbi_pnl_aggregated', 'powerbi_pnl_aggregated_subcategories');

-- Disable RLS on both tables
ALTER TABLE public.powerbi_pnl_aggregated DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_pnl_aggregated_subcategories DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('powerbi_pnl_aggregated', 'powerbi_pnl_aggregated_subcategories');

-- Test insert to verify RLS is disabled
INSERT INTO public.powerbi_pnl_aggregated (
    location_id, year, month, revenue_food, revenue_beverage, revenue_total,
    cost_of_sales_food, cost_of_sales_beverage, cost_of_sales_total,
    labor_contract, labor_flex, labor_total, other_costs_total, opbrengst_vorderingen, resultaat,
    netto_omzet_uit_levering_geproduceerd, netto_omzet_verkoop_handelsgoederen, inkoopwaarde_handelsgoederen,
    lonen_en_salarissen, huisvestingskosten, exploitatie_kosten, verkoop_kosten, autokosten,
    kantoorkosten, assurantiekosten, accountantskosten, administratieve_lasten, andere_kosten,
    afschrijvingen, financiele_baten_lasten, total_revenue, total_cost_of_sales, total_labor_costs,
    total_other_costs, total_costs
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002', 2025, 3, 1000, 500, 1500,
    -300, -200, -500, -400, -100, -500, -200, 0, 300,
    1000, 500, -500, -500, -100, -50, -30, -20, -10,
    -5, -3, -2, -10, -50, -20, 1500, -500, -500, -200, -1200
);

-- Clean up test data
DELETE FROM public.powerbi_pnl_aggregated 
WHERE location_id = '550e8400-e29b-41d4-a716-446655440002' 
AND year = 2025 AND month = 3;

-- Show success message
SELECT 'RLS disabled successfully and test insert/delete worked!' as status;


