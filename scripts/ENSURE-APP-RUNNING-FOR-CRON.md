# Ensure App is Running for Midnight Cron

## Critical Issue
If the Next.js app on Vercel isn't running, the edge function will fail at midnight because it can't reach `/api/eitje/sync`.

---

## Step 1: Check Vercel Deployment Status

### Option A: Via Vercel Dashboard

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project: `just-daily-ops-platform`
3. Check the **Deployments** tab:
   - Is there a recent deployment?
   - What's the status? (Ready, Building, Error, etc.)
   - Is it the latest code?

**If no deployment or deployment failed:**
- You need to deploy (see Step 2)

**If deployment exists but might be sleeping:**
- Vercel free tier can sleep after inactivity
- First request will wake it up (but adds cold start delay)
- Consider upgrading to prevent sleeping, OR trigger a warm-up request before midnight

---

### Option B: Test if App is Accessible

**Test the API endpoint directly:**

Open in browser or use curl:
```bash
curl https://just-daily-ops-platform.vercel.app/api/eitje/sync \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"time_registration_shifts","startDate":"2025-11-01","endDate":"2025-11-01"}'
```

**Expected responses:**
- ✅ `200 OK` with JSON response → App is running
- ❌ `502 Bad Gateway` → App is sleeping or crashed
- ❌ `404 Not Found` → Deployment not found
- ❌ `500 Internal Server Error` → App is running but API has an error
- ❌ Connection timeout → App is not accessible

---

## Step 2: Deploy to Vercel (If Needed)

### Option A: Deploy via Git Push (Recommended)

If your code is in git and connected to Vercel:

```bash
# Commit any pending changes
git add .
git commit -m "Prepare for midnight cron test"

# Push to trigger deployment
git push origin main
```

Vercel will automatically build and deploy.

**Check deployment:**
- Go to Vercel Dashboard → Deployments
- Wait for deployment to complete (usually 2-5 minutes)
- Status should show "Ready" with green checkmark

---

### Option B: Deploy via Vercel CLI

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel --prod
```

---

### Option C: Manual Deploy via Dashboard

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click **"Redeploy"** on the latest deployment (if exists)
   OR
5. Connect your Git repository if not connected
6. Push to trigger automatic deployment

---

## Step 3: Verify Deployment is Working

After deployment completes:

### Test 1: Check Homepage

Visit: `https://just-daily-ops-platform.vercel.app`

Should load the Next.js app homepage.

---

### Test 2: Test the Sync API Endpoint

```bash
curl -X POST https://just-daily-ops-platform.vercel.app/api/eitje/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2025-11-01",
    "endDate": "2025-11-01"
  }'
```

**Replace `YOUR_SERVICE_ROLE_KEY`** with your actual Supabase service role key.

**Expected:**
- Status `200`
- JSON response with sync results

**If you get errors:**
- Check Vercel function logs
- Verify environment variables are set in Vercel
- Check API route code for issues

---

## Step 4: Prevent App from Sleeping (Optional but Recommended)

Vercel free tier can sleep after 30 seconds of inactivity. The first request after sleeping has a cold start delay (2-5 seconds).

**Option A: Upgrade to Pro** (removes sleeping)

**Option B: Warm-up Request Before Midnight**

Create a simple cron job or scheduled task that pings your app 1 minute before the edge function runs:

```bash
# Example: Ping the API at 23:59 to wake it up
curl https://just-daily-ops-platform.vercel.app/api/eitje/sync
```

**Or use a service like:**
- UptimeRobot (free)
- Cron-job.org (free)
- Set up a simple Supabase Edge Function that pings your app

---

## Step 5: Verify Edge Function Can Reach App

Before midnight, manually test the edge function:

1. Go to Supabase Dashboard → Edge Functions → `eitje-incremental-sync`
2. Click **"Test"** button
3. Request body: `{}`
4. Click **"Invoke"**

**Watch the logs:**
- Should show: `Calling manual sync API (SAME flow): https://just-daily-ops-platform.vercel.app/api/eitje/sync`
- Should show HTTP status `200`
- Should show sync results

**If it fails:**
- Check the URL in logs (is it correct?)
- Check if app is accessible (Step 3)
- Check edge function has correct URL configured

---

## Quick Checklist Before Midnight

- [ ] Vercel deployment exists and is "Ready"
- [ ] App homepage loads: `https://just-daily-ops-platform.vercel.app`
- [ ] API endpoint is accessible (test with curl)
- [ ] API endpoint returns `200` status
- [ ] Edge function test succeeds (manual trigger)
- [ ] Edge function logs show correct URL
- [ ] (Optional) App warmed up 1 minute before midnight

---

## Troubleshooting

### App Deploys but Returns 500 Errors

**Check:**
- Vercel function logs (Dashboard → Deployments → Click deployment → Functions tab)
- Environment variables in Vercel (Dashboard → Settings → Environment Variables)
- API route code for errors

### App Times Out or Returns 502

**Possible causes:**
- App is sleeping (cold start)
- Function timeout exceeded (check Vercel settings)
- Too much traffic/load

**Solutions:**
- Warm up app before midnight
- Increase function timeout in Vercel settings
- Check for performance issues in API route

### Edge Function Can't Connect

**Check:**
- Is the URL in edge function logs correct?
- Can you access the URL from your browser?
- Is there a firewall/network issue?
- Check edge function secret `NEXT_PUBLIC_SITE_URL` is set correctly

---

## Timeline

**Now → 23:50:** Deploy and verify app is running
**23:50 → 23:59:** Test edge function manually, warm up app
**00:00:** Cron triggers edge function
**00:01 → 00:15:** Monitor logs and verify success

---

## Next Steps

1. **Immediately:** Check Vercel deployment status
2. **If needed:** Deploy the app
3. **Before midnight:** Test edge function manually
4. **00:15 after midnight:** Check logs and verify success


