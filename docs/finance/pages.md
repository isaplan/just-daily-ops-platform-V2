# Finance Pages Documentation

Complete documentation of all pages in the Just Daily Ops Platform, organized by section.

## 📋 Overview

This document lists all pages in the application, their routes, purposes, and file locations. Pages are organized by their navigation sections.

---

## 🏠 Dashboard

### Main Dashboard
- **Route**: `/` or `/(dashboard)`
- **File**: `src/app/(dashboard)/page.tsx`
- **Status**: In Progress
- **Purpose**: Main landing page with KPIs and overview metrics
- **Features**: 
  - Dashboard overview
  - Key performance indicators
  - Quick navigation to main sections

---

## 📊 Data Section

### Finance Data

#### Profit & Loss
- **Route**: `/data/finance/pnl` (Coming Soon)
- **Status**: Coming Soon
- **Purpose**: Profit & Loss data viewing and analysis

#### PNL Balance
- **Route**: `/data/finance/pnl-balance` (Coming Soon)
- **Status**: Coming Soon
- **Purpose**: PNL balance analysis and reporting

#### Revenue
- **Route**: `/data/finance/revenue` (Coming Soon)
- **Status**: Coming Soon
- **Purpose**: Revenue data analysis

### Labor Data

#### Hours
- **Route**: `/data/labor/hours`
- **File**: `src/app/(dashboard)/data/labor/hours/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: View and analyze labor hours data
- **Features**:
  - Hours by location, team, and worker
  - Time-based filtering (year/month/day)
  - Hours aggregation and reporting
  - Worker hours breakdown

#### Labor Costs
- **Route**: `/data/labor/labor-cost`
- **File**: `src/app/(dashboard)/data/labor/labor-cost/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: View and analyze labor cost data
- **Features**:
  - Labor costs by location, team, and worker
  - Cost breakdown and analysis
  - Time-based filtering
  - Cost trends and reporting

#### Workers
- **Route**: `/data/labor/workers`
- **File**: `src/app/(dashboard)/data/labor/workers/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: View and manage worker data
- **Features**:
  - Worker profiles and information
  - Worker hours and costs
  - Team assignments
  - Location assignments
  - Worker performance metrics

#### Labor Productivity
- **Route**: `/data/labor/productivity`
- **File**: `src/app/(dashboard)/data/labor/productivity/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Analyze labor productivity metrics
- **Features**:
  - Productivity calculations
  - Revenue per hour
  - Labor cost percentage
  - Productivity goals and targets
  - Team and worker productivity comparisons

#### Locations & Teams
- **Route**: `/data/labor/locations-teams`
- **File**: `src/app/(dashboard)/data/labor/locations-teams/page.tsx`
- **Status**: In Progress
- **Purpose**: Manage locations and teams
- **Note**: Merged into Workers page in some views

### Sales Data

#### Daily Sales
- **Route**: `/data/sales/bork`
- **File**: `src/app/(dashboard)/data/sales/bork/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: View daily sales data from Bork
- **Features**:
  - Daily sales totals
  - Sales by location
  - Sales by category
  - Time-based filtering
  - Sales trends and analysis

#### Waiters
- **Route**: `/data/sales/bork/waiters`
- **File**: `src/app/(dashboard)/data/sales/bork/waiters/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Analyze waiter performance
- **Features**:
  - Waiter sales statistics
  - Waiter performance metrics
  - Sales attribution by waiter
  - Time-based analysis

#### Revenue
- **Route**: `/data/sales/bork/revenue`
- **File**: `src/app/(dashboard)/data/sales/bork/revenue/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Revenue breakdown and analysis
- **Features**:
  - Revenue by location
  - Revenue by category
  - Revenue trends
  - Time-based filtering

#### Payment Methods
- **Route**: `/data/sales/bork/payment-methods`
- **File**: `src/app/(dashboard)/data/sales/bork/payment-methods/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Analyze payment method usage
- **Features**:
  - Payment method statistics
  - Payment method trends
  - Payment method breakdown by location
  - Time-based analysis

#### Categories & Products
- **Route**: `/data/sales/categories-products`
- **File**: `src/app/(dashboard)/data/sales/categories-products/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Analyze sales by categories and products
- **Features**:
  - Category sales breakdown
  - Product sales analysis
  - Top products and categories
  - Sales trends by category/product

#### Products (Sales)
- **Route**: `/data/sales/bork/products`
- **File**: `src/app/(dashboard)/data/sales/bork/products/page.tsx`
- **Status**: In Progress
- **Purpose**: Product sales analysis

#### Tables
- **Route**: `/data/sales/bork/tables`
- **File**: `src/app/(dashboard)/data/sales/bork/tables/page.tsx`
- **Status**: In Progress
- **Purpose**: Table analysis and performance

#### Time Analysis
- **Route**: `/data/sales/bork/time-analysis`
- **File**: `src/app/(dashboard)/data/sales/bork/time-analysis/page.tsx`
- **Status**: In Progress
- **Purpose**: Time-based sales analysis

#### Transactions
- **Route**: `/data/sales/bork/transactions`
- **File**: `src/app/(dashboard)/data/sales/bork/transactions/page.tsx`
- **Status**: In Progress
- **Purpose**: Transaction-level sales data

### Reservations Data
- **Route**: `/data/reservations` (Coming Soon)
- **Status**: Coming Soon
- **Purpose**: Reservation data management

### Inventory Data
- **Route**: `/data/inventory` (Coming Soon)
- **Status**: Coming Soon
- **Purpose**: Inventory data management

---

## ⚡ Daily Operations

### Labor Operations

#### Labor Dashboard
- **Route**: `/daily-ops/labor`
- **File**: `src/app/(dashboard)/daily-ops/labor/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Daily labor operations dashboard
- **Features**:
  - Labor overview
  - Hours and costs summary
  - Team performance
  - Quick insights

#### Products
- **Route**: `/daily-ops/labor/products`
- **File**: `src/app/(dashboard)/daily-ops/labor/products/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Product analysis for labor operations
- **Features**:
  - Product workload analysis
  - MEP (Menu Engineering Profitability) metrics
  - Product performance

#### Time Analysis
- **Route**: `/daily-ops/labor/time-analysis`
- **File**: `src/app/(dashboard)/daily-ops/labor/time-analysis/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Time-based labor analysis
- **Features**:
  - Time patterns
  - Peak hours analysis
  - Labor distribution over time

#### Table Analysis
- **Route**: `/daily-ops/labor/tables`
- **File**: `src/app/(dashboard)/daily-ops/labor/tables/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Table performance analysis
- **Features**:
  - Table utilization
  - Table performance metrics
  - Table-based labor analysis

#### Transactions
- **Route**: `/daily-ops/labor/transactions`
- **File**: `src/app/(dashboard)/daily-ops/labor/transactions/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Transaction-level labor analysis
- **Features**:
  - Transaction details
  - Labor per transaction
  - Transaction patterns

### Keuken Analyses
- **Route**: `/daily-ops/keuken-analyses`
- **File**: `src/app/(dashboard)/daily-ops/keuken-analyses/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Kitchen (Keuken) analysis and insights
- **Features**:
  - Kitchen performance metrics
  - Food preparation analysis
  - Kitchen efficiency

### Other Daily Ops
- **Dashboard**: `/daily-ops` (Coming Soon)
- **Finance**: `/daily-ops/finance` (Coming Soon)
- **Inventory**: `/daily-ops/inventory` (Coming Soon)
- **AI & Analytics**: `/daily-ops/ai` (Coming Soon)
- **Reports**: `/daily-ops/reports` (Coming Soon)

---

## 🏭 Operations

### Products

#### Catalog
- **Route**: `/operations/products/catalog`
- **File**: `src/app/(dashboard)/operations/products/catalog/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Manage product catalog
- **Features**:
  - Product listing
  - Product creation and editing
  - Product categories
  - Product pricing
  - Workload and MEP metrics

### Menus

#### Manage Menus
- **Route**: `/operations/menus`
- **File**: `src/app/(dashboard)/operations/menus/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Menu management
- **Features**:
  - Menu creation and editing
  - Menu items management
  - Menu structure

### Events & Promotions

#### Events
- **Route**: `/operations/events-promotions/events`
- **File**: `src/app/(dashboard)/operations/events-promotions/events/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Event management
- **Features**:
  - Event creation and editing
  - Event scheduling
  - Event details

#### Socials
- **Route**: `/operations/events-promotions/socials`
- **File**: `src/app/(dashboard)/operations/events-promotions/socials/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Social media promotions management
- **Features**:
  - Social promotion creation
  - Social media integration
  - Promotion tracking

### Other Operations
- **Suppliers**: `/operations/suppliers` (Coming Soon)
- **Locations**: `/operations/locations` (Coming Soon)
- **Teams**: `/operations/teams` (Coming Soon)

---

## ⚙️ Settings

### Documentation
- **Route**: `/docs`
- **File**: `src/app/(dashboard)/docs/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Application documentation viewer
- **Features**:
  - Documentation navigation
  - Markdown rendering
  - Table of contents
  - Business rules documentation

### Data & Status
- **Route**: `/settings/data-status`
- **File**: `src/app/(dashboard)/settings/data-status/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: View data sync status and health
- **Features**:
  - Data sync status
  - API connection status
  - Data freshness indicators
  - Sync history

### API Connections

#### Eitje API Connect
- **Route**: `/settings/eitje-api`
- **File**: `src/app/(dashboard)/settings/eitje-api/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Configure Eitje API connections
- **Features**:
  - API credentials management
  - Connection testing
  - Sync configuration
  - Data sync management

#### Bork API Connect
- **Route**: `/settings/bork-api`
- **File**: `src/app/(dashboard)/settings/bork-api/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Configure Bork API connections
- **Features**:
  - API credentials management
  - Connection testing
  - Sync configuration
  - Daily and historical data sync
  - Master data sync

### Products Settings
- **Route**: `/settings/products`
- **File**: `src/app/(dashboard)/settings/products/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Product settings and configuration

### Menus Settings
- **Route**: `/settings/menus`
- **File**: `src/app/(dashboard)/settings/menus/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Menu settings and configuration

### Other Settings
- **Company Settings**: `/settings/company` (Coming Soon)

---

## 🧪 Demo & Testing

### SSR Demo
- **Route**: `/demo-ssr`
- **File**: `src/app/(dashboard)/demo-ssr/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Server-Side Rendering demonstration
- **Features**:
  - SSR examples
  - Performance comparison
  - ISR (Incremental Static Regeneration) demo

---

## 📦 Products

### Products Page
- **Route**: `/products`
- **File**: `src/app/(dashboard)/products/page.tsx`
- **Status**: ✅ Completed
- **Purpose**: Products overview and management
- **Features**:
  - Product listing
  - Product search and filtering
  - Product details

---

## 📝 Documentation Routes

### Documentation Index
- **Route**: `/docs`
- **File**: `src/app/(dashboard)/docs/page.tsx`
- **Purpose**: Main documentation page

### Business Rules
- **Route**: `/docs/business-rules`
- **File**: `src/app/(dashboard)/docs/business-rules/page.tsx`
- **Purpose**: Business rules documentation

### Finance Documentation
- **Route**: `/docs/finance`
- **File**: `src/app/(dashboard)/docs/finance/page.tsx`
- **Purpose**: Finance domain documentation

### Finance Documentation (Dynamic)
- **Route**: `/docs/finance/[slug]`
- **File**: `src/app/(dashboard)/docs/finance/[slug]/page.tsx`
- **Purpose**: Dynamic finance documentation pages

---

## 📊 Page Status Summary

### ✅ Completed Pages (30+)
- All Data Labor pages
- All Data Sales pages (main ones)
- Daily Ops Labor pages
- Operations Products, Menus, Events
- Settings pages
- Documentation pages

### 🚧 In Progress Pages
- Dashboard main page
- Some Sales analysis pages
- Finance data pages

### 🔜 Coming Soon Pages
- Finance data pages (PNL, Revenue)
- Reservations
- Inventory
- Some Daily Ops sections
- Some Operations sections

---

## 🎯 Page Architecture

### MVVM Pattern
All pages follow the MVVM (Model-View-ViewModel) pattern:

- **Model**: `src/models/[domain]/[feature].model.ts` - Data structures and types
- **View**: `src/app/(dashboard)/[route]/page.tsx` - Presentation layer
- **ViewModel**: `src/viewmodels/[domain]/use[Feature]ViewModel.ts` - Business logic
- **Service**: `src/lib/services/[domain]/[feature].service.ts` - Data fetching

### Server-Side Rendering (SSR)
Many pages use the hybrid SSR pattern:
- **Server Component**: `page.tsx` (fetches initial data)
- **Client Component**: `[Feature]Client.tsx` (handles interactivity)
- **ISR**: Incremental Static Regeneration with 30-minute revalidation

### Data Fetching
- **GraphQL**: Primary data fetching method
- **MongoDB**: Database backend
- **Aggregated Collections**: Used for performance (e.g., `products_aggregated`, `bork_aggregated`)
- **Pagination**: All list queries use database-level pagination

---

## 🔗 Related Documentation

- **[Database](./database.md)** - Database schema and structure
- **[Components](./components.md)** - React components used in pages
- **[API Endpoints](./api-endpoints.md)** - API endpoints used by pages
- **[Data Flow](./data-flow.md)** - How data flows through the system

---

**Last Updated**: 2025-01-XX










