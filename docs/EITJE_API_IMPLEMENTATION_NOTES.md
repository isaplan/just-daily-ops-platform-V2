# Eitje API Implementation Notes

## HTTP Method Discrepancy: GET vs POST

### The Issue

The Eitje API documentation specifies **GET** for data retrieval endpoints like:
- `/time_registration_shifts`
- `/planning_shifts`
- `/revenue_days`

However, these endpoints require a **request body** with filters:
```json
{
  "filters": {
    "start_date": "2024-10-24",
    "end_date": "2024-10-25",
    "date_filter_type": "resource_date"
  }
}
```

### The Problem

**Node.js `fetch` API does not allow GET requests with a body.**

Error: `Request with GET/HEAD method cannot have body.`

### The Solution

**Use POST for these endpoints in the implementation**, while understanding they are semantically GET operations (read-only, no side effects).

This is a common workaround for APIs that require request bodies with GET-like operations.

### Working Implementation

```bash
# This works with curl (allows GET with body)
curl -X GET "https://open-api.eitje.app/open_api/time_registration_shifts" \
  --data-raw '{"filters": {"start_date": "2024-10-24", "end_date": "2024-10-25", "date_filter_type": "resource_date"}}'

# This works with Node.js fetch
fetch("https://open-api.eitje.app/open_api/time_registration_shifts", {
  method: 'POST',  // POST for body support
  body: JSON.stringify({ filters: { ... } })
})
```

### Implementation Status

✅ **Fixed**: All date-required endpoints now use POST with body in:
- `src/lib/eitje/api-service.ts` (EITJE_ENDPOINTS configuration)
- `src/lib/eitje/api-service.ts` (fetch methods: `fetchTimeRegistrationShifts`, `fetchPlanningShifts`, `fetchRevenueDays`)
- `src/app/api/eitje/test-endpoint/route.ts` (test endpoint API)

### Key Takeaway

**For BI/Daily Ops apps**: When the API documentation says GET but requires a body, use POST in the implementation. Document it as a "read-only POST operation" for clarity.


