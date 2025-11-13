# API Credentials Database Summary

## Current Credentials in Database

### 1. BORK CREDENTIALS (ACTIVE - 3 locations)
- **Provider**: `bork`
- **Count**: 3 active credentials
- **API Endpoint**: `/api/bork/credentials` ✅ WORKING
- **Usage**: ✅ ACTIVE - Used for sales data aggregation
- **Locations**:
  - ID 1: `550e8400-e29b-41d4-a716-446655440002` - GGRZ28Q3MDRQ2UQ3MDRQ
  - ID 2: `550e8400-e29b-41d4-a716-446655440003` - 7JFC2JUXTGVR2UTXUARY28QX  
  - ID 3: `550e8400-e29b-41d4-a716-446655440001` - 7ARQ28QXMGRQ6UUXTGVW2UQ
- **API Key**: `1f518c6dce0a466d8d0f7c95b0717de4` (same for all)
- **Status**: ✅ ACTIVE AND WORKING

### 2. EITJE CREDENTIALS (ACTIVE - 1 credential)
- **Provider**: `eitje`
- **Count**: 1 active credential (ID: 9)
- **API Endpoint**: `/api/eitje/credentials` ❌ FAILING
- **Usage**: ✅ ACTIVE - Used for labor/hours data
- **Base URL**: `https://open-api.eitje.app/open_api`
- **Authentication**: 4-credential system (Partner-Username, Partner-Password, Api-Username, Api-Password)
- **Status**: ✅ ACTIVE BUT API ENDPOINT NEEDS FIX

### 3. POTENTIAL OTHER PROVIDERS
- **Formitable**: No credentials found
- **Other**: No additional providers detected

## API Endpoints Status

### ✅ WORKING ENDPOINTS
- `/api/bork/credentials` - Returns 3 Bork credentials
- `/api/bork/aggregate` - Sales data aggregation
- `/api/bork/sync` - Data synchronization
- `/api/eitje/connect` - Eitje connection test (works with 4-credential system)

### ❌ FAILING ENDPOINTS  
- `/api/eitje/credentials` - Returns "Failed to fetch credentials"

### 🔧 NEEDS INVESTIGATION
- Database query issue for Eitje credentials
- Possible RLS (Row Level Security) policy issue
- Supabase client configuration issue

## Usage Analysis

### ✅ ACTIVELY USED
1. **Bork API** - Sales data aggregation system
   - 3 locations configured
   - API working correctly
   - Data being aggregated and stored

2. **Eitje API** - Labor/hours data system  
   - 1 credential configured
   - Connection test works
   - Credentials API needs fixing

### ❌ NOT USED
1. **Formitable API** - No credentials found
2. **Other APIs** - No additional providers

## Recommendations

1. **Fix Eitje Credentials API** - Database query issue
2. **Add Formitable Credentials** - If needed for future integration
3. **Monitor Bork Credentials** - Ensure they stay active
4. **Add Credential Management UI** - For easier management

## Database Structure
- **Table**: `api_credentials`
- **Key Fields**: `provider`, `location_id`, `api_key`, `base_url`, `additional_config`, `is_active`
- **RLS Policies**: Need to verify for Eitje provider

