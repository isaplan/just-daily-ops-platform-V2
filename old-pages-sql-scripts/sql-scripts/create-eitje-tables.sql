-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-eitje-tables.sql

-- Create Eitje database tables with correct schema
-- Run this SQL in Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS eitje_planning_shifts_raw CASCADE;
DROP TABLE IF EXISTS eitje_time_registration_shifts_raw CASCADE;
DROP TABLE IF EXISTS eitje_revenue_days_raw CASCADE;
DROP TABLE IF EXISTS eitje_environments CASCADE;
DROP TABLE IF EXISTS eitje_teams CASCADE;
DROP TABLE IF EXISTS eitje_users CASCADE;
DROP TABLE IF EXISTS eitje_shift_types CASCADE;

-- Create planning shifts table
CREATE TABLE eitje_planning_shifts_raw (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create time registration shifts table
CREATE TABLE eitje_time_registration_shifts_raw (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create revenue days table
CREATE TABLE eitje_revenue_days_raw (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create master data tables
CREATE TABLE eitje_environments (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eitje_teams (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eitje_users (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eitje_shift_types (
  id BIGINT PRIMARY KEY,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE eitje_planning_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_time_registration_shifts_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_days_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_shift_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables (allow all operations for service role)
CREATE POLICY "Allow all access" ON eitje_planning_shifts_raw
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON eitje_planning_shifts_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read access" ON eitje_time_registration_shifts_raw
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_time_registration_shifts_raw
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_time_registration_shifts_raw
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON eitje_revenue_days_raw
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_revenue_days_raw
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_revenue_days_raw
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON eitje_environments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_environments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_environments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON eitje_teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_teams
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_teams
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON eitje_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_users
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON eitje_shift_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access" ON eitje_shift_types
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" ON eitje_shift_types
  FOR UPDATE TO authenticated USING (true);
