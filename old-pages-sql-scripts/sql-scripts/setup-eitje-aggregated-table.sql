-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-eitje-aggregated-table.sql

-- SETUP EITJE AGGREGATED TABLE FOR DATA PROCESSING
-- Run this in your Supabase SQL Editor

-- Create eitje_sales_aggregated table (similar to bork_sales_aggregated)
CREATE TABLE IF NOT EXISTS eitje_sales_aggregated (
    id SERIAL PRIMARY KEY,
    location_id TEXT,
    date DATE NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    total_revenue_excl_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue_incl_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    avg_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_9_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_9_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_21_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_21_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    product_count INTEGER NOT NULL DEFAULT 0,
    unique_products INTEGER NOT NULL DEFAULT 0,
    top_category TEXT,
    category_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eitje_aggregated_date ON eitje_sales_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_eitje_aggregated_location ON eitje_sales_aggregated(location_id);
CREATE INDEX IF NOT EXISTS idx_eitje_aggregated_revenue ON eitje_sales_aggregated(total_revenue_incl_vat);

-- Enable RLS
ALTER TABLE eitje_sales_aggregated ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access to eitje aggregated data" ON eitje_sales_aggregated
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje aggregated data" ON eitje_sales_aggregated
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje aggregated data" ON eitje_sales_aggregated
    FOR SELECT TO anon USING (true);

-- Create summary view for eitje aggregated data
CREATE OR REPLACE VIEW eitje_sales_summary AS
SELECT 
    location_id,
    date,
    total_quantity,
    total_revenue_excl_vat,
    total_revenue_incl_vat,
    total_vat_amount,
    total_cost,
    avg_price,
    product_count,
    unique_products,
    top_category,
    (total_revenue_incl_vat - total_cost) as profit,
    CASE 
        WHEN total_revenue_incl_vat > 0 
        THEN ((total_revenue_incl_vat - total_cost) / total_revenue_incl_vat) * 100 
        ELSE 0 
    END as profit_margin,
    created_at,
    updated_at
FROM eitje_sales_aggregated
ORDER BY date DESC, location_id;

-- Grant access to the view
GRANT SELECT ON eitje_sales_summary TO authenticated;
GRANT SELECT ON eitje_sales_summary TO service_role;
GRANT SELECT ON eitje_sales_summary TO anon;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'eitje_sales_aggregated'
ORDER BY ordinal_position;

