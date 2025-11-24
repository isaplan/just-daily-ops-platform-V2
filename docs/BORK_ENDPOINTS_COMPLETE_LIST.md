# Bork API - Complete Endpoints List

## 📊 All Available Bork API Endpoints

### ✅ Currently Used (V2)
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/ticket/day.json/{date}` | Daily sales transactions | ✅ ACTIVE |

### ❌ Available but NOT Used (Needs Implementation)
| Endpoint | Purpose | Status | Data Stored |
|----------|---------|--------|-------------|
| `/catalog/productgrouplist.json` | Product groups/categories with hierarchy | ❌ NOT SYNCED | `bork_product_groups` |
| `/catalog/paymodegrouplist.json` | Payment methods | ❌ NOT SYNCED | `bork_payment_methods` |
| `/centers.json` | Cost centers/departments | ❌ NOT SYNCED | `bork_cost_centers` |
| `/users.json` | Users/employees | ❌ NOT SYNCED | `bork_users` |

---

## 🎯 Missing from V2: Master Data Sync

**The Problem:**
- V1 had a "Master Data Sync" system that synced product groups (which contain the parent/main category hierarchy)
- V2 does NOT have this implemented
- Result: **No product hierarchy available** - we can't get parent/main categories!

**Current State:**
```
Cron Configuration: { sales: true, products: false }
                                            ↓
                        "products" endpoint NOT implemented
                        
This flag WAS meant to enable master data syncing, but:
- No code implements it
- No MongoDB collections exist
- No cron job runs it
```

---

## 📈 Data Hierarchy Available in Bork

### If We Implement Master Data Sync

```json
Product Groups Response from /catalog/productgrouplist.json:
{
  "id": "group-123",
  "name": "Cocktails",           ← Category
  "parentGroupId": "group-001",  ← Parent Category (MAIN)
  "parentGroupName": "Beverages" ← Main Category Name
}
```

### Current State (Without Master Data)

```
We extract from /ticket/day.json sales data:
- GroupName → Category (e.g., "Cocktails")
- ProductName → Product (e.g., "Aperol Spritz")
- No parent/main category available
```

---

## 🔧 Solution: Restore Master Data Sync

See: `docs/MASTER_DATA_SYNC_RESTORATION_PLAN.md`

**Quick Summary:**
1. Create `/api/bork/v2/master-sync` endpoint
2. Implement services to fetch from Bork API endpoints
3. Store in MongoDB collections
4. Add to cron job with schedule
5. Update aggregation to use product hierarchy

---

## 📚 Bork API Documentation

Full specification: `docs/BORK_API_DOCUMENTATION.md`
Integration guide: `docs/BORK_API_INTEGRATION.md`

---

## 🔑 API Parameters (for sales endpoint)

**URL Format**: `{baseUrl}/ticket/day.json/{YYYYMMDD}`

**Query Parameters**:
- `appid` - Application ID (optional)
- `IncInternal` - Include internal tickets (default: true)
- `IncOpen` - Include open/unpaid tickets (default: true)
- `IncTraining` - Include training tickets (optional)
- `IncFreeAddons` - Include free add-ons (optional)

**Example**:
```
https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com/ticket/day.json/20251116?appid=123&IncOpen=true&IncInternal=true
```

---

## 💾 MongoDB Collections Needed

| Collection | Purpose | Source |
|-----------|---------|--------|
| `bork_product_groups` | Product/category hierarchy | `/catalog/productgrouplist.json` |
| `bork_payment_methods` | Payment methods | `/catalog/paymodegrouplist.json` |
| `bork_cost_centers` | Departments/cost centers | `/centers.json` |
| `bork_users` | Employees/users | `/users.json` |

---

## ✨ Benefits of Master Data Sync

1. ✅ **Proper Product Hierarchy**: Main Category → Category → Product
2. ✅ **Payment Method Tracking**: Know which payment methods were used
3. ✅ **Cost Center Analysis**: Track sales by department/center
4. ✅ **User Attribution**: Link sales to employees
5. ✅ **Data Integrity**: Eliminate "Unknown" references in sales

---

## 📝 Next Steps

1. Review: `docs/MASTER_DATA_SYNC_RESTORATION_PLAN.md`
2. Implement Phase 1: API endpoint
3. Implement Phase 2: Service layer
4. Integrate into cron
5. Update aggregation logic to use hierarchy





