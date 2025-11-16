-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-eitje-aggregated-tables.sql

-- Create Eitje aggregated tables for Daily Ops dashboard
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS eitje_labor_hours_aggregated CASCADE;
DROP TABLE IF EXISTS eitje_revenue_days_aggregated CASCADE;

-- Create labor hours aggregated table
CREATE TABLE eitje_labor_hours_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER NOT NULL,
    total_hours_worked DECIMAL(10,2) DEFAULT 0,
    total_wage_cost DECIMAL(10,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for upsert
    UNIQUE(date, environment_id)
);

-- Create revenue days aggregated table
CREATE TABLE eitje_revenue_days_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER NOT NULL,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for upsert
    UNIQUE(date, environment_id)
);

-- Create indexes for better performance
CREATE INDEX idx_eitje_labor_hours_date ON eitje_labor_hours_aggregated(date);
CREATE INDEX idx_eitje_labor_hours_env ON eitje_labor_hours_aggregated(environment_id);
CREATE INDEX idx_eitje_revenue_days_date ON eitje_revenue_days_aggregated(date);
CREATE INDEX idx_eitje_revenue_days_env ON eitje_revenue_days_aggregated(environment_id);

-- Enable RLS
ALTER TABLE eitje_labor_hours_aggregated ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_days_aggregated ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now)
CREATE POLICY "Allow all operations on eitje_labor_hours_aggregated" ON eitje_labor_hours_aggregated FOR ALL USING (true);
CREATE POLICY "Allow all operations on eitje_revenue_days_aggregated" ON eitje_revenue_days_aggregated FOR ALL USING (true);