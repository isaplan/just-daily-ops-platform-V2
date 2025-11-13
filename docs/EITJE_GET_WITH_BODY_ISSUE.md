# Eitje API: GET with Body Issue

## Summary

The Eitje API endpoints for labor and revenue data (`/time_registration_shifts`, `/planning_shifts`, `/revenue_days`) **require GET requests with a request body**, which is **not supported by Node.js native `fetch` API**.

## Test Results

### ✅ Working: GET with body (curl)
```bash
curl -X GET "https://open-api.eitje.app/open_api/time_registration_shifts" \
  --data-raw '{"filters": {"start_date": "2024-10-24", "end_date": "2024-10-25", "date_filter_type": "resource_date"}}'
# HTTP 200 - SUCCESS: 90 records returned
```

### ❌ Not Working: POST with body
```bash
curl -X POST "https://open-api.eitje.app/open_api/time_registration_shifts" \
  -d '{"filters": {"start_date": "2024-10-24", "end_date": "2024-10-25", "date_filter_type": "resource_date"}}'
# HTTP 404 - NOT FOUND
```

### ❌ Not Working: Node.js fetch with GET + body
```javascript
fetch("https://open-api.eitje.app/open_api/time_registration_shifts", {
  method: 'GET',
  body: JSON.stringify({ filters: { ... } })
})
// Error: Request with GET/HEAD method cannot have body.
```

## Root Cause

The Eitje API strictly requires:
1. **HTTP Method**: GET (not POST)
2. **Request Body**: JSON with `filters` object

Node.js `fetch` API does not allow GET requests with a body, as per HTTP specifications (though it's technically allowed, it's uncommon and many implementations block it).

## Solutions

### Option 1: Use `axios` (Recommended)
```bash
npm install axios
```

```javascript
import axios from 'axios';

const response = await axios.get('https://open-api.eitje.app/open_api/time_registration_shifts', {
  data: { filters: { start_date: '2024-10-24', end_date: '2024-10-25', date_filter_type: 'resource_date' } },
  headers: { /* auth headers */ }
});
```

### Option 2: Use `undici` (Node.js native alternative)
```bash
npm install undici
```

```javascript
import { request } from 'undici';

const { body } = await request('https://open-api.eitje.app/open_api/time_registration_shifts', {
  method: 'GET',
  body: JSON.stringify({ filters: { ... } }),
  headers: { /* auth headers */ }
});
```

### Option 3: Contact Eitje API Team
Request that they also support POST for these endpoints (as a workaround for clients that can't send GET with body).

## Current Status

❌ **Implementation is blocked** until we choose and implement one of the solutions above.

## Recommendation

**Use `axios`** - it's the most widely used and well-supported library for this use case.

## Next Steps

1. Install `axios`: `npm install axios`
2. Update `src/lib/eitje/api-service.ts` to use `axios` for GET requests with body
3. Test all three endpoints (`time_registration_shifts`, `planning_shifts`, `revenue_days`)
4. Update todos and mark as completed


