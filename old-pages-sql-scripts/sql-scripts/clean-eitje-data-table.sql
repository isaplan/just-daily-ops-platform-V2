-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/clean-eitje-data-table.sql

-- Create eitje_sales_data table
CREATE TABLE IF NOT EXISTS eitje_sales_data (
    id TEXT PRIMARY KEY,
    location_id TEXT,
    date DATE NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eitje_sales_data_date ON eitje_sales_data(date);
CREATE INDEX IF NOT EXISTS idx_eitje_sales_data_location ON eitje_sales_data(location_id);
CREATE INDEX IF NOT EXISTS idx_eitje_sales_data_product ON eitje_sales_data(product_name);
CREATE INDEX IF NOT EXISTS idx_eitje_sales_data_category ON eitje_sales_data(category);

-- Enable RLS
ALTER TABLE eitje_sales_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access to eitje sales data" ON eitje_sales_data
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje sales data" ON eitje_sales_data
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje sales data" ON eitje_sales_data
    FOR SELECT TO anon USING (true);

-- Create aggregated view for eitje data
CREATE OR REPLACE VIEW eitje_sales_aggregated AS
SELECT 
    location_id,
    date,
    COUNT(*) as product_count,
    SUM(quantity) as total_quantity,
    SUM(revenue) as total_revenue,
    AVG(price) as avg_price,
    COUNT(DISTINCT product_name) as unique_products,
    COUNT(DISTINCT category) as unique_categories,
    MAX(created_at) as last_updated
FROM eitje_sales_data
GROUP BY location_id, date
ORDER BY date DESC, location_id;

-- Grant access to the view
GRANT SELECT ON eitje_sales_aggregated TO authenticated;
GRANT SELECT ON eitje_sales_aggregated TO service_role;
GRANT SELECT ON eitje_sales_aggregated TO anon;

