# Full Eitje API Endpoints Integration Plan

## Phase 1: Update Core Authentication & Configuration

### 1.1 Update Eitje API Service Authentication
**File**: `src/lib/eitje/api-service.ts`

Update authentication to use 4-credential header system:
- Change from Bearer token to 4 separate headers (Partner-Username, Partner-Password, Api-Username, Api-Password)
- Support both PascalCase and lowercase header formats
- Update `EitjeApiConfig` interface to require `additional_config` with the 4 credentials
- Update `makeRequest` method to use new header authentication
- Add method to test both header formats (auto mode)

### 1.2 Update Base URL in Credentials
**File**: `add-real-eitje-credentials-final.sql`

Update existing credentials SQL to use correct base URL:
- Change base_url from `https://api.eitje.com` to `https://open-api.eitje.app/open_api`
- Keep existing 4 credentials (partner_username, partner_password, api_username, api_password)

### 1.3 Add Build Log Requirement
**File**: `build-log.json`

Add requirement to check `src/lib/finance/api-documentation/EITJE_API_DOCUMENTATION.md` before any Eitje API work.

## Phase 2: Create Database Tables

### 2.1 Master Data Tables (No Date Filtering)
**File**: `setup-eitje-master-tables.sql`

Create tables for master data endpoints:
- `eitje_environments` - Locations/venues
- `eitje_teams` - Teams within environments
- `eitje_users` - Employee information
- `eitje_shift_types` - Available shift types

Each table includes:
- Primary key (id)
- Relevant fields from API response
- `raw_data JSONB` for complete API response
- Standard timestamps (created_at, updated_at)
- RLS policies for authenticated/service_role/anon access

### 2.2 Labor/Hours Data Tables (PRIMARY FOCUS)
**File**: `setup-eitje-labor-tables.sql`

Create tables for labor/hours endpoints:

**Raw Data Tables:**
- `eitje_time_registration_shifts_raw` - Actual worked shifts with clock-in/out
- `eitje_planning_shifts_raw` - Planned/scheduled shifts

Fields based on documentation:
- id, user_id, team_id, environment_id, date
- start_time, end_time, break_minutes
- hours_worked, wage_cost
- status, skill_set, shift_type
- raw_data JSONB (complete API response)

**Aggregated Tables:**
- `eitje_hours_aggregated` - Daily aggregated labor metrics

Aggregated fields:
- date, environment_id
- total_hours_worked, total_planned_hours
- total_wage_cost, total_breaks_minutes
- employee_count, shift_count
- avg_hours_per_employee, avg_wage_cost_per_hour
- created_at, updated_at

### 2.3 Revenue Data Tables (PREPARED)
**File**: `setup-eitje-revenue-tables.sql`

Create tables for revenue endpoint:
- `eitje_revenue_days_raw` - Daily revenue per environment
- `eitje_revenue_aggregated` - Aggregated revenue metrics

## Phase 3: Update Eitje API Service

### 3.1 Add Endpoint Configuration
**File**: `src/lib/eitje/api-service.ts`

Add endpoint configuration based on documentation:
```typescript
export const EITJE_ENDPOINTS = {
  // Master data (no date filtering)
  environments: { path: '/environments', method: 'GET', requiresDates: false },
  teams: { path: '/teams', method: 'GET', requiresDates: false },
  users: { path: '/users', method: 'GET', requiresDates: false },
  shift_types: { path: '/shift_types', method: 'GET', requiresDates: false },
  
  // Labor/hours data (7-day max)
  time_registration_shifts: { 
    path: '/time_registration_shifts', 
    method: 'GET', 
    requiresDates: true, 
    maxDays: 7,
    table: 'eitje_time_registration_shifts_raw'
  },
  planning_shifts: { 
    path: '/planning_shifts', 
    method: 'GET', 
    requiresDates: true, 
    maxDays: 7,
    table: 'eitje_planning_shifts_raw'
  },
  
  // Revenue data (90-day max)
  revenue_days: { 
    path: '/revenue_days', 
    method: 'GET', 
    requiresDates: true, 
    maxDays: 90,
    table: 'eitje_revenue_days_raw'
  }
};
```

### 3.2 Add Date Range Validation
**File**: `src/lib/eitje/api-service.ts`

Add method to validate date ranges based on endpoint limits:
- Check date range doesn't exceed maxDays for endpoint
- Use 6-day chunks for safety margin (not 7)
- Validate date format (YYYY-MM-DD)
- Build proper filter object with date_filter_type

### 3.3 Add Field Mapping Logic
**File**: `src/lib/eitje/api-service.ts`

Add defensive field mapping for shift data:
- Try multiple field name variations (start_time → start → startDateTime)
- Handle nested cost fields (wage_cost vs costs.wage)
- Extract hours from multiple possible fields
- Store complete raw_data for debugging

### 3.4 Add Endpoint-Specific Methods
**File**: `src/lib/eitje/api-service.ts`

Add methods for each endpoint type:
- `fetchMasterData(endpoint)` - For master data endpoints
- `fetchTimeRegistrationShifts(startDate, endDate, environmentId?)` - With 7-day validation
- `fetchPlanningShifts(startDate, endDate, environmentId?)` - With 7-day validation
- `fetchRevenueDays(startDate, endDate, environmentId?)` - With 90-day validation

## Phase 4: Create Endpoint Management UI

### 4.1 Add Endpoints Tab to Settings
**File**: `src/app/(dashboard)/finance/eitje-settings/page.tsx`

Add new "Endpoints" tab with:
- Grid of endpoint cards showing:
  - Endpoint name and description
  - Test status (success/failed/never)
  - Last tested timestamp
  - Data count in database
  - Test button (tests connection and data fetch)
  - Sync button (syncs data to database)
- "Test All Endpoints" button
- Visual status indicators (badges with colors)

### 4.2 Create Endpoint Test API
**File**: `src/app/api/eitje/test-endpoint/route.ts`

POST endpoint that:
- Accepts endpoint name and optional date range
- Gets credentials from database
- Tests endpoint with small date range (1-2 days)
- Returns success/failure, data count, response time
- Handles all errors defensively

### 4.3 Create Endpoint Sync API
**File**: `src/app/api/eitje/sync-endpoint/route.ts`

POST endpoint that:
- Accepts endpoint name and date range
- Validates date range against endpoint limits
- Fetches data from Eitje API
- Applies field mapping logic
- Stores in appropriate raw data table
- Returns sync statistics (records processed, added, errors)

## Phase 5: Create Labor Data Aggregation

### 5.1 Create Aggregation Service
**File**: `src/lib/eitje/labor-aggregation-service.ts`

Service to aggregate labor data:
- Fetch raw time_registration_shifts and planning_shifts
- Calculate daily metrics:
  - Total hours worked vs planned
  - Total wage costs
  - Employee count and shift count
  - Average hours per employee
  - Average wage cost per hour
- Store in `eitje_hours_aggregated` table
- Handle missing data defensively

### 5.2 Create Aggregation API
**File**: `src/app/api/eitje/aggregate-labor/route.ts`

POST endpoint that:
- Accepts date range
- Calls labor aggregation service
- Returns aggregation statistics
- Handles errors defensively

### 5.3 Add Aggregation to Sync Process
**File**: `src/app/api/eitje/sync-endpoint/route.ts`

After syncing labor endpoints, automatically trigger aggregation for those dates.

## Phase 6: Create Labor Dashboard (Optional Enhancement)

### 6.1 Create Labor Metrics Page
**File**: `src/app/(dashboard)/finance/eitje-labor/page.tsx`

Dashboard showing:
- Date range selector
- KPI cards: Total hours, Total cost, Avg cost/hour, Employee count
- Hours worked vs planned chart
- Daily labor cost trend
- Top teams by hours/cost
- Uses `eitje_hours_aggregated` table

## Implementation Notes

### Extreme Defensive Programming Requirements:
1. **All API calls**: Timeout protection (30s), retry logic (3 attempts), rate limiting
2. **All date inputs**: Validate format, validate range limits per endpoint
3. **All data storage**: Try-catch blocks, validate before insert, store raw_data
4. **All field mapping**: Try multiple field names, handle null/undefined, log missing fields
5. **All user inputs**: Validate, sanitize, provide clear error messages

### Testing Strategy:
1. Test master data endpoints first (no date requirements)
2. Test labor endpoints with 1-day range
3. Test labor endpoints with 6-day range (max safe range)
4. Test aggregation with small dataset
5. Test full sync with larger date range

### Critical Date Range Limits:
- time_registration_shifts: 7 days max (use 6 for safety)
- planning_shifts: 7 days max (use 6 for safety)
- revenue_days: 90 days max (use 89 for safety)
- Master data: No date filtering required

### Error Handling Priority:
1. Authentication errors (401) - Check all 4 credentials
2. Date range errors (400) - Reduce date range
3. Rate limit errors (429) - Implement exponential backoff
4. Timeout errors - Retry with smaller date range
5. Data validation errors - Log and continue with valid records

### To-dos
- [ ] Update Eitje API service to use 4-credential header authentication
- [ ] Update credentials SQL to use correct base URL (https://open-api.eitje.app/open_api)
- [ ] Create database tables for master data (environments, teams, users, shift_types)
- [ ] Create database tables for labor data (time_registration_shifts_raw, planning_shifts_raw, eitje_hours_aggregated)
- [ ] Add endpoint configuration with limits and requirements to API service
- [ ] Add date range validation based on endpoint limits (7-day for shifts, 90-day for revenue)
- [ ] Add defensive field mapping logic for shift data with multiple field name variations
- [ ] Add endpoint-specific methods to API service (fetchTimeRegistrationShifts, fetchPlanningShifts, etc.)
- [ ] Add Endpoints management tab to Eitje settings page with test/sync buttons
- [ ] Create API endpoint for testing individual Eitje endpoints
- [ ] Create API endpoint for syncing data from individual Eitje endpoints
- [ ] Create labor data aggregation service to calculate daily metrics
- [ ] Create API endpoint for triggering labor data aggregation
- [ ] Test master data endpoints (environments, teams, users, shift_types)
- [ ] Test labor endpoints with small date ranges (1-6 days)
- [ ] Test labor data aggregation with real data

