# Fix Join Approach

## Issue
Column `eitje_id` doesn't exist - the actual column is `eitje_environment_id`

## Fix Applied
Updated all joins to use correct column names:
- `eitje_environments(environment_id:eitje_environment_id, name)`
- `eitje_teams(team_id:eitje_team_id, name)`

## If Joins Still Fail
If Supabase PostgREST doesn't support manual joins without foreign keys, we have two options:

### Option 1: Create Foreign Keys (Recommended)
```sql
-- Add foreign key constraints
ALTER TABLE eitje_revenue_days_aggregated 
ADD CONSTRAINT fk_env_revenue 
FOREIGN KEY (environment_id) 
REFERENCES eitje_environments(eitje_environment_id);

ALTER TABLE eitje_labor_hours_aggregated 
ADD CONSTRAINT fk_env_hours 
FOREIGN KEY (environment_id) 
REFERENCES eitje_environments(eitje_environment_id);

ALTER TABLE eitje_labor_hours_aggregated 
ADD CONSTRAINT fk_team_hours 
FOREIGN KEY (team_id) 
REFERENCES eitje_teams(eitje_team_id);
```

### Option 2: Fetch Names Separately
Fetch environments/teams in separate queries and merge in JavaScript

