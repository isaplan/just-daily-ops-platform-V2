# Vercel Cron Jobs Cost Analysis

## Current Configuration

Based on `vercel.json`, you have **5 cron jobs** configured:

| Job | Schedule | Frequency | Daily Executions |
|-----|----------|-----------|------------------|
| Eitje Daily Data | `0 * * * *` | Every hour | 24 |
| Eitje Historical Data | `0 1 * * *` | Once daily (1 AM) | 1 |
| Eitje Master Data | `0 0 * * *` | Once daily (midnight) | 1 |
| Bork Daily Data | `0 * * * *` | Every hour | 24 |
| Bork Historical Data | `0 1 * * *` | Once daily (1 AM) | 1 |

**Total: 51 executions per day**

---

## Monthly Execution Summary

- **Daily executions:** 51
- **Monthly executions (30 days):** 1,530
- **Monthly executions (31 days):** 1,581

---

## Vercel Pricing (Pro Plan)

### Included Limits (Free):
- ✅ **1,000,000 function invocations/month**
- ✅ **4 hours active CPU time/month**
- ✅ **360 GB-hours provisioned memory/month**
- ✅ **Up to 40 cron jobs per account**

### Additional Costs (Overage):
- **Function invocations:** $0.60 per million (after 1M)
- **Active CPU time:** $0.000004 per GB-second (after 4 hours)
- **Provisioned memory:** $0.0000000025 per GB-second (after 360 GB-hours)

---

## Cost Calculation

### Scenario 1: Conservative Estimate (Fast Executions)

**Assumptions:**
- Daily data syncs: 10 seconds average execution time
- Historical data syncs: 2 minutes (120 seconds) average execution time
- Master data syncs: 30 seconds average execution time
- Memory allocation: 512 MB (0.5 GB) per function

**Daily Breakdown:**
- Eitje Daily (24×): 24 × 10s = 240 seconds = 0.067 hours
- Eitje Historical (1×): 1 × 120s = 120 seconds = 0.033 hours
- Eitje Master (1×): 1 × 30s = 30 seconds = 0.008 hours
- Bork Daily (24×): 24 × 10s = 240 seconds = 0.067 hours
- Bork Historical (1×): 1 × 120s = 120 seconds = 0.033 hours

**Daily Totals:**
- **Total execution time:** 750 seconds = **0.208 hours/day**
- **Total memory usage:** 0.5 GB × 0.208 hours = **0.104 GB-hours/day**

**Monthly Totals (30 days):**
- **Total invocations:** 1,530 ✅ (well within 1M limit)
- **Total CPU time:** 0.208 × 30 = **6.24 hours** ❌ (exceeds 4 hours)
- **Total memory:** 0.104 × 30 = **3.12 GB-hours** ✅ (within 360 GB-hours)

**Overage Costs:**
- CPU time overage: (6.24 - 4.0) = 2.24 hours = 8,064 seconds
- CPU cost: 8,064 seconds × 0.5 GB × $0.000004/GB-second = **$0.016/month**

**Total Monthly Cost: ~$0.02/month** (essentially free)

---

### Scenario 2: Realistic Estimate (Moderate Executions)

**Assumptions:**
- Daily data syncs: 30 seconds average execution time
- Historical data syncs: 5 minutes (300 seconds) average execution time
- Master data syncs: 60 seconds average execution time
- Memory allocation: 512 MB (0.5 GB) per function

**Daily Breakdown:**
- Eitje Daily (24×): 24 × 30s = 720 seconds = 0.2 hours
- Eitje Historical (1×): 1 × 300s = 300 seconds = 0.083 hours
- Eitje Master (1×): 1 × 60s = 60 seconds = 0.017 hours
- Bork Daily (24×): 24 × 30s = 720 seconds = 0.2 hours
- Bork Historical (1×): 1 × 300s = 300 seconds = 0.083 hours

**Daily Totals:**
- **Total execution time:** 2,100 seconds = **0.583 hours/day**
- **Total memory usage:** 0.5 GB × 0.583 hours = **0.292 GB-hours/day**

**Monthly Totals (30 days):**
- **Total invocations:** 1,530 ✅ (well within 1M limit)
- **Total CPU time:** 0.583 × 30 = **17.49 hours** ❌ (exceeds 4 hours)
- **Total memory:** 0.292 × 30 = **8.76 GB-hours** ✅ (within 360 GB-hours)

**Overage Costs:**
- CPU time overage: (17.49 - 4.0) = 13.49 hours = 48,564 seconds
- CPU cost: 48,564 seconds × 0.5 GB × $0.000004/GB-second = **$0.097/month**

**Total Monthly Cost: ~$0.10/month** (essentially free)

---

### Scenario 3: Worst Case Estimate (Slow Executions)

**Assumptions:**
- Daily data syncs: 60 seconds average execution time
- Historical data syncs: 10 minutes (600 seconds) average execution time
- Master data syncs: 120 seconds average execution time
- Memory allocation: 1024 MB (1 GB) per function

**Daily Breakdown:**
- Eitje Daily (24×): 24 × 60s = 1,440 seconds = 0.4 hours
- Eitje Historical (1×): 1 × 600s = 600 seconds = 0.167 hours
- Eitje Master (1×): 1 × 120s = 120 seconds = 0.033 hours
- Bork Daily (24×): 24 × 60s = 1,440 seconds = 0.4 hours
- Bork Historical (1×): 1 × 600s = 600 seconds = 0.167 hours

**Daily Totals:**
- **Total execution time:** 4,200 seconds = **1.167 hours/day**
- **Total memory usage:** 1 GB × 1.167 hours = **1.167 GB-hours/day**

**Monthly Totals (30 days):**
- **Total invocations:** 1,530 ✅ (well within 1M limit)
- **Total CPU time:** 1.167 × 30 = **35.01 hours** ❌ (exceeds 4 hours)
- **Total memory:** 1.167 × 30 = **35.01 GB-hours** ✅ (within 360 GB-hours)

**Overage Costs:**
- CPU time overage: (35.01 - 4.0) = 31.01 hours = 111,636 seconds
- CPU cost: 111,636 seconds × 1 GB × $0.000004/GB-second = **$0.447/month**

**Total Monthly Cost: ~$0.45/month** (still very cheap)

---

## Summary

### Cost Range: **$0.02 - $0.45/month**

Your cron jobs are **extremely cost-effective** on Vercel Pro:

✅ **Function invocations:** Well within free tier (1,530 vs 1,000,000 limit)  
⚠️ **CPU time:** Likely to exceed 4 hours/month (depends on execution time)  
✅ **Memory:** Well within free tier (even worst case: 35 GB-hours vs 360 GB-hours limit)

### Key Factors Affecting Cost:

1. **Execution time** - The longer your jobs run, the more CPU time you use
2. **Memory allocation** - Higher memory = higher costs (but you're well within limits)
3. **Frequency** - Your hourly jobs (48/day) are the main cost driver

### Recommendations:

1. **Monitor execution times** in Vercel dashboard to get actual costs
2. **Optimize slow jobs** - If historical syncs take >5 minutes, consider optimizing
3. **Consider reducing frequency** - If daily data doesn't need hourly updates, reduce to every 2-4 hours
4. **Use quiet hours** - Your jobs already respect quiet hours (2-6 AM), which helps

### Cost Optimization Opportunities:

If you want to reduce costs further:

1. **Reduce hourly jobs to every 2 hours:**
   - Current: 48 daily executions
   - Optimized: 24 daily executions
   - Savings: ~50% reduction in CPU time

2. **Combine historical syncs:**
   - Run Eitje and Bork historical syncs together (if possible)
   - Could reduce from 2 executions to 1

3. **Optimize slow endpoints:**
   - If historical syncs take >5 minutes, investigate and optimize
   - Consider pagination or incremental sync strategies

---

## How to Monitor Actual Costs

1. **Vercel Dashboard:**
   - Go to your project → Analytics → Functions
   - View "Function Invocations" and "Function Duration"
   - Check "Active CPU Time" and "Provisioned Memory"

2. **Vercel Billing:**
   - Go to Settings → Billing
   - View monthly usage and costs
   - Set up billing alerts if needed

3. **Function Logs:**
   - Check execution times in Vercel logs
   - Look for slow endpoints and optimize

---

## Conclusion

**Your cron jobs are very affordable on Vercel Pro:**

- **Estimated cost:** $0.02 - $0.45/month
- **Well within limits:** Invocations and memory are no concern
- **Only potential cost:** CPU time overage (minimal)

Even in the worst-case scenario, you're looking at **less than $0.50/month** for all 5 cron jobs running continuously. This is excellent value for automated data synchronization.

