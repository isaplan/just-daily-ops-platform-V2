-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/add-real-eitje-credentials.sql

-- ADD REAL EITJE API CREDENTIALS
-- Run this in your Supabase SQL Editor
-- Replace the placeholder values with your actual Eitje API credentials

-- Insert your real Eitje API credentials
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
    NULL, -- Global credentials (not location-specific)
    'YOUR_REAL_EITJE_API_KEY', -- Replace with your actual API key
    'https://api.eitje.com', -- Replace with actual Eitje API URL
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

-- Verify the credentials were inserted
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

