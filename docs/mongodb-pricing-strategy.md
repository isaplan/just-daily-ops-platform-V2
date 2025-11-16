# MongoDB Atlas Pricing & Data Archival Strategy

## MongoDB Atlas Pricing (2024-2025)

### Current Tier: M0 (Free)
- **Storage:** 512 MB
- **Cost:** $0/month
- **Limitation:** Not suitable for production with cron jobs

### Recommended Tiers for Cron Jobs:

#### M2 (Shared Cluster) - **RECOMMENDED FOR START**
- **Storage:** 5 GB
- **RAM:** Shared
- **Cost:** ~$8-30/month (billed hourly)
- **Good for:** Development, small production workloads
- **With archival:** Can handle 1-2 years of data

#### M5 (Dedicated Cluster) - **PRODUCTION**
- **Storage:** 10 GB+ (scalable)
- **RAM:** 2 GB dedicated
- **Cost:** ~$57/month
- **Good for:** Production workloads, multiple locations
- **With archival:** Can handle 3+ years of data

### Cost Estimation with Cron Jobs:

**Daily Data Cron (hourly):**
- Bork: ~3 locations × 1 day = ~3 records/day
- Eitje: ~3 endpoints × 1 day = ~9 records/day
- **Growth:** ~12 records/day = ~360 records/month

**Historical Data Cron (daily):**
- Syncs last 30 days = ~360 records/month (updates existing)

**Monthly Growth:** ~360 records/month
- **Raw data size:** ~500 KB per record (with full API response)
- **Monthly storage:** ~180 MB/month
- **Yearly storage:** ~2.16 GB/year

**With 1-month archival (optimized):**
- **Active storage:** ~36-54 MB (1 month of optimized raw data)
- **Aggregated data:** ~10-20 MB (all time, used by UI)
- **Archived:** Compressed files (~90% reduction) = ~100-150 MB/year
- **Total needed:** ~50-75 MB active + archive storage

**Recommendation:** 
- **M0 (Free)**: 512 MB - **Now sufficient** with 1-month retention + optimization
- **M2 (Shared)**: 5 GB - Can handle 10+ years with this strategy
- **M5 (Dedicated)**: 10 GB+ - Production, can handle 20+ years

---

## Data Archival Strategy

### Strategy: Keep 1 Month Active, Archive Older Data

**Active Data (in MongoDB):**
- Raw data: Last 1 month (4 weeks) only
- Aggregated data: Keep all (small, used by UI)
- Master data: Keep all (locations, users, teams)

**Rationale:**
- Financial data is updated within a maximum period of 4 weeks
- Chance of data older than 4 weeks being updated is almost zero
- Aggregated data (used by UI) remains in MongoDB permanently
- Raw data older than 1 month can be safely archived

**Archived Data (compressed files):**
- Raw data older than 1 month (4 weeks)
- Includes both raw and aggregated data for consistency
- Compressed JSON.gz files (maximum compression)
- Stored in cloud storage (S3, Google Cloud Storage) or local backup
- Can be restored if needed

### Benefits:
1. **Reduced storage costs:** Keep only essential data in MongoDB
2. **Faster queries:** Smaller database = faster queries
3. **Cost-effective:** Use cheaper storage for archives
4. **UI still works:** Aggregated data remains for dashboards

---

## Implementation

See `/api/admin/archive-data` endpoint for archival functionality.

---

## Storage Optimization

### Data Optimization Strategy

**1. Essential Fields Only (70-80% reduction)**
- **Bork API**: Stores only 17 essential fields instead of full ticket objects
- **Eitje API**: Stores only endpoint-specific essential fields
- **Result**: ~70-80% reduction in raw data storage

**2. Improved Compression (10-15% better)**
- Uses maximum gzip compression level (9)
- Compact JSON format (no pretty printing)
- **Result**: ~10-15% better compression ratio in archives

**3. Combined Savings**
- **Before optimization**: ~500 KB per record
- **After optimization**: ~100-150 KB per record (70-80% reduction)
- **After compression**: ~30-50 KB per archived record (90-95% total reduction)

### Storage Impact

**Monthly Growth (with optimization + 1-month retention):**
- Raw data: ~180 MB/month → **~36-54 MB/month** (70% reduction)
- Active raw data: **~36-54 MB** (1 month only)
- Aggregated data: **~10-20 MB** (all time, grows slowly)
- Archived (compressed): ~1 GB/year → **~100-150 MB/year** (90% reduction)

**MongoDB Tier Recommendation:**
- **M0 (Free)**: 512 MB - **Now sufficient!** With 1-month retention + optimization
- **M2 (Shared)**: 5 GB - Can handle 10+ years with this strategy
- **M5 (Dedicated)**: 10 GB+ - Production, can handle 20+ years

### Implementation Details

**Bork Data Optimizer** (`src/lib/bork/v2-data-optimizer.ts`):
- Extracts only 17 essential fields from tickets
- Automatically applied during sync
- Logs storage reduction percentage

**Eitje Data Optimizer** (`src/lib/eitje/v2-data-optimizer.ts`):
- Endpoint-specific field extraction
- Reduces storage by 60-70%

**Archive Compression** (`src/app/api/admin/archive-data/route.ts`):
- Maximum gzip compression (level 9)
- Compact JSON format
- ~10-15% better compression than default
- **Includes aggregated data** in archives for data consistency
- Archive structure: `{ metadata, rawData, aggregatedData }`

