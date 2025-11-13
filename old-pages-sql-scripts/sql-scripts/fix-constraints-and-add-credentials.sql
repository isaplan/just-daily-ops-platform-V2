-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/fix-constraints-and-add-credentials.sql

-- COMPLETE FIX FOR API_CREDENTIALS TABLE WITH CONSTRAINTS
-- Run this in your Supabase SQL Editor

-- Step 1: Check what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_credentials' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing columns safely
DO $$ 
BEGIN
    -- Add base_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'base_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN base_url TEXT;
        RAISE NOTICE 'Added base_url column';
    END IF;
    
    -- Add additional_config column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'additional_config'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN additional_config JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added additional_config column';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    END IF;
    
    -- Add last_sync_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'last_sync_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN last_sync_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_sync_at column';
    END IF;
    
    -- Add created_by_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'created_by_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN created_by_user_id UUID;
        RAISE NOTICE 'Added created_by_user_id column';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_credentials' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Step 3: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_provider_location' 
        AND table_name = 'api_credentials'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE api_credentials ADD CONSTRAINT unique_provider_location UNIQUE (provider, location_id);
        RAISE NOTICE 'Added unique constraint on (provider, location_id)';
    END IF;
END $$;

-- Step 4: Verify all columns exist now
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_credentials' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Insert Eitje credentials (replace with your real values)
INSERT INTO api_credentials (
    provider,
    location_id,
    api_key,
    base_url,
    additional_config,
    is_active,
    created_at,
    updated_at
) VALUES (
    'eitje',
    NULL,
    'YOUR_REAL_EITJE_API_KEY',
    'https://api.eitje.com',
    '{
        "partner_username": "YOUR_REAL_PARTNER_USERNAME",
        "partner_password": "YOUR_REAL_PARTNER_PASSWORD", 
        "api_username": "YOUR_REAL_API_USERNAME",
        "api_password": "YOUR_REAL_API_PASSWORD",
        "timeout": 30000,
        "retry_attempts": 3,
        "rate_limit": 100
    }'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT (provider, location_id) 
DO UPDATE SET
    api_key = EXCLUDED.api_key,
    base_url = EXCLUDED.base_url,
    additional_config = EXCLUDED.additional_config,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 6: Verify the credentials were inserted
SELECT 
    id,
    provider,
    base_url,
    is_active,
    created_at,
    additional_config->>'partner_username' as partner_username
FROM api_credentials 
WHERE provider = 'eitje' 
AND is_active = true;

