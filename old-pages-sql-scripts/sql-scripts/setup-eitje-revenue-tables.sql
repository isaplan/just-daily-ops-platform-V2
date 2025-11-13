-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-eitje-revenue-tables.sql

-- EITJE REVENUE DATA TABLES (PREPARED FOR FUTURE USE)
-- Run this in your Supabase SQL Editor

-- 1. REVENUE DAYS RAW (Daily revenue per environment)
CREATE TABLE IF NOT EXISTS eitje_revenue_days_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Revenue fields
    total_revenue DECIMAL(12,2) DEFAULT 0,
    revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
    revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Transaction fields
    transaction_count INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(10,2) DEFAULT 0,
    
    -- Payment method fields
    cash_revenue DECIMAL(12,2) DEFAULT 0,
    card_revenue DECIMAL(12,2) DEFAULT 0,
    digital_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, environment_id)
);

-- 2. REVENUE AGGREGATED (Aggregated revenue metrics)
CREATE TABLE IF NOT EXISTS eitje_revenue_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
    total_revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
    total_vat_amount DECIMAL(12,2) DEFAULT 0,
    avg_vat_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Transaction metrics
    total_transactions INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(10,2) DEFAULT 0,
    max_transaction_value DECIMAL(10,2) DEFAULT 0,
    min_transaction_value DECIMAL(10,2) DEFAULT 0,
    
    -- Payment method metrics
    total_cash_revenue DECIMAL(12,2) DEFAULT 0,
    total_card_revenue DECIMAL(12,2) DEFAULT 0,
    total_digital_revenue DECIMAL(12,2) DEFAULT 0,
    total_other_revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Percentage metrics
    cash_percentage DECIMAL(5,2) DEFAULT 0,
    card_percentage DECIMAL(5,2) DEFAULT 0,
    digital_percentage DECIMAL(5,2) DEFAULT 0,
    other_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per date/environment
    UNIQUE(date, environment_id)
);

-- CREATE INDEXES FOR PERFORMANCE
-- Revenue days raw indexes
CREATE INDEX IF NOT EXISTS idx_revenue_days_eitje_id ON eitje_revenue_days_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_revenue_days_date ON eitje_revenue_days_raw(date);
CREATE INDEX IF NOT EXISTS idx_revenue_days_environment ON eitje_revenue_days_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_revenue_days_date_env ON eitje_revenue_days_raw(date, environment_id);

-- Revenue aggregated indexes
CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_date ON eitje_revenue_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_environment ON eitje_revenue_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_date_env ON eitje_revenue_aggregated(date, environment_id);

-- CREATE RLS POLICIES
ALTER TABLE eitje_revenue_days_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_aggregated ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR REVENUE DAYS RAW
CREATE POLICY "Allow authenticated read access to revenue days" ON eitje_revenue_days_raw
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to revenue days" ON eitje_revenue_days_raw
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to revenue days" ON eitje_revenue_days_raw
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR REVENUE AGGREGATED
CREATE POLICY "Allow authenticated read access to revenue aggregated" ON eitje_revenue_aggregated
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to revenue aggregated" ON eitje_revenue_aggregated
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to revenue aggregated" ON eitje_revenue_aggregated
    FOR SELECT USING (auth.role() = 'anon');

-- CREATE UPDATED_AT TRIGGERS
CREATE TRIGGER update_revenue_days_updated_at 
    BEFORE UPDATE ON eitje_revenue_days_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_aggregated_updated_at 
    BEFORE UPDATE ON eitje_revenue_aggregated 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFY TABLES CREATED
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('eitje_revenue_days_raw', 'eitje_revenue_aggregated')
ORDER BY table_name, ordinal_position;

