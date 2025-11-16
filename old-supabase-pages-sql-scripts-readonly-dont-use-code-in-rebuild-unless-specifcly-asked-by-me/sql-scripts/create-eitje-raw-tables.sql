-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-eitje-raw-tables.sql

-- =====================================================
-- EITJE RAW DATA TABLES - STANDALONE SQL FILE
-- =====================================================
-- Create raw tables for Eitje endpoints to store synchronized data
-- These tables store the raw API responses before aggregation
-- 
-- USAGE: Copy and paste this entire file into Supabase SQL Editor
-- 
-- This file creates the missing raw tables that Eitje sync needs:
-- - eitje_time_registration_shifts_raw
-- - eitje_planning_shifts_raw  
-- - eitje_revenue_days_raw
-- - eitje_availability_shifts_raw
-- - eitje_leave_requests_raw
-- - eitje_events_raw

-- =====================================================
-- DROP EXISTING TABLES (IF ANY)
-- =====================================================

DROP TABLE IF EXISTS public.eitje_events_raw CASCADE;
DROP TABLE IF EXISTS public.eitje_leave_requests_raw CASCADE;
DROP TABLE IF EXISTS public.eitje_availability_shifts_raw CASCADE;
DROP TABLE IF EXISTS public.eitje_revenue_days_raw CASCADE;
DROP TABLE IF EXISTS public.eitje_planning_shifts_raw CASCADE;
DROP TABLE IF EXISTS public.eitje_time_registration_shifts_raw CASCADE;

-- =====================================================
-- CREATE RAW TABLES
-- =====================================================

-- 1. TIME REGISTRATION SHIFTS RAW (Actual worked shifts with clock-in/out)
CREATE TABLE public.eitje_time_registration_shifts_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Time fields (multiple naming conventions supported)
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Break fields
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_actual INTEGER DEFAULT 0,
    
    -- Hours fields
    hours_worked DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    
    -- Cost fields
    wage_cost DECIMAL(10,2),
    costs JSONB,
    
    -- Metadata
    status VARCHAR(50),
    skill_set VARCHAR(100),
    shift_type VARCHAR(100),
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 2. PLANNING SHIFTS RAW (Planned/scheduled shifts)
CREATE TABLE public.eitje_planning_shifts_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Time fields
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Break fields
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_actual INTEGER DEFAULT 0,
    
    -- Hours fields
    planned_hours DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    
    -- Cost fields
    planned_cost DECIMAL(10,2),
    wage_cost DECIMAL(10,2),
    costs JSONB,
    
    -- Status fields
    status VARCHAR(50) DEFAULT 'planned',
    confirmed BOOLEAN DEFAULT false,
    cancelled BOOLEAN DEFAULT false,
    
    -- Metadata
    skill_set VARCHAR(100),
    shift_type VARCHAR(100),
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 3. REVENUE DAYS RAW (Daily revenue data)
CREATE TABLE public.eitje_revenue_days_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Revenue fields
    total_revenue DECIMAL(12,2),
    revenue DECIMAL(12,2),
    net_revenue DECIMAL(12,2),
    gross_revenue DECIMAL(12,2),
    
    -- Transaction fields
    transaction_count INTEGER,
    transaction_count_total INTEGER,
    
    -- Payment method fields
    cash_revenue DECIMAL(12,2),
    card_revenue DECIMAL(12,2),
    digital_revenue DECIMAL(12,2),
    
    -- VAT fields
    vat_amount DECIMAL(12,2),
    vat_percentage DECIMAL(5,2),
    
    -- Metadata
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50),
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, environment_id)
);

-- 4. AVAILABILITY SHIFTS RAW (Employee availability)
CREATE TABLE public.eitje_availability_shifts_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Time fields
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Availability fields
    available BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'available',
    
    -- Metadata
    skill_set VARCHAR(100),
    shift_type VARCHAR(100),
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 5. LEAVE REQUESTS RAW (Employee leave requests)
CREATE TABLE public.eitje_leave_requests_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Leave fields
    start_date DATE,
    end_date DATE,
    leave_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    approved BOOLEAN DEFAULT false,
    
    -- Metadata
    reason TEXT,
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 6. EVENTS RAW (Company events)
CREATE TABLE public.eitje_events_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    environment_id INTEGER,
    date DATE NOT NULL,
    
    -- Event fields
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    
    -- Metadata
    location VARCHAR(255),
    notes TEXT,
    
    -- Raw data storage
    raw_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, environment_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Time registration shifts raw indexes
CREATE INDEX idx_eitje_time_registration_shifts_raw_date ON public.eitje_time_registration_shifts_raw(date);
CREATE INDEX idx_eitje_time_registration_shifts_raw_environment ON public.eitje_time_registration_shifts_raw(environment_id);
CREATE INDEX idx_eitje_time_registration_shifts_raw_team ON public.eitje_time_registration_shifts_raw(team_id);
CREATE INDEX idx_eitje_time_registration_shifts_raw_user ON public.eitje_time_registration_shifts_raw(user_id);
CREATE INDEX idx_eitje_time_registration_shifts_raw_date_env ON public.eitje_time_registration_shifts_raw(date, environment_id);

-- Planning shifts raw indexes
CREATE INDEX idx_eitje_planning_shifts_raw_date ON public.eitje_planning_shifts_raw(date);
CREATE INDEX idx_eitje_planning_shifts_raw_environment ON public.eitje_planning_shifts_raw(environment_id);
CREATE INDEX idx_eitje_planning_shifts_raw_team ON public.eitje_planning_shifts_raw(team_id);
CREATE INDEX idx_eitje_planning_shifts_raw_user ON public.eitje_planning_shifts_raw(user_id);
CREATE INDEX idx_eitje_planning_shifts_raw_date_env ON public.eitje_planning_shifts_raw(date, environment_id);

-- Revenue days raw indexes
CREATE INDEX idx_eitje_revenue_days_raw_date ON public.eitje_revenue_days_raw(date);
CREATE INDEX idx_eitje_revenue_days_raw_environment ON public.eitje_revenue_days_raw(environment_id);
CREATE INDEX idx_eitje_revenue_days_raw_date_env ON public.eitje_revenue_days_raw(date, environment_id);

-- Availability shifts raw indexes
CREATE INDEX idx_eitje_availability_shifts_raw_date ON public.eitje_availability_shifts_raw(date);
CREATE INDEX idx_eitje_availability_shifts_raw_environment ON public.eitje_availability_shifts_raw(environment_id);
CREATE INDEX idx_eitje_availability_shifts_raw_team ON public.eitje_availability_shifts_raw(team_id);
CREATE INDEX idx_eitje_availability_shifts_raw_user ON public.eitje_availability_shifts_raw(user_id);

-- Leave requests raw indexes
CREATE INDEX idx_eitje_leave_requests_raw_date ON public.eitje_leave_requests_raw(date);
CREATE INDEX idx_eitje_leave_requests_raw_environment ON public.eitje_leave_requests_raw(environment_id);
CREATE INDEX idx_eitje_leave_requests_raw_team ON public.eitje_leave_requests_raw(team_id);
CREATE INDEX idx_eitje_leave_requests_raw_user ON public.eitje_leave_requests_raw(user_id);

-- Events raw indexes
CREATE INDEX idx_eitje_events_raw_date ON public.eitje_events_raw(date);
CREATE INDEX idx_eitje_events_raw_environment ON public.eitje_events_raw(environment_id);
CREATE INDEX idx_eitje_events_raw_date_env ON public.eitje_events_raw(date, environment_id);

-- =====================================================
-- ROW-LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.eitje_time_registration_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_planning_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_revenue_days_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_availability_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_leave_requests_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eitje_events_raw ENABLE ROW LEVEL SECURITY;

-- Time registration shifts raw policies
CREATE POLICY "Allow authenticated read access to eitje time registration shifts raw" ON public.eitje_time_registration_shifts_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje time registration shifts raw" ON public.eitje_time_registration_shifts_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje time registration shifts raw" ON public.eitje_time_registration_shifts_raw
    FOR SELECT TO anon USING (true);

-- Planning shifts raw policies
CREATE POLICY "Allow authenticated read access to eitje planning shifts raw" ON public.eitje_planning_shifts_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje planning shifts raw" ON public.eitje_planning_shifts_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje planning shifts raw" ON public.eitje_planning_shifts_raw
    FOR SELECT TO anon USING (true);

-- Revenue days raw policies
CREATE POLICY "Allow authenticated read access to eitje revenue days raw" ON public.eitje_revenue_days_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje revenue days raw" ON public.eitje_revenue_days_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje revenue days raw" ON public.eitje_revenue_days_raw
    FOR SELECT TO anon USING (true);

-- Availability shifts raw policies
CREATE POLICY "Allow authenticated read access to eitje availability shifts raw" ON public.eitje_availability_shifts_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje availability shifts raw" ON public.eitje_availability_shifts_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje availability shifts raw" ON public.eitje_availability_shifts_raw
    FOR SELECT TO anon USING (true);

-- Leave requests raw policies
CREATE POLICY "Allow authenticated read access to eitje leave requests raw" ON public.eitje_leave_requests_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje leave requests raw" ON public.eitje_leave_requests_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje leave requests raw" ON public.eitje_leave_requests_raw
    FOR SELECT TO anon USING (true);

-- Events raw policies
CREATE POLICY "Allow authenticated read access to eitje events raw" ON public.eitje_events_raw
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access to eitje events raw" ON public.eitje_events_raw
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow anon read access to eitje events raw" ON public.eitje_events_raw
    FOR SELECT TO anon USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Time registration shifts raw trigger
CREATE TRIGGER update_eitje_time_registration_shifts_raw_updated_at BEFORE UPDATE ON public.eitje_time_registration_shifts_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planning shifts raw trigger
CREATE TRIGGER update_eitje_planning_shifts_raw_updated_at BEFORE UPDATE ON public.eitje_planning_shifts_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Revenue days raw trigger
CREATE TRIGGER update_eitje_revenue_days_raw_updated_at BEFORE UPDATE ON public.eitje_revenue_days_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Availability shifts raw trigger
CREATE TRIGGER update_eitje_availability_shifts_raw_updated_at BEFORE UPDATE ON public.eitje_availability_shifts_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leave requests raw trigger
CREATE TRIGGER update_eitje_leave_requests_raw_updated_at BEFORE UPDATE ON public.eitje_leave_requests_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events raw trigger
CREATE TRIGGER update_eitje_events_raw_updated_at BEFORE UPDATE ON public.eitje_events_raw
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that all tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'eitje_%_raw'
ORDER BY table_name;

-- Check table structures
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'eitje_time_registration_shifts_raw'
ORDER BY ordinal_position;


