# Bork Haagse Nieuwe API Documentation

**Source**: Bork API Export v2 Specification  
**Base URL**: `https://dash-api-prod-01.thisisbork.com/api`

## Authentication

Requires API credentials configured in the system.

## Endpoints

### Tickets Export (Primary Endpoint)

**GET** `/ticket/day.json/{{date}}`  

Returns all tickets (orders) for a specific date.

**URL Parameters**:
- `date`: Date in YYYY-MM-DD format (e.g., `2025-10-16`)

**Query Parameters** (all optional):
- `appid`: Application ID filter
- `IncInternal`: Include internal tickets (boolean)
- `IncOpen`: Include open tickets (boolean)
- `IncTraining`: Include training tickets (boolean)
- `IncFreeAddons`: Include free addons (boolean)

**Example URL**:
```
https://dash-api-prod-01.thisisbork.com/api/ticket/day.json/2025-10-16?appid=123&IncInternal=true
```

## Response Structure

### Ticket Object

```typescript
interface BorkTicket {
  id: number;
  ticketNumber: string;
  date: string;  // ISO datetime
  locationId: number;
  locationName: string;
  totalAmount: number;
  totalAmountExVat: number;
  vatAmount: number;
  status: 'paid' | 'open' | 'cancelled';
  
  orders: BorkOrder[];
}
```

### Order Object (Nested in Ticket)

```typescript
interface BorkOrder {
  id: number;
  orderNumber: string;
  createdAt: string;  // ISO datetime
  
  orderLines: BorkOrderLine[];
}
```

### Order Line Object (Nested in Order)

```typescript
interface BorkOrderLine {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  category?: string;
  subCategory?: string;
  
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalPriceExVat: number;
  
  vatRate: number;
  vatAmount: number;
  
  costPrice?: number;
  modifiers?: BorkModifier[];
}
```

### Modifier Object (Nested in Order Line)

```typescript
interface BorkModifier {
  id: number;
  name: string;
  price: number;
}
```

## Data Hierarchy

```
Ticket (receipt/transaction)
  ├─ Order (grouped items)
  │   ├─ OrderLine (individual product)
  │   │   ├─ Product details
  │   │   ├─ Pricing (inc/ex VAT)
  │   │   └─ Modifiers (add-ons)
  │   └─ OrderLine
  └─ Order
```

## Field Mapping to Database

### Bork Sales Data Table

Map the nested structure to flat records:

```typescript
interface BorkSalesDataRecord {
  import_id: string;
  location_id: string;
  
  // From Ticket
  date: string;  // Extract date from ticket
  
  // From OrderLine
  product_name: string;
  product_sku?: string;
  category?: string;
  
  quantity: number;
  price: number;  // unitPrice
  
  revenue: number;  // totalPrice (inc VAT)
  revenue_ex_vat: number;  // totalPriceExVat
  revenue_inc_vat: number;  // totalPrice
  
  vat_rate: number;
  vat_amount: number;
  
  cost_price?: number;
  
  raw_data: object;  // Store complete ticket → order → orderLine
}
```

## Extraction Logic

```typescript
// Pseudo-code for extraction
for each ticket in response:
  extract location_id from ticket.locationId
  extract date from ticket.date
  
  for each order in ticket.orders:
    for each orderLine in order.orderLines:
      create record {
        product_name: orderLine.productName,
        quantity: orderLine.quantity,
        price: orderLine.unitPrice,
        revenue: orderLine.totalPrice,
        revenue_ex_vat: orderLine.totalPriceExVat,
        vat_rate: orderLine.vatRate,
        vat_amount: orderLine.vatAmount,
        raw_data: { ticket, order, orderLine }
      }
```

## Location Matching

Bork ticket includes `locationName` (e.g., "Haagse Nieuwe"). Use fuzzy matching to link to internal location records:

```sql
SELECT * FROM match_location_fuzzy('Haagse Nieuwe');
```

## Best Practices

1. **Daily Sync**: Fetch data daily for previous day
2. **Incremental Updates**: Check for updated tickets via timestamp
3. **Raw Data Storage**: Always store complete nested structure in `raw_data`
4. **Category Extraction**: Use `category` and `subCategory` when available
5. **Modifier Handling**: Include modifier costs in product pricing

## Test Mode

When testing Bork API:
1. Use a recent date (yesterday or today)
2. Check response for nested structure
3. Verify location name matches internal records
4. Inspect orderLines for complete product data

## Error Handling

| Status | Cause | Solution |
|--------|-------|----------|
| 401 | Invalid credentials | Check API credentials |
| 404 | No data for date | Verify date has transactions |
| 400 | Invalid date format | Use YYYY-MM-DD format |

## TypeScript Interfaces

```typescript
export interface BorkApiResponse {
  tickets: BorkTicket[];
  metadata?: {
    date: string;
    count: number;
  };
}

export interface BorkTicket {
  id: number;
  ticketNumber: string;
  date: string;
  locationId: number;
  locationName: string;
  totalAmount: number;
  totalAmountExVat: number;
  vatAmount: number;
  status: string;
  orders: BorkOrder[];
}

export interface BorkOrder {
  id: number;
  orderNumber: string;
  createdAt: string;
  orderLines: BorkOrderLine[];
}

export interface BorkOrderLine {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  category?: string;
  subCategory?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalPriceExVat: number;
  vatRate: number;
  vatAmount: number;
  costPrice?: number;
  modifiers?: BorkModifier[];
}

export interface BorkModifier {
  id: number;
  name: string;
  price: number;
}
```

## Changelog

- **2025-10-16**: Initial documentation created
