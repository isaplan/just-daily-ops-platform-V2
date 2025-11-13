-- INTEGRATED SALES DATA TABLE - EXTREME DEFENSIVE MODE
-- 
-- This table stores sales data from multiple sources (Bork, Eitje, etc.)
-- with comprehensive validation and indexing for performance.

-- Create integrated sales data table
CREATE TABLE IF NOT EXISTS integrated_sales_data (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('bork', 'eitje')),
    location_id UUID NOT NULL,
    date DATE NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    category TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_excl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_incl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- DEFENSIVE: Add constraints for data integrity
    CONSTRAINT positive_quantity CHECK (quantity >= 0),
    CONSTRAINT positive_price CHECK (price >= 0),
    CONSTRAINT positive_revenue CHECK (revenue >= 0),
    CONSTRAINT valid_vat_rate CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT valid_date CHECK (date >= '2020-01-01' AND date <= '2030-12-31')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrated_sales_source ON integrated_sales_data(source);
CREATE INDEX IF NOT EXISTS idx_integrated_sales_location ON integrated_sales_data(location_id);
CREATE INDEX IF NOT EXISTS idx_integrated_sales_date ON integrated_sales_data(date);
CREATE INDEX IF NOT EXISTS idx_integrated_sales_created ON integrated_sales_data(created_at);
CREATE INDEX IF NOT EXISTS idx_integrated_sales_source_location_date ON integrated_sales_data(source, location_id, date);

-- Enable RLS
ALTER TABLE integrated_sales_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access to integrated sales data"
ON integrated_sales_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service_role full access to integrated sales data"
ON integrated_sales_data FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read access to integrated sales data"
ON integrated_sales_data FOR SELECT
TO anon
USING (true);

-- Create function to create integrated sales table (for RPC calls)
CREATE OR REPLACE FUNCTION create_integrated_sales_table()
RETURNS TEXT AS $$
BEGIN
    -- This function is called by the application to ensure the table exists
    -- The table creation is handled above, so this just returns success
    RETURN 'Integrated sales data table is ready';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create aggregated view for integrated data
CREATE OR REPLACE VIEW integrated_sales_aggregated AS
SELECT 
    source,
    location_id,
    date,
    COUNT(*) as total_records,
    SUM(quantity) as total_quantity,
    SUM(revenue) as total_revenue,
    SUM(revenue_excl_vat) as total_revenue_excl_vat,
    SUM(revenue_incl_vat) as total_revenue_incl_vat,
    SUM(vat_amount) as total_vat_amount,
    AVG(price) as avg_price,
    COUNT(DISTINCT product_name) as unique_products,
    COUNT(DISTINCT category) as unique_categories,
    MAX(created_at) as last_updated
FROM integrated_sales_data
GROUP BY source, location_id, date
ORDER BY date DESC, source, location_id;

-- Create function to get aggregation status
CREATE OR REPLACE FUNCTION get_integration_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'bork_active', EXISTS(SELECT 1 FROM integrated_sales_data WHERE source = 'bork' LIMIT 1),
        'eitje_active', EXISTS(SELECT 1 FROM integrated_sales_data WHERE source = 'eitje' LIMIT 1),
        'total_records', (SELECT COUNT(*) FROM integrated_sales_data),
        'last_bork_update', (SELECT MAX(created_at) FROM integrated_sales_data WHERE source = 'bork'),
        'last_eitje_update', (SELECT MAX(created_at) FROM integrated_sales_data WHERE source = 'eitje'),
        'total_revenue', (SELECT SUM(revenue) FROM integrated_sales_data),
        'date_range', json_build_object(
            'earliest', (SELECT MIN(date) FROM integrated_sales_data),
            'latest', (SELECT MAX(date) FROM integrated_sales_data)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
