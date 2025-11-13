# Bork API Integration Documentation

## Overview
This document describes the integration with the Bork POS API for automated sales data import.

## Authentication
- Method: Token-based (vendor-specific)
- Header (try in this order):
  - `Authorization: Bearer {API_KEY}`
  - `Authorization: Token token={API_KEY}`
- Security: API keys are unique per location and stored encrypted in the database

## Base URLs per Location
Each location has its own API endpoint:
- **Haagse Nieuwe**: `https://api-haagse-nieuwe.bork.nl`
- (Additional locations to be configured as needed)

## Primary Endpoint: Daily Sales Data

### `/ticket/day.json`

**Purpose**: Retrieve all sales transactions for a specific date

**Method**: GET

**Parameters**:
- `date` (required): Date in format `YYYYMMDD` (no dashes)
- Example: `/ticket/day.json?date=20240115`

**Response Structure**:
```json
[
  {
    "ticketNumber": "12345",
    "ticketDate": "2024-01-15",
    "isInternal": false,
    "orders": [
      {
        "orderLines": [
          {
            "name": "Product Name",
            "quantity": 2,
            "price": 5.50,
            "totalIncVAT": 11.00,
            "product": {
              "productGroupName": "Category Name"
            }
          }
        ]
      }
    ]
  }
]
```

**Key Fields**:
- `ticketNumber`: Unique transaction identifier
- `ticketDate`: Date of the transaction
- `isInternal`: Boolean flag for internal transactions (these are filtered out)
- `orders`: Array of orders within the ticket
- `orderLines`: Individual line items in the order
  - `name`: Product name
  - `quantity`: Quantity sold
  - `price`: Unit price
  - `totalIncVAT`: Total revenue including VAT
  - `product.productGroupName`: Product category

## Data Transformation

### Mapping to bork_sales_data Table

| Bork API Field | Database Column | Notes |
|----------------|-----------------|-------|
| orderLine.name | product_name | Direct mapping |
| orderLine.product.productGroupName | category | May be null |
| orderLine.quantity | quantity | Numeric |
| orderLine.price | price | Unit price |
| orderLine.totalIncVAT | revenue | Total with VAT |
| ticket.ticketDate | date | ISO date format |
| Full orderLine object | raw_data | JSONB for reference |

### Filtering Rules
1. **Skip Internal Transactions**: Any ticket with `isInternal: true` is excluded
2. **Nested Iteration**: 
   - Loop through tickets → orders → orderLines
   - Each orderLine becomes one database row

## Implementation Details

### Date Range Processing
- The system requests data day-by-day for the specified range
- Each date is requested separately: `/ticket/day.json?date=YYYYMMDD`
- This ensures complete data retrieval even for large date ranges

### Override Strategy
When syncing data:
1. Delete all existing records for the location + date range
2. Insert fresh records from API
3. This ensures data is always up-to-date and matches the source

### Batch Processing
- Records are inserted in batches of 500
- This optimizes database performance for large imports

### Error Handling
- Connection errors are logged and reported
- Failed syncs are tracked in `bork_api_sync_logs`
- Partial failures don't corrupt existing data (delete happens after successful fetch)

## Security Considerations

### Credential Storage
- API keys stored in `api_credentials` table (unified credentials system)
- Encrypted at rest by Supabase
- RLS policies restrict access to owners only
- Never exposed to frontend JavaScript

### Server-Side Execution
- All API calls made from Edge Function (`bork-api-sync`)
- Credentials retrieved server-side only
- JWT verification ensures authenticated requests

### Audit Trail
- Every sync operation logged in `bork_api_sync_logs`
- Tracks: who triggered, when, date range, records processed
- Failed syncs include error messages for troubleshooting

## Additional Endpoints (Available but Not Currently Used)

### `/catalog/productgrouplist.json`
Returns list of product groups/categories

### `/catalog/paymodegrouplist.json`
Returns payment methods

### `/centers.json`
Returns list of cost centers

### `/users.json`
Returns list of users/employees

## Rate Limiting
- Not explicitly documented by Bork API
- Current implementation: sequential day-by-day requests
- Future enhancement: Implement exponential backoff on errors

## Best Practices

1. **Daily Syncs**: Run syncs daily to keep data fresh
2. **Date Range Selection**: Use reasonable ranges (7-30 days) for manual syncs
3. **Credential Rotation**: Update API keys if compromised
4. **Monitor Sync Logs**: Check for failed syncs regularly
5. **Test Connection**: Use "Test Connection" feature when configuring new locations

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Verify API key is correct
- Check if API key is active in Bork system
- Ensure base URL matches location

**No Data Returned**
- Verify date format (YYYYMMDD)
- Check if location had sales on that date
- Confirm date is not in the future

**Partial Data**
- Check for internal transactions (filtered out)
- Verify date range is correct
- Review sync logs for specific error messages

## Future Enhancements

1. **Scheduled Syncs**: Automated daily syncs via cron
2. **Real-time Webhooks**: Receive notifications of new sales
3. **Category Mapping**: Link Bork categories to internal product categories
4. **Delta Syncs**: Only fetch changed/new records (if API supports)
5. **Rate Limiting**: Implement intelligent throttling

## Hybrid Aggregation System

### Overview
The system now supports three methods for triggering data aggregation:

1. **Automatic**: Runs after raw data processing
2. **Manual**: User-triggered via "Refresh Sales Data" button
3. **Auto-refresh**: Background checks every 5 minutes

### Manual Aggregation API

**Endpoint**: `/api/bork/aggregate`
**Method**: POST
**Purpose**: Manually trigger aggregation for processed data

**Parameters**:
- `locationId`: UUID of the location (optional - aggregates all if not provided)
- `startDate`: Start date for aggregation (optional)
- `endDate`: End date for aggregation (optional)
- `forceFull`: Boolean to force full aggregation (optional)

**Response**:
```json
{
  "success": true,
  "results": {
    "location_id": {
      "success": true,
      "aggregatedDates": ["2025-01-25"],
      "errors": [],
      "incremental": true
    }
  },
  "summary": {
    "totalLocations": 3,
    "successfulLocations": 3,
    "totalAggregatedDates": 15,
    "totalErrors": 0,
    "incrementalCount": 3,
    "fullCount": 0
  }
}
```

### Auto-Refresh Mechanism

**Frequency**: Every 5 minutes
**Behavior**: 
- Checks for new data automatically
- Only reloads if new aggregated data is found
- Runs silently in background
- Can be toggled on/off by user

**Configuration**:
- Toggle switch in sales page UI
- Default: Enabled
- Visual indicator shows last refresh time

### Incremental Aggregation

**Timestamp Tracking**: Uses `last_location_aggregation` column
**Efficiency**: Only processes dates with updated raw data
**Fallback**: Full aggregation if timestamp tracking fails

### Visual Feedback

**Sales Page Features**:
- "Refresh Sales Data" button with loading state
- Last refresh time indicator
- Auto-refresh toggle switch
- Success/error notifications

**Status Indicators**:
- Loading spinner during aggregation
- Green timestamp for successful refresh
- Error messages for failed operations

## Support

For Bork API issues, contact Bork support.
For implementation questions, review the Edge Function code at `supabase/functions/bork-api-sync/index.ts`
