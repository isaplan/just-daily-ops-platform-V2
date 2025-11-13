# Start Local Development Server

## Quick Start

```bash
npm run dev
```

This starts the Next.js app on **http://localhost:3000**

---

## Important: Localhost vs Vercel for Cron Job

### ⚠️ Critical Distinction

**For Development/Testing:**
- ✅ Run `npm run dev` to test locally
- ✅ Test API routes at `http://localhost:3000/api/eitje/sync`
- ✅ Manual testing works fine

**For Midnight Cron Job:**
- ❌ **Edge function CANNOT reach localhost**
- ✅ **Edge function needs Vercel deployment**
- ✅ The edge function calls: `https://just-daily-ops-platform.vercel.app/api/eitje/sync`

**Why?**
- Supabase edge functions run on Supabase's servers
- They can't access `localhost` on your machine
- They can only reach public URLs (like your Vercel deployment)

---

## Step-by-Step: Start Local Server

### 1. Install Dependencies (if needed)

```bash
npm install
```

### 2. Set Up Environment Variables

Make sure `.env.local` exists with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# ... other env vars
```

### 3. Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 15.5.6
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.5s
```

### 4. Verify It's Running

Open in browser: **http://localhost:3000**

Or test API endpoint:
```bash
curl http://localhost:3000/api/eitje/status
```

---

## Test API Routes Locally

### Test Sync Endpoint

```bash
curl -X POST http://localhost:3000/api/eitje/sync \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2025-11-01",
    "endDate": "2025-11-01"
  }'
```

### Test Status Endpoint

```bash
curl http://localhost:3000/api/eitje/status
```

### Test Sync History

```bash
curl http://localhost:3000/api/cron/sync-history?provider=eitje&limit=10
```

---

## For Midnight Cron: Deploy to Vercel

If you want the midnight cron to work, you need:

1. **Deploy to Vercel:**
   ```bash
   # If connected to Git:
   git push origin main
   
   # Or use Vercel CLI:
   vercel --prod
   ```

2. **Verify Vercel deployment:**
   - Visit: `https://just-daily-ops-platform.vercel.app`
   - Should load your app

3. **Test Vercel API:**
   ```bash
   curl -X POST https://just-daily-ops-platform.vercel.app/api/eitje/sync \
     -H "Content-Type: application/json" \
     -d '{
       "endpoint": "time_registration_shifts",
       "startDate": "2025-11-01",
       "endDate": "2025-11-01"
     }'
   ```

4. **Edge function will use Vercel URL automatically** (has fallback)

---

## Development Workflow

**Option 1: Local Development**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test locally
curl http://localhost:3000/api/eitje/status
```

**Option 2: Test Against Production**
```bash
# No local server needed
# Test directly against Vercel
curl https://just-daily-ops-platform.vercel.app/api/eitje/status
```

**Option 3: Both (Recommended)**
```bash
# Develop locally
npm run dev

# But for cron testing, use Vercel
# Edge function → Vercel (not localhost)
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is busy:

```bash
# Use a different port
PORT=3001 npm run dev
```

Then access: `http://localhost:3001`

### Environment Variables Not Loading

Check:
- `.env.local` exists in project root
- Variables are prefixed correctly (`NEXT_PUBLIC_` for client-side)
- Restart dev server after changing `.env.local`

### API Routes Return 404

Check:
- Route file exists: `src/app/api/eitje/sync/route.ts`
- Route exports correct HTTP methods (`GET`, `POST`, etc.)
- URL path matches file structure

---

## Summary

- **Localhost (`npm run dev`)**: For development and manual testing ✅
- **Vercel Deployment**: For production and cron jobs ✅
- **Edge Function**: Always calls Vercel, never localhost ❌

**For midnight cron to work:** Vercel deployment must be live!


