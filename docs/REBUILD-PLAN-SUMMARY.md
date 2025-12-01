# 🏗️ REBUILD PLAN - SIMPLIFIED SUMMARY

## 🎯 BUILD ORDER

1. **Worker Profile** (Fundamental Building Block)
2. **Aggregated Hours** (Labor Data)
3. **Aggregated Sales** (Sales Data)

---

## 📊 WHY THIS ORDER?

### **1. Worker Profile First** ✅

**What it is:**
- Unified worker record connecting Eitje user ID ↔ Bork waiter ID
- Single source of truth: `unified_users` collection
- System mappings: `{ system: 'eitje', externalId: '123' }`, `{ system: 'bork', externalId: '456' }`

**Benefits:**
- ✅ **Connects everything** - Worker links Eitje hours + Bork sales
- ✅ **Enables correlation** - "Which worker sold what?" (sales) + "How many hours did they work?" (labor)
- ✅ **Productivity calculations** - Revenue per hour per worker
- ✅ **Single identity** - One worker = one record, regardless of system
- ✅ **Foundation for aggregation** - Hours and sales aggregation need worker IDs

**Without it:**
- ❌ Can't connect Eitje hours to Bork sales
- ❌ Can't calculate worker productivity
- ❌ Duplicate worker records across systems
- ❌ Aggregation services can't resolve worker names

---

### **2. Aggregated Hours Second** ✅

**What it is:**
- `eitje_aggregated` collection with pre-computed labor data
- Denormalized: `userName`, `locationName`, `teamName` (not just IDs)
- Hierarchical time-series: year/month/week/day breakdowns

**Benefits:**
- ✅ **Fast queries** - Pre-computed totals, no real-time calculations
- ✅ **Worker names included** - Uses worker profile data (from step 1)
- ✅ **Location/team names included** - Denormalized for speed
- ✅ **Historical data** - Hierarchical structure for fast year/month queries
- ✅ **Foundation for sales correlation** - Hours data ready to match with sales

**Without worker profile first:**
- ❌ Can't resolve worker names (only Eitje IDs)
- ❌ Can't connect to sales data later
- ❌ Aggregation service needs worker profile to denormalize names

---

### **3. Aggregated Sales Third** ✅

**What it is:**
- `bork_aggregated` collection with pre-computed sales data
- `products_aggregated` collection with product-level data
- Denormalized: `waiterName` (from worker profile), `locationName`, `productName`

**Benefits:**
- ✅ **Fast queries** - Pre-computed totals, no real-time calculations
- ✅ **Worker correlation** - Uses worker profile to link waiters to unified users
- ✅ **Productivity metrics** - Can calculate revenue per hour (sales ÷ hours from step 2)
- ✅ **Complete picture** - Worker hours + worker sales = full productivity view
- ✅ **Location/team names included** - Denormalized for speed

**Without worker profile + hours first:**
- ❌ Can't link sales to workers (only Bork waiter IDs)
- ❌ Can't calculate productivity (no hours data to compare)
- ❌ Can't show "worker sold X and worked Y hours"

---

## 🎯 KEY BENEFITS OF THIS ORDER

### **1. Data Correlation**
```
Worker Profile → Links Eitje ID + Bork ID
     ↓
Aggregated Hours → Uses unifiedUserId (from worker profile)
     ↓
Aggregated Sales → Uses unifiedUserId (from worker profile)
     ↓
Result: Complete worker productivity view
```

### **2. Denormalization Efficiency**
- Worker profile provides `userName` → Hours aggregation stores it
- Worker profile provides `userName` → Sales aggregation stores it
- **One lookup** during aggregation, **zero lookups** during queries

### **3. Productivity Calculations**
- Hours data: "Worker X worked 8 hours"
- Sales data: "Worker X sold €500"
- **Result**: "Worker X productivity = €62.50/hour"

### **4. Single Source of Truth**
- Worker profile = master record
- Hours aggregation = references worker profile
- Sales aggregation = references worker profile
- **No duplicate worker data**

---

## 📋 SIMPLIFIED BUILD CHECKLIST

### **Phase 1: Worker Profile** (Foundation)
- [ ] `unified_users` collection + indexes
- [ ] System mappings: Eitje ID ↔ Bork ID
- [ ] GraphQL: `unifiedUsers`, `unifiedUserBySystemMapping`
- [ ] Service: Resolve worker by system ID

### **Phase 2: Aggregated Hours**
- [ ] `eitje_raw_data` collection (store raw API responses)
- [ ] `eitje_aggregated` collection (pre-computed with worker names)
- [ ] Aggregation service: Denormalize worker names from worker profile
- [ ] GraphQL: `laborAggregated` (query aggregated only)
- [ ] Cron: Daily aggregation

### **Phase 3: Aggregated Sales**
- [ ] `bork_raw_data` collection (store raw API responses)
- [ ] `bork_aggregated` collection (pre-computed with waiter names from worker profile)
- [ ] `products_aggregated` collection
- [ ] Aggregation service: Denormalize waiter names from worker profile
- [ ] GraphQL: `salesAggregated`, `products` (query aggregated only)
- [ ] Cron: Daily aggregation

---

## 🚀 RESULT

**Complete worker-centric view:**
- Worker profile connects all systems
- Hours data shows labor costs
- Sales data shows revenue
- **Productivity = Revenue ÷ Hours** ✅

**Fast queries:**
- All data pre-computed
- Names denormalized (no enrichment queries)
- Hierarchical time-series for historical data

**Single source of truth:**
- Worker profile = master
- Hours & sales = references worker profile
- No duplicate data

---

**Bottom line:** Worker profile first = everything else connects. Hours second = labor data ready. Sales third = complete picture with productivity metrics.

