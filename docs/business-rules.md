# Business Rules & App Rules

This document outlines the business rules and application rules that govern how the Just Daily Ops platform operates.

## Overview

Business rules define the logic, calculations, validations, and constraints that ensure data integrity and consistent behavior across the application.

---

## General Application Rules

### Data Validation

- **Required Fields**: All required fields must be validated before submission
- **Data Types**: All data must match expected types (string, number, date, etc.)
- **Date Ranges**: Start dates must be before end dates
- **Unique Constraints**: Unique identifiers (IDs, codes) must be validated for uniqueness

### Data Synchronization

- **API Sync Frequency**: 
  - Daily data syncs run automatically via cron jobs
  - Historical data syncs can be triggered manually
  - Master data syncs occur on-demand or scheduled
- **Conflict Resolution**: Last-write-wins for data conflicts
- **Error Handling**: Failed syncs are logged and can be retried

### User Permissions

- **Access Control**: Users must have appropriate permissions for each action
- **Location Scoping**: Users can only access data for their assigned locations
- **Role-Based Access**: Different roles have different levels of access

---

## Finance Rules

### Revenue Calculations

- **Revenue Ex VAT**: All revenue calculations exclude VAT by default
- **Revenue Incl VAT**: When needed, VAT is calculated at the standard rate
- **Currency**: All amounts are stored in the base currency (EUR)

### Cost Calculations

- **Labor Costs**: Calculated from hours × hourly rate
- **Product Costs**: Based on cost of goods sold (COGS)
- **Overhead Costs**: Distributed based on location and time period

### Profit & Loss (P&L)

- **Gross Profit**: Revenue - COGS
- **Net Profit**: Gross Profit - Operating Expenses
- **Profit Margin**: (Net Profit / Revenue) × 100

### Date Ranges

- **Fiscal Periods**: Aligned with calendar months
- **Reporting Periods**: Can be daily, weekly, monthly, quarterly, or yearly
- **Historical Data**: Available for all past periods

---

## Labor Rules

### Hours Tracking

- **Time Format**: Hours are stored as decimal values (e.g., 7.5 hours = 7 hours 30 minutes)
- **Rounding**: Hours are rounded to 2 decimal places
- **Minimum Hours**: Minimum shift duration is 0.5 hours
- **Maximum Hours**: Maximum shift duration is 16 hours (safety limit)

### Wage Calculations

- **Hourly Rates**: Based on worker contracts and roles
- **Overtime**: Calculated based on local labor laws
- **Holiday Pay**: Applied according to contract terms
- **Tax Deductions**: Calculated based on tax brackets and regulations

### Productivity Metrics

- **Revenue per Hour**: Total revenue / Total labor hours
- **Labor Cost Percentage**: (Labor costs / Revenue) × 100
- **Productivity Score**: Revenue per hour compared to target

### Team Structure

- **Team Assignment**: Workers must be assigned to a team
- **Location Assignment**: Teams belong to specific locations
- **Role Hierarchy**: Managers, supervisors, and workers have different access levels

---

## Sales Rules

### Transaction Processing

- **Payment Methods**: Cash, card, mobile payments, and other methods are tracked
- **Transaction IDs**: Each transaction has a unique identifier
- **Refunds**: Refunds are tracked as negative transactions
- **Void Transactions**: Voided transactions are marked but not deleted

### Product Sales

- **Product Identification**: Products are identified by name and category
- **Price Tracking**: Prices are tracked per transaction (historical pricing)
- **Quantity**: Quantities are always positive integers
- **Discounts**: Discounts are applied as percentage or fixed amount

### Revenue Attribution

- **Location Revenue**: Revenue is attributed to the location where the sale occurred
- **Waiter Attribution**: Sales can be attributed to specific waiters
- **Table Attribution**: Sales can be attributed to specific tables
- **Time Attribution**: Sales are attributed to the date/time of transaction

### Categories

- **Category Hierarchy**: Products belong to categories (e.g., Food, Beverages, Desserts)
- **Category Aggregation**: Sales are aggregated by category for reporting
- **Top Categories**: Top 10 categories are highlighted in reports

---

## Data Aggregation Rules

### Aggregated Collections

- **Daily Aggregations**: Data is aggregated daily for performance
- **Hierarchical Data**: Time-series data is stored hierarchically (year → month → week → day)
- **Incremental Updates**: Only new/changed data is updated in aggregations
- **Data Retention**: Raw data is retained for historical analysis

### Query Performance

- **Pagination**: All list queries use pagination (default: 50 items per page)
- **Index Usage**: Queries must use indexed fields for performance
- **Caching**: Aggregated data is cached for 30 minutes (ISR)
- **Stale Time**: Client-side data is considered stale after 30 minutes

### Data Consistency

- **Single Source of Truth**: Aggregated collections are the source of truth for queries
- **Raw Data**: Raw data is only used for diagnostics and detailed analysis
- **Data Validation**: All aggregated data is validated before storage

---

## Page-Specific Rules

### Dashboard Pages

- **Default Date Range**: Current month by default
- **Location Filter**: "All Locations" is the default selection
- **Real-Time Updates**: Data refreshes every 5 minutes
- **KPI Calculations**: KPIs are calculated server-side for accuracy

### Data View Pages

- **Pagination**: 50 items per page by default
- **Sorting**: Default sort by date (newest first)
- **Filtering**: Filters are applied server-side
- **Export**: Data can be exported to CSV/Excel

### Settings Pages

- **API Credentials**: Credentials are encrypted at rest
- **Connection Testing**: API connections are tested before saving
- **Sync Configuration**: Sync schedules can be configured per location
- **Validation**: All settings are validated before saving

### Product Pages

- **Product Status**: Products can be active or inactive
- **Category Assignment**: Products must belong to a category
- **Price History**: Price changes are tracked over time
- **Workload Metrics**: Products are categorized by workload (low/mid/high)
- **MEP Metrics**: Products are categorized by MEP (low/mid/high)

---

## Calculation Rules

### Percentages

- **Precision**: Percentages are calculated to 2 decimal places
- **Display**: Percentages are displayed with % symbol
- **Zero Division**: Division by zero returns 0 or null (handled gracefully)

### Currency

- **Formatting**: Currency is formatted with 2 decimal places
- **Symbol**: Currency symbol (€) is displayed with amounts
- **Rounding**: Amounts are rounded to 2 decimal places

### Averages

- **Mean Calculation**: Averages are calculated as sum / count
- **Weighted Averages**: When applicable, weighted averages are used
- **Null Handling**: Null values are excluded from average calculations

### Time Calculations

- **Time Zones**: All times are stored in UTC
- **Display**: Times are displayed in user's local timezone
- **Duration**: Durations are calculated in hours (decimal format)

---

## Validation Rules

### Form Validation

- **Required Fields**: Marked with asterisk (*) and validated on submit
- **Email Format**: Email addresses must match valid email format
- **Phone Numbers**: Phone numbers must match valid format
- **URLs**: URLs must be valid and accessible

### Data Validation

- **Date Validation**: Dates must be valid and within acceptable ranges
- **Number Validation**: Numbers must be within min/max ranges
- **String Validation**: Strings must not exceed maximum length
- **File Validation**: Uploaded files must match allowed types and sizes

### Business Logic Validation

- **Duplicate Prevention**: Duplicate records are prevented where applicable
- **Referential Integrity**: Foreign key relationships must be valid
- **State Transitions**: State changes must follow valid transitions
- **Workflow Validation**: Workflow steps must be completed in order

---

## Error Handling Rules

### User-Facing Errors

- **Error Messages**: Errors are displayed in user-friendly language
- **Error Codes**: Technical error codes are logged but not shown to users
- **Retry Logic**: Transient errors can be retried automatically
- **Error Recovery**: Users can recover from errors without losing data

### System Errors

- **Logging**: All errors are logged with context and stack traces
- **Monitoring**: Critical errors trigger alerts
- **Graceful Degradation**: System continues to function when non-critical errors occur
- **Error Reporting**: Errors are reported to monitoring systems

---

## Performance Rules

### Caching

- **Server-Side Caching**: ISR (Incremental Static Regeneration) with 30-minute revalidation
- **Client-Side Caching**: React Query with 30-minute stale time
- **CDN Caching**: Static assets are cached at CDN edge
- **Cache Invalidation**: Caches are invalidated when data changes

### Query Optimization

- **Database Indexes**: All queries use indexed fields
- **Pagination**: All list queries are paginated
- **Query Limits**: Queries are limited to prevent timeouts
- **Parallel Queries**: Independent queries run in parallel when possible

### Data Loading

- **Lazy Loading**: Data is loaded on-demand
- **Progressive Loading**: Critical data loads first, secondary data loads after
- **Prefetching**: Anticipated data is prefetched when possible
- **Loading States**: Loading indicators are shown during data fetches

---

## Security Rules

### Authentication

- **Session Management**: Sessions expire after inactivity
- **Password Requirements**: Passwords must meet complexity requirements
- **Multi-Factor Authentication**: MFA is required for sensitive operations
- **Token Expiration**: Access tokens expire after set duration

### Authorization

- **Role-Based Access**: Access is controlled by user roles
- **Location Scoping**: Users can only access their assigned locations
- **Permission Checks**: All actions check user permissions
- **Audit Logging**: All sensitive actions are logged

### Data Protection

- **Encryption**: Sensitive data is encrypted at rest and in transit
- **PII Protection**: Personally identifiable information is protected
- **Data Retention**: Data is retained according to retention policies
- **Data Deletion**: Deleted data is permanently removed after retention period

---

## Compliance Rules

### Data Privacy

- **GDPR Compliance**: User data is handled according to GDPR requirements
- **Data Minimization**: Only necessary data is collected and stored
- **User Consent**: User consent is obtained for data processing
- **Right to Deletion**: Users can request data deletion

### Financial Compliance

- **Audit Trails**: All financial transactions are logged
- **Reconciliation**: Financial data is reconciled regularly
- **Reporting**: Financial reports are generated according to regulations
- **Data Integrity**: Financial data cannot be modified after reconciliation

---

## Update Log

- **2025-01-XX**: Initial business rules documentation created
- **Future Updates**: This document will be updated as new rules are added or existing rules are modified

---

## Notes

- All rules are subject to change based on business requirements
- Rules are enforced at both the application and database levels
- Violations of rules are logged and may trigger alerts
- For questions about specific rules, contact the development team








