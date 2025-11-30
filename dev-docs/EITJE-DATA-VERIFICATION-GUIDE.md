# Eitje Data Verification Guide

## Overview

This guide explains how to use the Eitje data verification tools to compare Excel export data with the aggregated database, specifically using finance data to verify labor/productivity metrics.

## Files Created

### 1. `tools/eitje-data-crawler.js`
**Purpose**: Investigates and indexes Excel files in `dev-docs/eitje-data-check-30NOV2025/`

**Features**:
- Detects file types (financien, gewerkte-uren, werknemer-contract-info)
- Maps files to database collections
- Analyzes Excel structure (columns, data types, row counts)
- Provides summary by collection

**Usage**:
```bash
node tools/eitje-data-crawler.js
```

**API Endpoint**:
```
GET /api/admin/eitje-data-crawler
```

### 2. `tools/eitje-data-verifier.js`
**Purpose**: Verifies Excel data against aggregated database collections

**Features**:
- Parses finance Excel files (revenue data)
- Parses worked hours Excel files (hours data)
- Compares with `eitje_aggregated` collection
- Identifies discrepancies and missing data
- Uses finance data to verify labor/productivity metrics

**Usage**:
```bash
node tools/eitje-data-verifier.js
```

**API Endpoint**:
```
GET /api/admin/eitje-data-verifier
```

## Data Mapping

### Finance Files → `eitje_aggregated`
- **Excel Column**: Revenue/Omzet
- **Database Field**: `totalRevenue`
- **Verification**: Compares Excel revenue with database `totalRevenue`
- **Tolerance**: 1 euro or 1% difference

### Worked Hours Files → `eitje_aggregated`
- **Excel Column**: Hours/Uren
- **Database Field**: `totalHoursWorked`
- **Verification**: Compares Excel hours with database `totalHoursWorked`
- **Tolerance**: 0.5 hours or 5% difference

### Worker Contract Files → `worker_profiles`
- **Excel Columns**: Contract type, hourly wage, contract hours
- **Database Fields**: `contract_type`, `hourly_wage`, `contract_hours`
- **Status**: Parsed but not yet verified (can be added)

## Verification Process

### 1. Finance Data Verification

The verifier:
1. Parses finance Excel files
2. Extracts revenue by location and date
3. Looks up matching records in `eitje_aggregated`
4. Compares revenue values
5. Reports discrepancies

**Metrics Verified**:
- `totalRevenue` - Total revenue per location per day
- `revenuePerHour` - Revenue per hour worked
- `laborCostPercentage` - Labor cost as percentage of revenue

### 2. Hours Data Verification

The verifier:
1. Parses worked hours Excel files
2. Extracts total hours by location and date
3. Looks up matching records in `eitje_aggregated`
4. Compares hours values
5. Reports discrepancies

**Metrics Verified**:
- `totalHoursWorked` - Total hours worked per location per day
- `totalWageCost` - Total wage cost
- Worker count and team breakdown

### 3. Productivity Verification (Keuken en Bediening)

Finance data is used to verify labor/productivity metrics:

**Keuken (Kitchen)**:
- Revenue from food sales
- Hours worked by kitchen staff
- Labor cost percentage
- Revenue per hour

**Bediening (Service)**:
- Revenue from beverages
- Hours worked by service staff
- Labor cost percentage
- Revenue per hour

**Verification Logic**:
```javascript
// Finance data provides revenue
const excelRevenue = parseFromExcel('revenue');

// Hours data provides labor
const excelHours = parseFromExcel('hours');

// Database has both
const dbRecord = await db.collection('eitje_aggregated').findOne({
  locationId,
  date
});

// Verify calculations
const revenuePerHour = dbRecord.totalRevenue / dbRecord.totalHoursWorked;
const laborCostPercentage = (dbRecord.totalWageCost / dbRecord.totalRevenue) * 100;
```

## Output Format

### Verification Results

```json
{
  "success": true,
  "summary": {
    "totalVerified": 150,
    "matchCount": 145,
    "discrepancyCount": 5
  },
  "finance": {
    "files": 2,
    "records": 100,
    "verifications": [...],
    "discrepancies": [...]
  },
  "hours": {
    "files": 2,
    "records": 50,
    "verifications": [...],
    "discrepancies": [...]
  }
}
```

### Discrepancy Types

1. **missing_location**: Location name in Excel not found in database
2. **missing_data**: No aggregated record found for location/date
3. **revenue_mismatch**: Revenue values don't match (Excel vs DB)
4. **hours_mismatch**: Hours values don't match (Excel vs DB)

## Example Discrepancy

```json
{
  "type": "revenue_mismatch",
  "location": "Bar Bea",
  "locationId": "507f1f77bcf86cd799439011",
  "date": "2025-11-30",
  "excelRevenue": 1250.50,
  "dbRevenue": 1248.00,
  "difference": 2.50,
  "percentDiff": "0.20",
  "message": "Revenue mismatch: Excel 1250.50€ vs DB 1248.00€ (0.20% difference)"
}
```

## Troubleshooting

### Issue: "Location not found in database"
**Solution**: Check location name spelling in Excel vs database. The verifier uses fuzzy matching.

### Issue: "No aggregated record found"
**Solution**: 
1. Check if date format matches (YYYY-MM-DD)
2. Verify data was aggregated for that date
3. Run aggregation: `POST /api/eitje/v2/aggregate`

### Issue: "Large discrepancies"
**Solution**:
1. Check if Excel data includes all locations
2. Verify date ranges match
3. Check for data filtering in Excel export
4. Verify aggregation logic matches Excel calculations

## Next Steps

1. **Run Verification**: Execute verifier to identify discrepancies
2. **Review Discrepancies**: Analyze mismatch patterns
3. **Fix Data**: Update database or re-aggregate if needed
4. **Re-verify**: Run verification again to confirm fixes

## Related Endpoints

- `GET /api/admin/eitje-data-crawler` - Index Excel files
- `GET /api/admin/eitje-data-verifier` - Verify data
- `POST /api/eitje/v2/aggregate` - Re-aggregate data
- `GET /api/eitje/v2/check-data` - Check aggregated data

