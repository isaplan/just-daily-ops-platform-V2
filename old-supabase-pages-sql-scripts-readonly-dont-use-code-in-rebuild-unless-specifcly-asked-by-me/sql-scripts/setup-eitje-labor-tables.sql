-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-eitje-labor-tables.sql

-- EITJE LABOR/HOURS DATA TABLES (PRIMARY FOCUS)
-- Run this in your Supabase SQL Editor

-- 1. TIME REGISTRATION SHIFTS RAW (Actual worked shifts with clock-in/out)
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

-- 2. PLANNING SHIFTS RAW (Planned/scheduled shifts)
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

-- 3. HOURS AGGREGATED (Daily aggregated labor metrics)
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

-- CREATE INDEXES FOR PERFORMANCE
-- Time registration shifts indexes
CREATE INDEX IF NOT EXISTS idx_time_registration_eitje_id ON eitje_time_registration_shifts_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_date ON eitje_time_registration_shifts_raw(date);
CREATE INDEX IF NOT EXISTS idx_time_registration_user ON eitje_time_registration_shifts_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_team ON eitje_time_registration_shifts_raw(team_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_environment ON eitje_time_registration_shifts_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_time_registration_date_env ON eitje_time_registration_shifts_raw(date, environment_id);

-- Planning shifts indexes
CREATE INDEX IF NOT EXISTS idx_planning_eitje_id ON eitje_planning_shifts_raw(eitje_id);
CREATE INDEX IF NOT EXISTS idx_planning_date ON eitje_planning_shifts_raw(date);
CREATE INDEX IF NOT EXISTS idx_planning_user ON eitje_planning_shifts_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_team ON eitje_planning_shifts_raw(team_id);
CREATE INDEX IF NOT EXISTS idx_planning_environment ON eitje_planning_shifts_raw(environment_id);
CREATE INDEX IF NOT EXISTS idx_planning_date_env ON eitje_planning_shifts_raw(date, environment_id);

-- Hours aggregated indexes
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_date ON eitje_hours_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_environment ON eitje_hours_aggregated(environment_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_team ON eitje_hours_aggregated(team_id);
CREATE INDEX IF NOT EXISTS idx_hours_aggregated_date_env ON eitje_hours_aggregated(date, environment_id);

-- CREATE RLS POLICIES
ALTER TABLE eitje_time_registration_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_planning_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_hours_aggregated ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR TIME REGISTRATION SHIFTS
CREATE POLICY "Allow authenticated read access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to time registration shifts" ON eitje_time_registration_shifts_raw
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR PLANNING SHIFTS
CREATE POLICY "Allow authenticated read access to planning shifts" ON eitje_planning_shifts_raw
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to planning shifts" ON eitje_planning_shifts_raw
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to planning shifts" ON eitje_planning_shifts_raw
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR HOURS AGGREGATED
CREATE POLICY "Allow authenticated read access to hours aggregated" ON eitje_hours_aggregated
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to hours aggregated" ON eitje_hours_aggregated
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to hours aggregated" ON eitje_hours_aggregated
    FOR SELECT USING (auth.role() = 'anon');

-- CREATE UPDATED_AT TRIGGERS
CREATE TRIGGER update_time_registration_updated_at 
    BEFORE UPDATE ON eitje_time_registration_shifts_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_updated_at 
    BEFORE UPDATE ON eitje_planning_shifts_raw 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hours_aggregated_updated_at 
    BEFORE UPDATE ON eitje_hours_aggregated 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFY TABLES CREATED
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('eitje_time_registration_shifts_raw', 'eitje_planning_shifts_raw', 'eitje_hours_aggregated')
ORDER BY table_name, ordinal_position;

