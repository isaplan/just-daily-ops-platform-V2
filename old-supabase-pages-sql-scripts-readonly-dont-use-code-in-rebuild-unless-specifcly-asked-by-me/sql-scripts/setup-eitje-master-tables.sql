-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/setup-eitje-master-tables.sql

-- EITJE MASTER DATA TABLES
-- Run this in your Supabase SQL Editor

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

-- 2. TEAMS TABLE (Teams within environments)
CREATE TABLE IF NOT EXISTS eitje_teams (
    id SERIAL PRIMARY KEY,
    eitje_id INTEGER NOT NULL UNIQUE,
    environment_id INTEGER REFERENCES eitje_environments(eitje_id),
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

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_eitje_environments_eitje_id ON eitje_environments(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_environments_active ON eitje_environments(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_eitje_id ON eitje_teams(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_environment ON eitje_teams(environment_id);
CREATE INDEX IF NOT EXISTS idx_eitje_teams_active ON eitje_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_users_eitje_id ON eitje_users(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_users_active ON eitje_users(is_active);
CREATE INDEX IF NOT EXISTS idx_eitje_shift_types_eitje_id ON eitje_shift_types(eitje_id);
CREATE INDEX IF NOT EXISTS idx_eitje_shift_types_active ON eitje_shift_types(is_active);

-- CREATE RLS POLICIES
ALTER TABLE eitje_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_shift_types ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR ENVIRONMENTS
CREATE POLICY "Allow authenticated read access to environments" ON eitje_environments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to environments" ON eitje_environments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to environments" ON eitje_environments
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR TEAMS
CREATE POLICY "Allow authenticated read access to teams" ON eitje_teams
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to teams" ON eitje_teams
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to teams" ON eitje_teams
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR USERS
CREATE POLICY "Allow authenticated read access to users" ON eitje_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to users" ON eitje_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to users" ON eitje_users
    FOR SELECT USING (auth.role() = 'anon');

-- RLS POLICIES FOR SHIFT TYPES
CREATE POLICY "Allow authenticated read access to shift types" ON eitje_shift_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to shift types" ON eitje_shift_types
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to shift types" ON eitje_shift_types
    FOR SELECT USING (auth.role() = 'anon');

-- CREATE UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- VERIFY TABLES CREATED
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('eitje_environments', 'eitje_teams', 'eitje_users', 'eitje_shift_types')
ORDER BY table_name, ordinal_position;

