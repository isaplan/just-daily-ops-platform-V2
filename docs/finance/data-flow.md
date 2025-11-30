# Data Flow Documentation

Complete documentation of how data flows through the Just Daily Ops Platform.

## 📋 Overview

This document describes the complete data flow from external APIs → database → aggregation → GraphQL → UI.

---

## 🔄 Data Flow Architecture

```
External APIs → Raw Data Collection → Aggregation → Aggregated Collections → GraphQL → UI
     ↓                ↓                    ↓                ↓                  ↓        ↓
  Bork API      bork_raw_data      bork_aggregated   GraphQL Resolvers    React Query  Pages
  Eitje API     eitje_raw_data     eitje_aggregated
```

---

## 📊 Sales Data Flow (Bork)

### 1. Data Sync (Raw Data Collection)

**Source**: Bork API  
**Destination**: `bork_raw_data` collection  
**Process**:
1. API credentials configured in `/settings/bork-api`
2. Sync triggered via `/api/bork/v2/sync` or cron job
3. Raw transaction data stored in MongoDB
4. Each record contains:
   - Transaction details
   - Product information
   - Location, waiter, table
   - Payment method
   - Timestamp

**API Endpoint**: `/api/bork/v2/sync`

### 2. Data Aggregation

**Source**: `bork_raw_data`  
**Destination**: `bork_aggregated` collection  
**Process**:
1. Daily aggregation runs via cron or `/api/bork/v2/aggregate`
2. Raw transactions aggregated by:
   - Date
   - Location
   - Category
   - Product
3. Calculated fields:
   - Daily totals
   - Revenue by category
   - Product sales counts
   - Payment method breakdowns

**API Endpoint**: `/api/bork/v2/aggregate`

### 3. Product Aggregation

**Source**: `bork_raw_data`  
**Destination**: `products_aggregated` collection  
**Process**:
1. Product data extracted from sales
2. Aggregated by product name
3. Includes:
   - Sales statistics
   - Price history
   - Location details
   - Menu associations
   - Categories
   - Workload/MEP metrics
   - Hierarchical time-series data (year/month/week/day)

**API Endpoint**: `/api/bork/v2/products/aggregate`

### 4. Categories & Products Aggregation

**Source**: `bork_raw_data`  
**Destination**: Aggregated category-product relationships  
**Process**:
1. Categories extracted from sales
2. Products grouped by category
3. Category totals calculated
4. Top products per category identified

**API Endpoint**: `/api/bork/v2/categories-products/aggregate`

### 5. GraphQL Query

**Source**: `bork_aggregated`, `products_aggregated`  
**Destination**: UI Components  
**Process**:
1. UI components call GraphQL queries
2. GraphQL resolvers query aggregated collections
3. Data filtered, paginated, and formatted
4. Returned to UI via React Query

**GraphQL Query Example**:
```graphql
query {
  salesAggregated(
    startDate: "2025-01-01"
    endDate: "2025-01-31"
    locationId: "location-id"
    page: 1
    limit: 50
  ) {
    records {
      date
      revenue
      locationId
    }
    total
    page
    totalPages
  }
}
```

### 6. UI Display

**Source**: GraphQL Response  
**Destination**: React Components  
**Process**:
1. React Query caches GraphQL response
2. Components render data
3. Filters and pagination handled client-side
4. Real-time updates via query invalidation

---

## 👷 Labor Data Flow (Eitje)

### 1. Data Sync (Raw Data Collection)

**Source**: Eitje API  
**Destination**: `eitje_raw_data` collection  
**Process**:
1. API credentials configured in `/settings/eitje-api`
2. Sync triggered via `/api/eitje/v2/sync` or cron job
3. Raw shift data stored in MongoDB
4. Each record contains:
   - Worker information
   - Shift details
   - Hours worked
   - Team assignments
   - Location

**API Endpoint**: `/api/eitje/v2/sync`

### 2. Data Processing

**Source**: `eitje_raw_data`  
**Destination**: Processed hours data  
**Process**:
1. Raw shifts processed into hours
2. Hours aggregated by:
   - Worker
   - Team
   - Location
   - Date
3. Wage calculations applied
4. Processed data stored in processed collections

**API Endpoint**: `/api/eitje/v2/processed-hours`

### 3. Data Aggregation

**Source**: Processed hours  
**Destination**: `eitje_aggregated` collection  
**Process**:
1. Daily aggregation runs via cron or `/api/eitje/v2/aggregate`
2. Hours aggregated by:
   - Date
   - Location
   - Team
   - Worker
3. Calculated fields:
   - Daily totals
   - Labor costs
   - Team statistics
   - Worker performance
   - Hierarchical time-series data (year/month/week/day)

**API Endpoint**: `/api/eitje/v2/aggregate`

### 4. GraphQL Query

**Source**: `eitje_aggregated`  
**Destination**: UI Components  
**Process**:
1. UI components call GraphQL queries
2. GraphQL resolvers query aggregated collections
3. Data filtered by date range, location, team, worker
4. Pagination applied
5. Returned to UI via React Query

**GraphQL Query Example**:
```graphql
query {
  laborAggregated(
    startDate: "2025-01-01"
    endDate: "2025-01-31"
    locationId: "location-id"
  ) {
    records {
      date
      totalHours
      totalCost
      locationId
    }
  }
}
```

### 5. UI Display

**Source**: GraphQL Response  
**Destination**: React Components  
**Process**:
1. React Query caches GraphQL response
2. Components render hours, costs, productivity
3. Filters for location, team, worker
4. Time-based filtering (year/month/day)

---

## 📦 Product Data Flow

### 1. Product Extraction

**Source**: `bork_raw_data` (sales transactions)  
**Process**: Products extracted from sales data

### 2. Product Aggregation

**Source**: Extracted product data  
**Destination**: `products_aggregated` collection  
**Process**:
1. Products aggregated by name
2. Sales statistics calculated
3. Price history tracked
4. Categories assigned
5. Workload and MEP metrics calculated
6. Hierarchical time-series data built

**API Endpoint**: `/api/products/aggregate`

### 3. Hierarchical Time-Series

**Structure**:
```
products_aggregated {
  productName: "Pizza"
  salesByYear: [
    {
      year: "2025"
      byLocation: [...]
    }
  ]
  salesByMonth: [
    {
      year: "2025"
      month: "01"
      byLocation: [...]
    }
  ]
  salesByWeek: [...]
  salesByDay: [...]
}
```

**Purpose**: Fast queries for year/month/week/day ranges

**API Endpoint**: `/api/products/reaggregate-hierarchical`

### 4. GraphQL Query

**Source**: `products_aggregated`  
**Destination**: UI Components  
**Process**:
1. GraphQL resolvers check for hierarchical data
2. Route queries based on date range:
   - Year queries → `salesByYear`
   - Month queries → `salesByMonth`
   - Week queries → `salesByWeek`
   - Day queries → `salesByDay`
3. Fallback to calculation if hierarchical data missing

---

## 🔄 Aggregation Workflow

### Daily Aggregation

**Schedule**: Runs daily via cron jobs  
**Process**:
1. New raw data collected
2. Aggregated into daily totals
3. Hierarchical data updated
4. Old hierarchical data moved (week → month, month → year)

### Incremental Updates

**Process**:
1. Only new/changed data processed
2. Aggregations updated incrementally
3. Hierarchical data updated for current period
4. Historical data preserved

### Full Reaggregation

**Trigger**: Manual or when data structure changes  
**Process**:
1. All historical data reprocessed
2. Hierarchical structure rebuilt
3. Aggregations recalculated
4. Used for:
   - Initial setup
   - Data corrections
   - Structure changes

**API Endpoints**:
- `/api/products/reaggregate-hierarchical`
- `/api/eitje/v2/reaggregate-hierarchical`

---

## 📈 Performance Optimizations

### Aggregated Collections

**Why**: Raw data queries are slow (100k+ records)  
**Solution**: Pre-aggregated collections with daily totals  
**Benefit**: 10-100x faster queries

### Hierarchical Time-Series

**Why**: Date range queries on large datasets are slow  
**Solution**: Hierarchical structure (year → month → week → day)  
**Benefit**: O(1) lookups for year/month queries

### Database Indexes

**Indexes**:
- `bork_aggregated`: `{ locationId: 1, date: -1 }`
- `eitje_aggregated`: `{ locationId: 1, date: -1 }`
- `products_aggregated`: `{ productName: 1 }`

**Benefit**: Fast queries on indexed fields

### Pagination

**Why**: Loading all data is slow and memory-intensive  
**Solution**: Database-level pagination (skip/limit)  
**Benefit**: Fast queries, low memory usage

### Caching

**Server-Side**: ISR (Incremental Static Regeneration)
- 30-minute revalidation
- CDN cacheable
- Fast initial load

**Client-Side**: React Query
- 30-minute stale time
- Background refetching
- Optimistic updates

---

## 🔍 Data Validation

### Sync Validation

**Process**:
1. API response validated
2. Required fields checked
3. Data types verified
4. Duplicates prevented
5. Errors logged

### Aggregation Validation

**Process**:
1. Aggregation results validated
2. Totals verified against raw data
3. Data consistency checked
4. Errors reported

### Query Validation

**Process**:
1. Query parameters validated
2. Date ranges checked
3. Location/team IDs verified
4. Pagination limits enforced

---

## 🚨 Error Handling

### Sync Errors

**Handling**:
1. Errors logged
2. Failed syncs retried
3. Partial data saved if possible
4. Alerts sent for critical failures

### Aggregation Errors

**Handling**:
1. Errors logged
2. Aggregation retried
3. Fallback to previous aggregation
4. Manual intervention if needed

### Query Errors

**Handling**:
1. Errors returned to client
2. Error messages user-friendly
3. Fallback data shown if available
4. Retry mechanisms in place

---

## 🔗 Related Documentation

- **[Pages](./pages.md)** - Pages that display this data
- **[Components](./components.md)** - Components that render this data
- **[API Endpoints](./api-endpoints.md)** - Endpoints that provide this data
- **[Database](./database.md)** - Database schema and collections

---

**Last Updated**: 2025-01-XX








