# API Endpoints Documentation

Complete documentation of all API endpoints in the Just Daily Ops Platform.

## 📋 Overview

This document lists all API endpoints, organized by domain. All endpoints are RESTful and located in `src/app/api/`.

---

## 🔐 Authentication

All API endpoints require authentication (unless otherwise noted). Authentication is handled via session cookies or API keys.

---

## 📊 GraphQL API

### GraphQL Endpoint
- **Route**: `/api/graphql`
- **Method**: POST
- **Purpose**: Main GraphQL API endpoint
- **Schema**: Defined in `src/lib/graphql/v2-schema.ts`
- **Resolvers**: Defined in `src/lib/graphql/v2-resolvers.ts`

**Query Examples**:
```graphql
query {
  locations {
    id
    name
  }
  
  salesAggregated(startDate: "2025-01-01", endDate: "2025-01-31") {
    records {
      date
      revenue
      locationId
    }
  }
}
```

---

## 📦 Products API

### Get Products
- **Route**: `/api/products`
- **Method**: GET
- **Purpose**: Get products list
- **Query Parameters**:
  - `page` (optional): Page number
  - `limit` (optional): Items per page
  - `search` (optional): Search term
  - `category` (optional): Filter by category

### Aggregate Products
- **Route**: `/api/products/aggregate`
- **Method**: POST
- **Purpose**: Aggregate product data
- **Body**: Aggregation parameters

### Reaggregate Hierarchical
- **Route**: `/api/products/reaggregate-hierarchical`
- **Method**: POST
- **Purpose**: Rebuild hierarchical time-series data for products

### Update Product Category
- **Route**: `/api/products/update-category`
- **Method**: POST
- **Body**: `{ productName, category }`

### Update Product Workload
- **Route**: `/api/products/update-workload`
- **Method**: POST
- **Body**: `{ productName, workloadLevel }`

### Update Product MEP
- **Route**: `/api/products/update-mep`
- **Method**: POST
- **Body**: `{ productName, mepLevel }`

### Update Product Location
- **Route**: `/api/products/update-location`
- **Method**: POST
- **Body**: `{ productName, locationId }`

### Update Product Course Type
- **Route**: `/api/products/update-course-type`
- **Method**: POST
- **Body**: `{ productName, courseType }`

### Get Product Price History
- **Route**: `/api/products/[productName]/price-history`
- **Method**: GET
- **Purpose**: Get price history for a product

### Diagnose Uncategorized Products
- **Route**: `/api/products/diagnose-uncategorized`
- **Method**: GET
- **Purpose**: Find products without categories

### Reaggregate Uncategorized Products
- **Route**: `/api/products/reaggregate-uncategorized`
- **Method**: POST
- **Purpose**: Reaggregate products without categories

---

## 🍽️ Menus API

### Get Menus
- **Route**: `/api/menus`
- **Method**: GET
- **Purpose**: Get all menus

### Get Menu by ID
- **Route**: `/api/menus/[id]`
- **Method**: GET
- **Purpose**: Get specific menu

### Get Menu Products
- **Route**: `/api/menus/[id]/products`
- **Method**: GET
- **Purpose**: Get products in a menu

### Auto-Populate Menu Products
- **Route**: `/api/menus/[id]/products/auto-populate`
- **Method**: POST
- **Purpose**: Auto-populate menu with products

### Migrate Product Prices
- **Route**: `/api/menus/migrate-product-prices`
- **Method**: POST
- **Purpose**: Migrate product prices to menus

### Refresh Prices
- **Route**: `/api/menus/refresh-prices`
- **Method**: POST
- **Purpose**: Refresh menu product prices

---

## 🎉 Events API

### Get Events
- **Route**: `/api/events`
- **Method**: GET
- **Purpose**: Get all events

### Get Event by ID
- **Route**: `/api/events/[id]`
- **Method**: GET
- **Purpose**: Get specific event

---

## 💼 Workforce API

### Get Productivity Data
- **Route**: `/api/workforce/productivity`
- **Method**: GET
- **Purpose**: Get productivity data

### Get Enhanced Productivity
- **Route**: `/api/workforce/productivity-enhanced`
- **Method**: GET
- **Purpose**: Get enhanced productivity metrics

### Aggregate Productivity
- **Route**: `/api/workforce/productivity/aggregate`
- **Method**: POST
- **Purpose**: Aggregate productivity data

### Check Productivity Data
- **Route**: `/api/workforce/productivity/check-data`
- **Method**: GET
- **Purpose**: Check productivity data status

---

## 🛒 Bork API (Sales)

### V2 Endpoints

#### Get Sales Data
- **Route**: `/api/bork/v2/sales`
- **Method**: GET
- **Purpose**: Get aggregated sales data
- **Query Parameters**:
  - `startDate`: Start date (ISO format)
  - `endDate`: End date (ISO format)
  - `locationId` (optional): Filter by location
  - `category` (optional): Filter by category
  - `page` (optional): Page number
  - `limit` (optional): Items per page

#### Sync Data
- **Route**: `/api/bork/v2/sync`
- **Method**: POST
- **Purpose**: Sync Bork data
- **Body**: Sync parameters

#### Aggregate Data
- **Route**: `/api/bork/v2/aggregate`
- **Method**: POST
- **Purpose**: Aggregate Bork sales data

#### Master Sync
- **Route**: `/api/bork/v2/master-sync`
- **Method**: POST
- **Purpose**: Sync master data from Bork

#### Check Data
- **Route**: `/api/bork/v2/check-data`
- **Method**: GET
- **Purpose**: Check Bork data status
- **Query Parameters**:
  - `month` (optional): Month number
  - `year` (optional): Year

#### Cron Job
- **Route**: `/api/bork/v2/cron`
- **Method**: POST
- **Purpose**: Trigger Bork sync cron job

#### Get Products
- **Route**: `/api/bork/v2/products`
- **Method**: GET
- **Purpose**: Get Bork products

#### Aggregate Products
- **Route**: `/api/bork/v2/products/aggregate`
- **Method**: POST
- **Purpose**: Aggregate product data from Bork

#### Get Categories
- **Route**: `/api/bork/v2/categories`
- **Method**: GET
- **Purpose**: Get Bork categories

#### Aggregate Categories & Products
- **Route**: `/api/bork/v2/categories-products/aggregate`
- **Method**: POST
- **Purpose**: Aggregate categories and products data

---

## 👷 Eitje API (Labor)

### V2 Endpoints

#### Sync Data
- **Route**: `/api/eitje/v2/sync`
- **Method**: POST
- **Purpose**: Sync Eitje labor data

#### Aggregate Data
- **Route**: `/api/eitje/v2/aggregate`
- **Method**: POST
- **Purpose**: Aggregate Eitje labor data

#### Get Aggregated Hours
- **Route**: `/api/eitje/v2/aggregated-hours`
- **Method**: GET
- **Purpose**: Get aggregated hours data

#### Get Processed Hours
- **Route**: `/api/eitje/v2/processed-hours`
- **Method**: GET
- **Purpose**: Get processed hours data

#### Check Data
- **Route**: `/api/eitje/v2/check-data`
- **Method**: GET
- **Purpose**: Check Eitje data status
- **Query Parameters**:
  - `month` (optional): Month number
  - `year` (optional): Year

#### Get Progress
- **Route**: `/api/eitje/v2/progress`
- **Method**: GET
- **Purpose**: Get sync progress

#### Cron Job
- **Route**: `/api/eitje/v2/cron`
- **Method**: POST
- **Purpose**: Trigger Eitje sync cron job

#### Reaggregate Hierarchical
- **Route**: `/api/eitje/v2/reaggregate-hierarchical`
- **Method**: POST
- **Purpose**: Rebuild hierarchical time-series data for labor

#### Get Unique Teams
- **Route**: `/api/eitje/v2/unique-teams`
- **Method**: GET
- **Purpose**: Get unique teams from Eitje data

### Connection Testing
- **Route**: `/api/eitje/test-connection`
- **Method**: POST
- **Purpose**: Test Eitje API connection

---

## 🔧 Admin API

### Data Management

#### Check Data
- **Route**: `/api/admin/check-data`
- **Method**: GET
- **Purpose**: Check data status across collections

#### Check Location Data
- **Route**: `/api/admin/check-location-data`
- **Method**: GET
- **Purpose**: Check data for specific location

#### Check Team Data
- **Route**: `/api/admin/check-team-data`
- **Method**: GET
- **Purpose**: Check team data

#### Check Processed Shifts
- **Route**: `/api/admin/check-processed-shifts`
- **Method**: GET
- **Purpose**: Check processed shift data

#### Check Shift Collections
- **Route**: `/api/admin/check-shift-collections`
- **Method**: GET
- **Purpose**: Check shift collection status

### Database Management

#### Database Stats
- **Route**: `/api/admin/database-stats`
- **Method**: GET
- **Purpose**: Get database statistics

#### Database Integrity
- **Route**: `/api/admin/database-integrity`
- **Method**: GET
- **Purpose**: Check database integrity

#### System Status
- **Route**: `/api/admin/system-status`
- **Method**: GET
- **Purpose**: Get system status

#### Status Cache
- **Route**: `/api/admin/status-cache`
- **Method**: GET
- **Purpose**: Get status cache

#### Update Status Cache
- **Route**: `/api/admin/update-status-cache`
- **Method**: POST
- **Purpose**: Update status cache

### Location Management

#### Check Locations
- **Route**: `/api/admin/check-locations`
- **Method**: GET
- **Purpose**: Check locations data

#### Create Locations
- **Route**: `/api/admin/create-locations`
- **Method**: POST
- **Purpose**: Create locations

#### Map Eitje to Locations
- **Route**: `/api/admin/map-eitje-to-locations`
- **Method**: POST
- **Purpose**: Map Eitje locations to app locations

### Worker Management

#### Seed Workers
- **Route**: `/api/admin/seed-workers`
- **Method**: POST
- **Purpose**: Seed worker data

#### Import Worker Contracts
- **Route**: `/api/admin/import-worker-contracts`
- **Method**: POST
- **Purpose**: Import worker contracts

#### Parse Worker Contracts
- **Route**: `/api/admin/parse-worker-contracts`
- **Method**: POST
- **Purpose**: Parse worker contract files

#### Diagnose Workers Without Teams
- **Route**: `/api/admin/diagnose-workers-without-teams`
- **Method**: GET
- **Purpose**: Find workers without team assignments

#### Aggregate Worker Teams
- **Route**: `/api/admin/aggregate-worker-teams`
- **Method**: POST
- **Purpose**: Aggregate worker team data

### Product Management

#### Migrate Products to Aggregated
- **Route**: `/api/admin/migrate-products-to-aggregated`
- **Method**: POST
- **Purpose**: Migrate products to aggregated collection

### Keuken Analyses

#### Aggregate Keuken Analyses
- **Route**: `/api/admin/keuken-analyses/aggregate`
- **Method**: POST
- **Purpose**: Aggregate kitchen analysis data

### Monitoring

#### Check Cron Jobs
- **Route**: `/api/admin/check-cron-jobs`
- **Method**: GET
- **Purpose**: Check cron job status

#### Check Endpoints Status
- **Route**: `/api/admin/check-endpoints-status`
- **Method**: GET
- **Purpose**: Check API endpoints status

#### Check Environments
- **Route**: `/api/admin/check-environments`
- **Method**: GET
- **Purpose**: Check environment configuration

#### Get All Environments
- **Route**: `/api/admin/get-all-environments`
- **Method**: GET
- **Purpose**: Get all environment configurations

### Data Inspection

#### Inspect Raw Record
- **Route**: `/api/admin/inspect-raw-record`
- **Method**: GET
- **Purpose**: Inspect raw data record

#### Inspect Revenue Record
- **Route**: `/api/admin/inspect-revenue-record`
- **Method**: GET
- **Purpose**: Inspect revenue record

### Data Archiving

#### Archive Data
- **Route**: `/api/admin/archive-data`
- **Method**: POST
- **Purpose**: Archive old data

### Registry Management

#### Registry Update
- **Route**: `/api/admin/registry-update`
- **Method**: POST
- **Purpose**: Update function registry

### Login History

#### Get Login History
- **Route**: `/api/admin/login-history`
- **Method**: GET
- **Purpose**: Get user login history

---

## 📚 Documentation API

### Get Documentation
- **Route**: `/api/docs`
- **Method**: GET
- **Purpose**: Get markdown documentation file
- **Query Parameters**:
  - `path`: Path to markdown file (e.g., `docs/README.md`)
- **Security**: Only allows files from `docs/` directory

---

## 🔄 API Patterns

### Pagination
Most list endpoints support pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

### Filtering
Many endpoints support filtering:
- `startDate` / `endDate`: Date range filtering
- `locationId`: Filter by location
- `category`: Filter by category
- `search`: Search term

### Response Format
Standard response format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error response format:
```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

### Authentication
- Session-based authentication (cookies)
- API key authentication (for external access)
- Role-based access control

---

## 🔗 Related Documentation

- **[Pages](./pages.md)** - Pages that use these endpoints
- **[Components](./components.md)** - Components that call these endpoints
- **[Data Flow](./data-flow.md)** - How data flows through the API

---

**Last Updated**: 2025-01-XX










