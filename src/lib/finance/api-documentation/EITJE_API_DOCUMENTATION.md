# Eitje Open API Documentation

**Source**: Eitje Open API v3 Specification  
**Base URL (Test)**: `https://open-api-test.eitje.app/open_api`  
**Base URL (Production)**: `https://open-api.eitje.app/open_api`

## Authentication

All requests require 4 authentication headers:
- `Partner-Username` (or `partner-username`)
- `Partner-Password` (or `partner-password`)
- `Api-Username` (or `api-username`)
- `Api-Password` (or `api-password`)

Both `PascalCase` and `lowercase` header formats are supported. Use "auto" mode to try both.

## Date Filtering

### Critical Limits

| Filter Type | Max Days | Description |
|------------|----------|-------------|
| `resource_date` | **7 days** | Filter by resource date (e.g., shift date) |
| `updated` | **3 days** | Filter by last update timestamp |

**IMPORTANT**: These limits apply to endpoints that require date ranges:
- `time_registration_shifts`
- `planning_shifts`
- `availability_shifts`
- `leave_requests`
- `events`

### Date Filter Format

```json
{
  "filters": {
    "start_date": "2025-03-01",
    "end_date": "2025-03-04",
    "date_filter_type": "resource_date"  // or "updated"
  }
}
```

- Default filter type: `resource_date`
- For `resource_date`: use simple date format (YYYY-MM-DD)
- For `updated`: can use ISO8601 datetime or simple date
  - Simple date → start-of-day for start_date, end-of-day for end_date
  - Datetime → exact timestamps

## Endpoints

### Master Data (No Date Filtering)

#### Environments
**GET** `/environments`  
Lists all environments (locations/venues) in the organization.

**Response Structure**:
```typescript
interface Environment {
  id: number;
  name: string;
  // ... additional fields in raw_data
}
```

#### Teams
**GET** `/teams`  
Lists all teams within environments (e.g., kitchen, bar).

**Response Structure**:
```typescript
interface Team {
  id: number;
  name: string;
  environment_id?: number;
  // ... additional fields in raw_data
}
```

#### Users
**GET** `/users`  
Lists all users in the organization.

**Response Structure**:
```typescript
interface User {
  id: number;
  name: string;
  email?: string;
  // ... additional fields in raw_data
}
```

#### Shift Types
**GET** `/shift_types`  
Lists available shift types.

**Response Structure**:
```typescript
interface ShiftType {
  id: number;
  name: string;
  // ... additional fields
}
```

### Date-Required Endpoints

#### Time Registration Shifts
**GET** `/time_registration_shifts`  
**Max Days**: 7 (resource_date) or 3 (updated)

Actual worked shifts with clock-in/clock-out times.

**Required Filters**:
```json
{
  "filters": {
    "start_date": "2025-03-01",
    "end_date": "2025-03-07"
  }
}
```

**Response Structure**:
```typescript
interface TimeRegistrationShift {
  id: number;
  user_id: number;
  team_id: number;
  environment_id: number;
  date: string;  // YYYY-MM-DD
  start_time?: string;  // HH:MM:SS or ISO datetime
  start?: string;  // Alternative field name
  end_time?: string;
  end?: string;
  break_minutes?: number;
  breaks?: number;  // Alternative field
  hours_worked?: number;
  hours?: number;  // Alternative field
  wage_cost?: number | { amount: number };
  costs?: { wage: number };  // Nested alternative
  status?: string;
  skill_set?: string;
  shift_type?: string;
}
```

**Field Mapping Notes**:
- Start time: Try `start_time` → `start` → `startDateTime`
- End time: Try `end_time` → `end` → `endDateTime`
- Break minutes: Try `break_minutes` → `breaks` → `breakMinutes`
- Hours: Try `hours_worked` → `hours` → `totalHours`
- Wage cost: Try `wage_cost` → `costs.wage` → `wageCost`

#### Planning Shifts
**GET** `/planning_shifts`  
**Max Days**: 7 (resource_date) or 3 (updated)

Planned/scheduled shifts.

**Response Structure**: Same as Time Registration Shifts, with additional fields:
```typescript
interface PlanningShift extends TimeRegistrationShift {
  status: 'planned' | 'confirmed' | 'cancelled';
}
```

#### Revenue Days
**GET** `/revenue_days`  
**Max Days**: 90 (resource_date)

Daily revenue data per environment.

**Response Structure**:
```typescript
interface RevenueDay {
  id: number;
  environment_id: number;
  date: string;
  revenue: number;
  // ... additional fields in raw_data
}
```

**Note**: This endpoint has a larger date range limit (90 days).

#### Events (Alternative Shift Endpoint)
**POST** `/events`  
**Max Days**: 90

Alternative endpoint for shift data using POST method.

**Request Body**:
```json
{
  "filters": {
    "start_date": "2025-03-01",
    "end_date": "2025-03-31"
  }
}
```

## Error Handling

### Common Errors

| Status | Message | Cause | Solution |
|--------|---------|-------|----------|
| 401 | "not all required auth keys present" | Missing auth headers | Check all 4 credentials are set |
| 400 | "invalid date range" | Date range > maxDays | Reduce date range to ≤7 days (shifts) |
| 400 | Missing start_date/end_date | Required filters missing | Provide both dates for filtered endpoints |

## Best Practices

1. **Date Range Safety Margin**: Use 6-day chunks for shifts (not 7) to avoid edge cases
2. **Always Store raw_data**: Keep complete API response in JSONB column for debugging
3. **Field Mapping Fallbacks**: Try multiple field name variations (see mapping notes)
4. **Test Mode**: Always test with small date ranges first
5. **Backfill Strategy**: 
   - Shifts: 6-day chunks with 45min spacing
   - Revenue: Can use larger chunks (up to 89 days)

## TypeScript Interfaces

```typescript
// Universal shift response type
export interface EitjeShiftResponse {
  id: number;
  date: string;
  user_id?: number;
  team_id?: number;
  environment_id?: number;
  
  // Time fields (multiple naming conventions)
  start_time?: string;
  start?: string;
  startDateTime?: string;
  end_time?: string;
  end?: string;
  endDateTime?: string;
  
  // Break fields
  break_minutes?: number;
  breaks?: number;
  breakMinutes?: number;
  
  // Hours fields
  hours_worked?: number;
  hours?: number;
  totalHours?: number;
  
  // Cost fields (may be nested)
  wage_cost?: number;
  costs?: {
    wage?: number;
    [key: string]: any;
  };
  
  // Metadata
  status?: string;
  skill_set?: string;
  shift_type?: string;
}

// Endpoint configuration
export interface EndpointConfig {
  requiresDates: boolean;
  method: 'GET' | 'POST';
  table: string;
  maxDays?: number;  // 7 for shifts, 3 for updated filter, 90 for revenue/events
  defaultFilterType?: 'resource_date' | 'updated';
}
```

## Changelog

- **2025-10-16**: Initial documentation created from PDF
- **Critical Fix**: Corrected maxDays for shifts from 90 → 7 days
