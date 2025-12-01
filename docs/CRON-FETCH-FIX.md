# Cron Job Fetch Failed - Fix Applied

## Problem

Cron jobs were failing with "fetch failed" errors when trying to sync `planning_shifts` and other endpoints:

```
[Cron Job] Error syncing planning_shifts: fetch failed
[Cron Job] Error in historical sync planning_shifts (2025-11-28 to 2025-11-30): fetch failed
```

## Root Cause

The cron manager was using `process.env.NEXT_PUBLIC_APP_URL` which:
- May not be set in Vercel environment variables
- Falls back to `http://localhost:3000` (which doesn't work on Vercel)
- Doesn't use Vercel's automatic `VERCEL_URL` environment variable

## Fix Applied

Updated `src/lib/cron/v2-cron-manager.ts` to use proper URL resolution:

```typescript
// Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL (with https) > localhost
let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!baseUrl) {
  // Vercel automatically sets VERCEL_URL (e.g., "your-app.vercel.app")
  // We need to add https:// protocol
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    baseUrl = `https://${vercelUrl}`;
  } else {
    // Fallback to localhost for development
    baseUrl = 'http://localhost:3000';
  }
}

// Ensure baseUrl doesn't have trailing slash
baseUrl = baseUrl.replace(/\/$/, '');
```

## Improvements

1. **Better URL Resolution:**
   - Uses `VERCEL_URL` (automatically set by Vercel) when `NEXT_PUBLIC_APP_URL` is not set
   - Adds `https://` protocol to Vercel URL
   - Falls back to localhost for development

2. **Enhanced Error Logging:**
   - Logs the base URL being used
   - Logs the full sync URL before making requests
   - Logs HTTP status codes and error messages
   - Logs full error details for debugging

3. **Better Error Handling:**
   - Checks `response.ok` before parsing JSON
   - Extracts error text from failed responses
   - Provides more context in error messages

## Next Steps

### 1. Set Environment Variable (Recommended)

In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_APP_URL=https://just-daily-ops-platform-v2.vercel.app
```

Or use your custom domain if you have one configured.

### 2. Verify VERCEL_URL is Available

Vercel automatically sets `VERCEL_URL` for each deployment. The fix will use this if `NEXT_PUBLIC_APP_URL` is not set.

### 3. Monitor Logs

After deploying, check Vercel logs for:
- `[Cron Job] Executing ... job with baseUrl: ...` - Shows which URL is being used
- `[Cron Job] Syncing ... via ...` - Shows the full sync URL
- Any new error messages with more context

### 4. Test the Fix

1. Deploy the updated code to Vercel
2. Wait for the next cron job execution (or trigger manually)
3. Check Vercel logs for:
   - Base URL being used (should be your Vercel URL)
   - Successful syncs or more detailed error messages

## Expected Behavior After Fix

- ✅ Cron jobs should use the correct Vercel URL
- ✅ Internal API calls should succeed
- ✅ Better error messages if something still fails
- ✅ Logs will show exactly which URL is being used

## If Issues Persist

If you still see "fetch failed" errors after this fix:

1. **Check Vercel Logs:**
   - Look for the base URL being used
   - Check if it's correct (should be your Vercel domain)

2. **Verify API Route is Accessible:**
   - Manually test: `https://your-app.vercel.app/api/eitje/v2/sync`
   - Check if it requires authentication (shouldn't for internal calls)

3. **Check Timeout Issues:**
   - Vercel serverless functions have a 10-second timeout on Hobby plan
   - Pro plan allows up to 60 seconds
   - If syncs take longer, they'll fail with timeout errors

4. **Network Issues:**
   - Vercel serverless functions making HTTP calls to themselves can sometimes fail
   - Consider using direct function calls instead of HTTP (future optimization)

## Alternative Solution (Future)

Instead of making HTTP calls to internal API routes, we could:
- Directly import and call the sync functions
- Avoid HTTP overhead and potential network issues
- Faster execution and more reliable

This would require refactoring but would be more efficient.



