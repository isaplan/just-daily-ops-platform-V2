-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-eitje-tables-minimal.sql

-- MINIMAL EITJE TABLES SETUP
-- Run this in your Supabase SQL Editor

-- Drop existing tables first
DROP TABLE IF EXISTS eitje_revenue_aggregated CASCADE;
DROP TABLE IF EXISTS eitje_revenue_days_raw CASCADE;
DROP TABLE IF EXISTS eitje_hours_aggregated CASCADE;
DROP TABLE IF EXISTS eitje_planning_shifts_raw CASCADE;
DROP TABLE IF EXISTS eitje_time_registration_shifts_raw CASCADE;
DROP TABLE IF EXISTS eitje_shift_types CASCADE;
DROP TABLE IF EXISTS eitje_users CASCADE;
DROP TABLE IF EXISTS eitje_teams CASCADE;
DROP TABLE IF EXISTS eitje_environments CASCADE;

-- Create master data tables
CREATE TABLE eitje_environments (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE eitje_teams (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    environment_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE eitje_users (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    employee_number VARCHAR(50),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE eitje_shift_types (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_hours DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create labor data tables (MAIN FOCUS)
CREATE TABLE eitje_time_registration_shifts_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_actual INTEGER DEFAULT 0,
    hours_worked DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    wage_cost DECIMAL(10,2),
    costs JSONB,
    status VARCHAR(50),
    skill_set VARCHAR(100),
    shift_type VARCHAR(100),
    notes TEXT,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(eitje_id, date, user_id)
);

CREATE TABLE eitje_planning_shifts_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    user_id INTEGER,
    team_id INTEGER,
    environment_id INTEGER,
    date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    break_minutes_planned INTEGER DEFAULT 0,
    hours_planned DECIMAL(5,2),
    hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    wage_cost DECIMAL(10,2),
    costs JSONB,
    status VARCHAR(50),
    skill_set VARCHAR(100),
    shift_type VARCHAR(100),
    notes TEXT,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(eitje_id, date, user_id)
);

CREATE TABLE eitje_hours_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER,
    team_id INTEGER,
    total_hours_worked DECIMAL(8,2) DEFAULT 0,
    total_hours_planned DECIMAL(8,2) DEFAULT 0,
    total_hours_difference DECIMAL(8,2) DEFAULT 0,
    total_wage_cost DECIMAL(12,2) DEFAULT 0,
    total_planned_cost DECIMAL(12,2) DEFAULT 0,
    total_cost_difference DECIMAL(12,2) DEFAULT 0,
    total_breaks_minutes INTEGER DEFAULT 0,
    total_planned_breaks_minutes INTEGER DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    shift_count INTEGER DEFAULT 0,
    planned_shift_count INTEGER DEFAULT 0,
    avg_hours_per_employee DECIMAL(5,2) DEFAULT 0,
    avg_wage_cost_per_hour DECIMAL(8,2) DEFAULT 0,
    avg_cost_per_employee DECIMAL(10,2) DEFAULT 0,
    hours_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    cost_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, environment_id, team_id)
);

-- Create revenue data tables (PREPARED)
CREATE TABLE eitje_revenue_days_raw (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL,
    environment_id INTEGER,
    date DATE NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
    revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(10,2) DEFAULT 0,
    cash_revenue DECIMAL(12,2) DEFAULT 0,
    card_revenue DECIMAL(12,2) DEFAULT 0,
    digital_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(eitje_id, date, environment_id)
);

CREATE TABLE eitje_revenue_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue_excl_vat DECIMAL(12,2) DEFAULT 0,
    total_revenue_incl_vat DECIMAL(12,2) DEFAULT 0,
    total_vat_amount DECIMAL(12,2) DEFAULT 0,
    avg_vat_rate DECIMAL(5,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(10,2) DEFAULT 0,
    max_transaction_value DECIMAL(10,2) DEFAULT 0,
    min_transaction_value DECIMAL(10,2) DEFAULT 0,
    total_cash_revenue DECIMAL(12,2) DEFAULT 0,
    total_card_revenue DECIMAL(12,2) DEFAULT 0,
    total_digital_revenue DECIMAL(12,2) DEFAULT 0,
    total_other_revenue DECIMAL(12,2) DEFAULT 0,
    cash_percentage DECIMAL(5,2) DEFAULT 0,
    card_percentage DECIMAL(5,2) DEFAULT 0,
    digital_percentage DECIMAL(5,2) DEFAULT 0,
    other_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, environment_id)
);

-- Verify tables created
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name LIKE 'eitje_%'
GROUP BY table_name
ORDER BY table_name;

