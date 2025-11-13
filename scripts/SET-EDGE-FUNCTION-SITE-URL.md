# Set Site URL for Edge Function

Since Supabase is connected to Vercel, you need to set the Vercel deployment URL as an environment variable for the edge function.

## Option 1: Add as Edge Function Secret (Recommended)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/vrucbxdudchboznunndz/functions
2. Click **Settings** (gear icon) or go to Edge Functions → Settings
3. Click **Secrets** tab
4. Click **Add new secret**
5. Add:
   - **Name**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: Your Vercel deployment URL (e.g., `https://just-daily-ops-platform.vercel.app` or your custom domain)
6. Click **Save**

## Option 2: Get Vercel URL

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: `just-daily-ops-platform`
3. Look at the **Domains** section
4. Copy the deployment URL (usually `https://[project-name].vercel.app`)
5. Use this URL in the edge function secret above

## Option 3: Auto-detect from Vercel (If Available)

Vercel automatically sets `VERCEL_URL` in Supabase when connected. The edge function will try to use:
- `NEXT_PUBLIC_SITE_URL` (if set)
- Auto-detected from Supabase URL (might not work)
- Fallback to Vercel URL pattern

## Verify It Works

After setting the secret:
1. Wait a minute for the secret to propagate
2. Check edge function logs on the next cron run
3. You should see: `Calling manual sync API (SAME flow): https://[your-vercel-url]/api/eitje/sync`

## Important Notes

- The edge function needs to be able to reach your Vercel deployment
- Make sure your Vercel deployment is public (not behind auth for `/api/eitje/sync`)
- The manual sync API should work without authentication if called from edge function with service role key


