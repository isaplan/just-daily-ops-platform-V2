# Finance Domain Documentation

Complete documentation for the Finance domain of Just Daily Ops Platform.

## 📋 Overview

The Finance domain handles:
- **P&L (Profit & Loss)** data import, aggregation, and analysis
- **PowerBI Integration** for importing financial data
- **Financial Reporting** and analytics
- **COGS (Cost of Goods Sold)** calculations

## 📚 Documentation Sections

### [Database](./database.md)
Complete database schema, tables, relationships, and COGS calculation formulas.

### [Pages](./pages.md)
All finance pages in the application, their purpose, and file locations.

### [Components](./components.md)
Finance-specific React components and their usage.

### [API Endpoints](./api-endpoints.md)
All finance-related API endpoints with parameters and responses.

### [Data Flow](./data-flow.md)
Complete data flow from PowerBI import → aggregation → display.

### [Data Mapping](./data-mapping.md)
**SSoT** for P&L category and subcategory mappings. Critical reference for aggregation logic.

## 🔑 Key Concepts

### COGS Calculation Formula
```
Resultaat = Revenue - COST_OF_SALES - LABOR_COST - OTHER_UNDEFINED_COGS
```

### Data Flow Overview
1. **Import**: PowerBI Excel files → `powerbi_pnl_data` (raw)
2. **Aggregation**: Raw data → `powerbi_pnl_aggregated` (calculated)
3. **Display**: Aggregated data → UI Pages

### Best Practices
- ✅ Always use aggregated tables for UI display
- ✅ Never calculate on the fly - data is pre-calculated
- ✅ Use `/api/finance/pnl-aggregated-data` for pages
- ❌ Don't query `powerbi_pnl_data` directly in UI

## 🚀 Quick Links

- **Main P&L Page**: `/finance/pnl`
- **P&L Balance**: `/finance/pnl/balance`
- **PowerBI Import**: `/finance/imports/powerbi-import`
- **Finance Dashboard**: `/finance`

