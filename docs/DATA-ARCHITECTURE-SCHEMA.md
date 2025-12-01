# 📊 DATA ARCHITECTURE SCHEMA

## 🎯 Complete Data Flow: Raw Sources → Worker Profile → Aggregated Collections

---

## 📥 RAW DATA SOURCES

```
┌─────────────────┐         ┌─────────────────┐
│   Eitje API     │         │    Bork API    │
│  (Labor Data)   │         │  (Sales Data)  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ Hourly Sync               │ Hourly Sync
         │                           │
         ▼                           ▼
```

---

## 💾 RAW DATA COLLECTIONS

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   eitje_raw_data        │         │   bork_raw_data          │
│                         │         │                          │
│ - locationId             │         │ - locationId             │
│ - date                   │         │ - date                    │
│ - rawApiResponse         │         │ - rawApiResponse         │
│ - extracted:             │         │ - extracted:              │
│   • userId (Eitje ID)     │         │   • waiterId (Bork ID)    │
│   • teamId (Eitje ID)     │         │   • productName           │
│   • hoursWorked           │         │   • category              │
│   • wageCost              │         │   • quantity              │
│   • shiftStart/End        │         │   • revenue              │
│   • ...                   │         │   • tableNumber           │
│                           │         │   • paymentMethod         │
│                           │         │   • ...                   │
└───────────┬───────────────┘         └───────────┬──────────────┘
            │                                     │
            │                                     │
            └─────────────────────────────────────┘
                         │
                         │ System Mapping Resolution
                         │ (Eitje userId → unifiedUserId)
                         │ (Bork waiterId → unifiedUserId)
                         │
                         ▼
```

---

## 👤 WORKER PROFILE (CENTRAL HUB)

```
┌─────────────────────────────────────────────────────────────┐
│                    unified_users                             │
│                  (Worker Profile)                            │
│                                                               │
│ - _id: ObjectId                                              │
│ - firstName, lastName, email, phone                          │
│ - employeeNumber, hireDate                                   │
│ - isActive                                                    │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  systemMappings: [                                      │ │
│ │    { system: 'eitje', externalId: '123' },            │ │
│ │    { system: 'bork', externalId: '456' }               │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ - locationIds: [ObjectId, ...]  → References locations       │
│ - teamIds: [ObjectId, ...]       → References teams          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Referenced by:
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
```

---

## 🏢 UNIFIED ENTITIES (REFERENCE DATA)

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│    locations          │    │   unified_teams       │    │    categories        │
│                       │    │                       │    │                      │
│ - _id: ObjectId      │    │ - _id: ObjectId       │    │ - _id: ObjectId      │
│ - name: "Bar Bea"     │    │ - name: "Kitchen"     │    │ - name: "Food"       │
│ - code: "BB"          │    │ - teamType: "kitchen"│    │ - parentCategory     │
│ - address, city       │    │ - description         │    │ - isActive           │
│ - isActive            │    │ - isActive            │    │                      │
│                       │    │                       │    │                      │
│ - systemMappings: []  │    │ - systemMappings: []  │    │                      │
│                       │    │ - locationIds: []     │    │                      │
│                       │    │ - memberIds: []       │    │                      │
│                       │    │   (unified_users)     │    │                      │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
         │                           │                           │
         │                           │                           │
         └───────────────────────────┴───────────────────────────┘
                                     │
                                     │ Denormalized into aggregated collections
                                     │ (locationName, teamName, category)
                                     │
                                     ▼
```

---

## 📊 AGGREGATED COLLECTIONS

### **1. Aggregated Hours (Labor Data)**

```
┌─────────────────────────────────────────────────────────────┐
│              eitje_aggregated                                │
│                                                               │
│ - locationId: ObjectId                                       │
│ - locationName: "Bar Bea"        ← Denormalized from locations
│ - date: Date                                                 │
│                                                               │
│ - totalHoursWorked: number                                   │
│ - totalWageCost: number                                      │
│ - totalRevenue: number                                       │
│ - laborCostPercentage: number                                │
│ - revenuePerHour: number                                     │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  teamStats: [                                           │ │
│ │    {                                                     │ │
│ │      teamId: ObjectId                                    │ │
│ │      teamName: "Kitchen"    ← Denormalized from teams   │ │
│ │      hours: number                                       │ │
│ │      cost: number                                        │ │
│ │      memberCount: number                                 │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  workerStats: [                                         │ │
│ │    {                                                     │ │
│ │      unifiedUserId: ObjectId  ← Reference to worker    │ │
│ │      userName: "John Doe"      ← Denormalized from      │ │
│ │                                 unified_users            │ │
│ │      eitjeUserId: 123          ← For reference         │ │
│ │      hours: number                                       │ │
│ │      wageCost: number                                   │ │
│ │      teamId: ObjectId                                    │ │
│ │      teamName: "Kitchen"        ← Denormalized          │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  hoursByYear/Month/Week/Day: [                         │ │
│ │    {                                                     │ │
│ │      year: "2025"                                       │ │
│ │      totalHours: number                                 │ │
│ │      byLocation: [                                     │ │
│ │        {                                                │ │
│ │          locationId: ObjectId                           │ │
│ │          locationName: "Bar Bea"  ← Denormalized       │ │
│ │          byTeam: [                                      │ │
│ │            {                                            │ │
│ │              teamId: ObjectId                           │ │
│ │              teamName: "Kitchen"  ← Denormalized       │ │
│ │              byWorker: [                               │ │
│ │                {                                        │ │
│ │                  unifiedUserId: ObjectId               │ │
│ │                  userName: "John Doe"  ← Denormalized  │ │
│ │                  totalHours: number                     │ │
│ │                }                                        │ │
│ │              ]                                          │ │
│ │            }                                            │ │
│ │          ]                                              │ │
│ │        }                                                │ │
│ │      ]                                                  │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **2. Aggregated Sales**

```
┌─────────────────────────────────────────────────────────────┐
│              bork_aggregated                                 │
│                                                               │
│ - locationId: ObjectId                                       │
│ - locationName: "Bar Bea"        ← Denormalized from locations
│ - date: Date                                                 │
│                                                               │
│ - totalRevenue: number                                       │
│ - totalQuantity: number                                      │
│ - totalTransactions: number                                  │
│ - avgRevenuePerTransaction: number                           │
│                                                               │
│ - revenueByCategory: {                                      │
│     "Food": 1000,                                            │
│     "Drinks": 500                                            │
│   }                                                          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  waiterBreakdown: [                                     │ │
│ │    {                                                     │ │
│ │      waiterName: "John Doe"      ← Denormalized from    │ │
│ │                                 unified_users            │ │
│ │      unifiedUserId: ObjectId     ← Reference to worker  │ │
│ │      totalRevenue: number                                │ │
│ │      totalItemsSold: number                              │ │
│ │      totalTransactions: number                            │ │
│ │      averageTicketValue: number                           │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ - paymentMethodBreakdown: []                                │
│ - tableBreakdown: []                                        │
│ - hourlyBreakdown: []                                       │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  salesByYear/Month/Week/Day: [                         │ │
│ │    {                                                     │ │
│ │      year: "2025"                                       │ │
│ │      totalRevenue: number                               │ │
│ │      byLocation: [                                     │ │
│ │        {                                                │ │
│ │          locationId: ObjectId                           │ │
│ │          locationName: "Bar Bea"  ← Denormalized        │ │
│ │          byCategory: [                                 │ │
│ │            {                                            │ │
│ │              category: "Food"     ← From categories     │ │
│ │              totalRevenue: number                       │ │
│ │            }                                            │ │
│ │          ]                                              │ │
│ │        }                                                  │ │
│ │      ]                                                  │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Aggregated Products**

```
┌─────────────────────────────────────────────────────────────┐
│              products_aggregated                             │
│                                                               │
│ - productName: "Pizza Margherita"                            │
│ - category: "Food"              ← Reference to categories   │
│                                                               │
│ - totalQuantitySold: number                                 │
│ - totalRevenueExVat: number                                │
│ - totalRevenueIncVat: number                                │
│ - averagePrice: number                                      │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  locationDetails: [                                    │ │
│ │    {                                                     │ │
│ │      locationId: ObjectId                               │ │
│ │      locationName: "Bar Bea"    ← Denormalized          │ │
│ │      lastSoldDate: Date                                  │ │
│ │      totalQuantity: number                              │ │
│ │      totalRevenue: number                               │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ - priceHistory: []                                          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  salesByYear/Month/Week/Day: [                         │ │
│ │    {                                                     │ │
│ │      year: "2025"                                       │ │
│ │      totalQuantity: number                             │ │
│ │      byLocation: [                                     │ │
│ │        {                                                │ │
│ │          locationId: ObjectId                           │ │
│ │          locationName: "Bar Bea"  ← Denormalized        │ │
│ │          totalQuantity: number                          │ │
│ │          totalRevenue: number                           │ │
│ │        }                                                │ │
│ │      ]                                                  │ │
│ │    }                                                     │ │
│ │  ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **4. Worker Profiles Aggregated (Productivity)**

```
┌─────────────────────────────────────────────────────────────┐
│          worker_profiles_aggregated                         │
│                                                               │
│ - unifiedUserId: ObjectId      ← Reference to worker        │
│ - userName: "John Doe"           ← Denormalized               │
│ - eitjeUserId: 123                                           │
│ - borkUserId: "456"                                          │
│                                                               │
│ - locationId: ObjectId                                       │
│ - locationName: "Bar Bea"        ← Denormalized              │
│ - locationIds: [ObjectId, ...]                             │
│ - locationNames: ["Bar Bea", ...]  ← Denormalized            │
│                                                               │
│ - teamIds: [ObjectId, ...]                                  │
│ - teamNames: ["Kitchen", ...]     ← Denormalized             │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  thisMonth: {                                           │ │
│ │    hours: number          ← From eitje_aggregated       │ │
│ │    wageCost: number       ← From eitje_aggregated       │ │
│ │    salesRevenue: number   ← From bork_aggregated         │ │
│ │    productivity: number   ← Calculated: revenue/hours   │ │
│ │  }                                                       │ │
│ │                                                          │ │
│ │  lastMonth: { ... }                                      │ │
│ │  total: { ... }                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW DIAGRAM

```
┌──────────────┐         ┌──────────────┐
│  Eitje API   │         │   Bork API   │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ Hourly Sync            │ Hourly Sync
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│eitje_raw_data│         │bork_raw_data │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ Extract userId         │ Extract waiterId
       │                        │
       └──────────┬─────────────┘
                  │
                  │ Resolve via systemMappings
                  │
                  ▼
       ┌──────────────────────┐
       │   unified_users      │ ◄───┐
       │  (Worker Profile)    │     │
       └──────────┬────────────┘     │
                  │                  │
                  │ Referenced by    │ Referenced by
                  │                  │
       ┌──────────┴────────────┐     │
       │                       │     │
       ▼                       ▼     │
┌──────────────┐      ┌──────────────┐
│  locations   │      │ unified_teams│
│              │      │              │
│ - name       │      │ - name       │
│ - code       │      │ - teamType   │
└──────┬───────┘      └──────┬───────┘
       │                     │
       │ Denormalized into   │ Denormalized into
       │ aggregated          │ aggregated
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │    categories         │
       │                      │
       │ - name               │
       │ - parentCategory     │
       └──────┬───────────────┘
              │
              │ Denormalized into
              │ aggregated
              │
              ▼
┌─────────────────────────────────────────┐
│         AGGREGATION SERVICES            │
│                                         │
│ 1. Read raw data                        │
│ 2. Resolve unifiedUserId from           │
│    systemMappings                       │
│ 3. Denormalize:                         │
│    - locationName from locations        │
│    - userName from unified_users        │
│    - teamName from unified_teams        │
│    - category from categories           │
│ 4. Calculate aggregates                 │
│ 5. Build hierarchical time-series       │
│ 6. Upsert to aggregated collections     │
└─────────────────────────────────────────┘
              │
              │ Daily Aggregation
              │
       ┌──────┴───────┐
       │             │
       ▼             ▼
┌──────────────┐  ┌──────────────┐
│eitje_aggregated│  │bork_aggregated│
│                │  │                │
│ - Hours        │  │ - Sales        │
│ - Wage Cost    │  │ - Revenue      │
│ - Productivity │  │ - Products    │
└───────────────┘  └───────────────┘
       │             │
       └──────┬──────┘
              │
              │ Cross-reference for productivity
              │
              ▼
┌─────────────────────────────────────────┐
│    worker_profiles_aggregated          │
│                                         │
│ - Hours (from eitje_aggregated)        │
│ - Sales (from bork_aggregated)         │
│ - Productivity = Revenue ÷ Hours        │
└─────────────────────────────────────────┘
```

---

## 📋 WHERE UNIFIED ENTITIES GO

### **1. Locations**
- **Stored in:** `locations` collection
- **Used in aggregation:**
  - Denormalized as `locationName` in all aggregated collections
  - Referenced by `locationId` in raw data
- **Where it appears:**
  - `eitje_aggregated.locationName`
  - `bork_aggregated.locationName`
  - `products_aggregated.locationDetails[].locationName`
  - `worker_profiles_aggregated.locationName`

### **2. Unified Teams**
- **Stored in:** `unified_teams` collection
- **Used in aggregation:**
  - Denormalized as `teamName` in hours aggregation
  - Referenced by `teamId` in raw data
- **Where it appears:**
  - `eitje_aggregated.teamStats[].teamName`
  - `eitje_aggregated.workerStats[].teamName`
  - `worker_profiles_aggregated.teamNames[]`

### **3. Categories**
- **Stored in:** `categories` collection (or embedded in products)
- **Used in aggregation:**
  - Denormalized as `category` in sales aggregation
  - Referenced in product aggregation
- **Where it appears:**
  - `bork_aggregated.revenueByCategory["Food"]`
  - `products_aggregated.category`
  - `bork_aggregated.salesByYear[].byLocation[].byCategory[]`

---

## 🎯 KEY PRINCIPLES

### **1. Worker Profile = Central Hub**
- All systems map to `unified_users`
- System mappings: `{ system: 'eitje', externalId: '123' }`
- Referenced by all aggregated collections

### **2. Denormalization During Aggregation**
- **One lookup** during aggregation (from reference collections)
- **Zero lookups** during queries (names already stored)
- **100x faster** queries

### **3. Hierarchical Time-Series**
- Year → Month → Week → Day breakdowns
- Location → Team → Worker breakdowns
- Fast historical queries without recalculating

### **4. Cross-Reference for Productivity**
- Hours from `eitje_aggregated`
- Sales from `bork_aggregated`
- Productivity = Revenue ÷ Hours (in `worker_profiles_aggregated`)

---

## ✅ SUMMARY

**Raw Data** → **Worker Profile** (resolves IDs) → **Aggregated Collections** (denormalized names)

**Unified Entities:**
- **Locations** → Denormalized as `locationName` in all aggregated
- **Teams** → Denormalized as `teamName` in hours aggregated
- **Categories** → Denormalized as `category` in sales aggregated

**Result:** Fast queries with all data pre-computed and names included!

