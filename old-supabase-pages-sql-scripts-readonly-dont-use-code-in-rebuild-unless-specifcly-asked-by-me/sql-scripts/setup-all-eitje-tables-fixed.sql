-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-all-eitje-tables-fixed.sql

-- COMPLETE EITJE DATABASE TABLES SETUP (FIXED VERSION)
-- Run this in your Supabase SQL Editor to create all Eitje tables

-- ========================================
-- STEP 1: MASTER DATA TABLES
-- ========================================

-- 1. ENVIRONMENTS TABLE (Locations/Venues)
CREATE TABLE IF NOT EXISTS eitje_environments (
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

-- 2. TEAMS TABLE (Teams within environments) - NO FOREIGN KEY CONSTRAINT
CREATE TABLE IF NOT EXISTS eitje_teams (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    environment_id INTEGER, -- No foreign key constraint to avoid dependency issues
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USERS TABLE (Employee information)
CREATE TABLE IF NOT EXISTS eitje_users (
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

-- 4. SHIFT TYPES TABLE (Available shift types)
CREATE TABLE IF NOT EXISTS eitje_shift_types (
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

-- ========================================
-- STEP 2: LABOR/HOURS DATA TABLES (PRIMARY FOCUS)
-- ========================================

-- 5. TIME REGISTRATION SHIFTS RAW (Actual worked shifts with clock-in/out)
CREATE TABLE IF NOT EXISTS eitje_time_registration_shifts_raw (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 6. PLANNING SHIFTS RAW (Planned/scheduled shifts)
CREATE TABLE IF NOT EXISTS eitje_planning_shifts_raw (
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
    break_minutes_planned INTEGER DEFAULT 0,
    
    -- Hours fields
    hours_planned DECIMAL(5,2),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(eitje_id, date, user_id)
);

-- 7. HOURS AGGREGATED (Daily aggregated labor metrics)
CREATE TABLE IF NOT EXISTS eitje_hours_aggregated (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    environment_id INTEGER,
    team_id INTEGER,
    
    -- Hours metrics
    total_hours_worked DECIMAL(8,2) DEFAULT 0,
    total_hours_planned DECIMAL(8,2) DEFAULT 0,
    total_hours_difference DECIMAL(8,2) DEFAULT 0,
    
    -- Cost metrics
    total_wage_cost DECIMAL(12,2) DEFAULT 0,
    total_planned_cost DECIMAL(12,2) DEFAULT 0,
    total_cost_difference DECIMAL(12,2) DEFAULT 0,
    
    -- Break metrics
    total_breaks_minutes INTEGER DEFAULT 0,
    total_planned_breaks_minutes INTEGER DEFAULT 0,
    
    -- Employee metrics
    employee_count INTEGER DEFAULT 0,
    shift_count INTEGER DEFAULT 0,
    planned_shift_count INTEGER DEFAULT 0,
    
    -- Average metrics
    avg_hours_per_employee DECIMAL(5,2) DEFAULT 0,
    avg_wage_cost_per_hour DECIMAL(8,2) DEFAULT 0,
    avg_cost_per_employee DECIMAL(10,2) DEFAULT 0,
    
    -- Efficiency metrics
    hours_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    cost_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per date/environment/team
    UNIQUE(date, environment_id, team_id)
);

-- ========================================
-- STEP 3: REVENUE DATA TABLES (PREPARED)
-- ========================================

-- 8. REVENUE DAYS RAW (Daily revenue per environment)
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

-- 9. REVENUE AGGREGATED (Aggregated revenue metrics)
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

-- ========================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Master data indexes
CREATE INDEX IF NOT EXISTS idx_eitje_environments_eitje_id ON eitje_environments(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_environments_active ON eitje_environments(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_eitje_id ON eitje_teams(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_environment ON eitje_teams(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_active ON eitje_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_users_eitje_id ON eitje_users(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_users_active ON eitje_users(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_shift_types_eitje_id ON eitje_shift_types(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_shift_types_active ON eitje_shift_types(is_active);

-- Labor data indexes
CREATE INDEX IF NOT EXISTS idx_time_registration_eitje_id ON eitje_time_registration_shifts_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_date ON eitje_time_registration_shifts_raw(date);
CREATE INDEX IF NOT EXISTS idx_time_registration_user ON eitje_time_registration_shifts_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_team ON eitje_time_registration_shifts_raw(team_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_environment ON eitje_time_registration_shifts_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_date_env ON eitje_time_registration_shifts_raw(date, environment_id);

CREATE INDEX IF NOT EXISTS idx_planning_eitje_id ON eitje_planning_shifts_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_planning_date ON eitje_planning_shifts_raw(date);
CREATE INDEX IF NOT EXISTS idx_planning_user ON eitje_planning_shifts_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_team ON eitje_planning_shifts_raw(team_id);
CREATE INDEX IF NOT EXISTS idx_planning_environment ON eitje_planning_shifts_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_planning_date_env ON eitje_planning_shifts_raw(date, environment_id);

CREATE INDEX IF NOT EXISTS idx_hours_aggregated_date ON eitje_hours_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_environment ON eitje_hours_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_team ON eitje_hours_aggregated(team_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_date_env ON eitje_hours_aggregated(date, environment_id);

-- Revenue data indexes
CREATE INDEX IF NOT EXISTS idx_revenue_days_eitje_id ON eitje_revenue_days_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_revenue_days_date ON eitje_revenue_days_raw(date);
CREATE INDEX IF NOT EXISTS idx_revenue_days_environment ON eitje_revenue_days_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_revenue_days_date_env ON eitje_revenue_days_raw(date, environment_id);

CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_date ON eitje_revenue_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_environment ON eitje_revenue_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_revenue_aggregated_date_env ON eitje_revenue_aggregated(date, environment_id);

-- ========================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE eitje_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_time_registration_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_planning_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_hours_aggregated ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_days_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_aggregated ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: CREATE RLS POLICIES
-- ========================================

-- Master data policies
CREATE POLICY "Allow authenticated read access to environments" ON eitje_environments
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to environments" ON eitje_environments
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to environments" ON eitje_environments
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to teams" ON eitje_teams
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to teams" ON eitje_teams
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to teams" ON eitje_teams
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to users" ON eitje_users
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to users" ON eitje_users
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to users" ON eitje_users
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to shift types" ON eitje_shift_types
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to shift types" ON eitje_shift_types
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to shift types" ON eitje_shift_types
    FOR SELECT USING (auth.role() = 'anon');

-- Labor data policies
CREATE POLICY "Allow authenticated read access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to planning shifts" ON eitje_planning_shifts_raw
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to planning shifts" ON eitje_planning_shifts_raw
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to planning shifts" ON eitje_planning_shifts_raw
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to hours aggregated" ON eitje_hours_aggregated
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to hours aggregated" ON eitje_hours_aggregated
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to hours aggregated" ON eitje_hours_aggregated
    FOR SELECT USING (auth.role() = 'anon');

-- Revenue data policies
CREATE POLICY "Allow authenticated read access to revenue days" ON eitje_revenue_days_raw
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to revenue days" ON eitje_revenue_days_raw
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to revenue days" ON eitje_revenue_days_raw
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow authenticated read access to revenue aggregated" ON eitje_revenue_aggregated
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role full access to revenue aggregated" ON eitje_revenue_aggregated
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow anon read access to revenue aggregated" ON eitje_revenue_aggregated
    FOR SELECT USING (auth.role() = 'anon');

-- ========================================
-- STEP 7: CREATE UPDATED_AT TRIGGERS
-- ========================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_eitje_environments_updated_at 
    BEFORE UPDATE ON eitje_environments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eitje_teams_updated_at 
    BEFORE UPDATE ON eitje_teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eitje_users_updated_at 
    BEFORE UPDATE ON eitje_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eitje_shift_types_updated_at 
    BEFORE UPDATE ON eitje_shift_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_registration_updated_at 
    BEFORE UPDATE ON eitje_time_registration_shifts_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_updated_at 
    BEFORE UPDATE ON eitje_planning_shifts_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hours_aggregated_updated_at 
    BEFORE UPDATE ON eitje_hours_aggregated 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_days_updated_at 
    BEFORE UPDATE ON eitje_revenue_days_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_aggregated_updated_at 
    BEFORE UPDATE ON eitje_revenue_aggregated 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 8: VERIFY TABLES CREATED
-- ========================================

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name LIKE 'eitje_%'
ORDER BY table_name, ordinal_position;

-- Show table summary
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name LIKE 'eitje_%'
GROUP BY table_name
ORDER BY table_name;

