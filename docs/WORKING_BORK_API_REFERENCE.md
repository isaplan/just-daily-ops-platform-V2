# Working Bork API Reference

## ✅ CONFIRMED WORKING API URL

**Bar Bea API Endpoint:**
```
https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com/ticket/day.json/20251013?appid=1f518c6dce0a466d8d0f7c95b0717de4&IncOpen=True&IncInternal=True
```

## 🔑 Required Parameters

The Bork API **REQUIRES** these exact parameters:
- `appid=1f518c6dce0a466d8d0f7c95b0717de4` (API Key)
- `IncOpen=True` (Include Open Orders)
- `IncInternal=True` (Include Internal Orders)

## 📊 API Response Format

The API returns JSON with this structure:
```json
[
  {
    "$type": "ETC.Sales.Export.Data.Ticket, ETC.Sales",
    "ActualDate": 10101,
    "CenterKey": "7700876361729",
    "CenterLeftNr": 1,
    "CenterName": "Bar Bea",
    "CenterNr": "",
    "CenterRightNr": 2,
    "Key": "3316131364423660",
    "Orders": [
      {
        "$type": "ETC.Sales.Export.Data.Order, ETC.Sales",
        "ActualDate": 20251025,
        "Date": 20251025,
        "Key": "3317230876349988",
        "Lines": [
          {
            "$type": "ETC.Sales.Export.Data.OrderLine, ETC.Sales",
            "Addons": [],
            "CourseName": "",
            "GroupKey": "3300738201550870",
            "GroupLeftNr": 83,
            "GroupName": "Cocktails",
            "GroupNr": 8003,
            "GroupRightNr": 84,
            "Key": "3386500108517377",
            "Memo": "",
            "MenuId": "",
            "Price": 11.00000000,
            "ProductKey": "3308434782945822",
            "ProductName": "Aperol Spritz",
            "ProductNr": 230005,
            "ProductType": "SalesProduct",
            "ProductTypeTranslated": "Product",
            "Qty": 1.0,
            "TotalEx": 9.090909090909090909090909091,
            "TotalInc": 11.00000000,
            "Units": 1,
            "VatNr": 1,
            "VatPerc": 21.0000
          }
        ],
        "Paymodes": [],
        "PcName": "BAR-BEA01",
        "PcNr": 1,
        "TableNr": 16,
        "TicketKey": "3316131364423660",
        "Time": "21:06:37",
        "UserId": "`",
        "UserKey": "14297946128408",
        "UserName": "Andre"
      }
    ],
    "PcName": "BAR-BEA02",
    "PcNr": 59,
    "PrepStatus": "Processing",
    "RefundedBy": "",
    "RefundFor": "",
    "TableName": "",
    "TableNr": 16,
    "Time": "00:00:00",
    "TotalPrice": 12.70000000,
    "TotalToPay": 12.70,
    "UserId": "",
    "UserKey": "0",
    "UserName": "Andre"
  }
]
```

## 🏢 All Location Credentials

**Bar Bea:**
- Location ID: `550e8400-e29b-41d4-a716-446655440002`
- API Key: `1f518c6dce0a466d8d0f7c95b0717de4`
- Base URL: `https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com`

**L'Amour Toujours:**
- Location ID: `550e8400-e29b-41d4-a716-446655440003`
- API Key: `1f518c6dce0a466d8d0f7c95b0717de4`
- Base URL: `https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com`

**Van Kinsbergen:**
- Location ID: `550e8400-e29b-41d4-a716-446655440001`
- API Key: `1f518c6dce0a466d8d0f7c95b0717de4`
- Base URL: `https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com`

## 🚨 Critical Implementation Notes

1. **ALL API calls MUST include**: `&IncOpen=True&IncInternal=True`
2. **Date format**: YYYYMMDD (no dashes)
3. **API Key**: Same for all locations (`1f518c6dce0a466d8d0f7c95b0717de4`)
4. **Base URLs**: Different for each location

## 📝 Last Updated
- Date: January 2025
- Status: ✅ CONFIRMED WORKING
- Source: Developer provided working URL

