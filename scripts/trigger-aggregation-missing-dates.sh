#!/bin/bash

# Trigger aggregation for missing dates (Oct 11-30 for labor, Oct 9-29 for revenue)
# This aggregates all the missing data identified by the gap check

echo "🚀 Triggering aggregation for missing dates..."
echo ""

# Get Supabase URL and key from .env.local
if [ -f .env.local ]; then
  SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
  SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)
else
  echo "❌ .env.local file not found"
  echo "   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY manually"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  echo "   SUPABASE_URL: ${SUPABASE_URL:-NOT SET}"
  echo "   SERVICE_KEY: ${SERVICE_KEY:-NOT SET}"
  exit 1
fi

EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/eitje-aggregate-data"

echo "📡 Edge function URL: $EDGE_FUNCTION_URL"
echo ""

# Trigger Labor Hours aggregation (Oct 11-30)
echo "⏳ Triggering Labor Hours aggregation (Oct 11-30)..."
LABOR_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "time_registration_shifts",
    "startDate": "2025-10-11",
    "endDate": "2025-10-30"
  }')

LABOR_HTTP_STATUS=$(echo "$LABOR_RESPONSE" | grep "HTTP_STATUS:" | cut -d ':' -f2)
LABOR_BODY=$(echo "$LABOR_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Labor Hours Response:"
echo "$LABOR_BODY" | jq '.' 2>/dev/null || echo "$LABOR_BODY"
echo "HTTP Status: $LABOR_HTTP_STATUS"
echo ""

if [ "$LABOR_HTTP_STATUS" = "200" ]; then
  echo "✅ Labor Hours aggregation triggered successfully!"
else
  echo "❌ Labor Hours aggregation failed. Check the error above."
fi

echo ""
echo "---"
echo ""

# Wait a moment before next request
sleep 2

# Trigger Revenue Days aggregation (Oct 9-29)
echo "⏳ Triggering Revenue Days aggregation (Oct 9-29)..."
REVENUE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "revenue_days",
    "startDate": "2025-10-09",
    "endDate": "2025-10-29"
  }')

REVENUE_HTTP_STATUS=$(echo "$REVENUE_RESPONSE" | grep "HTTP_STATUS:" | cut -d ':' -f2)
REVENUE_BODY=$(echo "$REVENUE_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Revenue Days Response:"
echo "$REVENUE_BODY" | jq '.' 2>/dev/null || echo "$REVENUE_BODY"
echo "HTTP Status: $REVENUE_HTTP_STATUS"
echo ""

if [ "$REVENUE_HTTP_STATUS" = "200" ]; then
  echo "✅ Revenue Days aggregation triggered successfully!"
else
  echo "❌ Revenue Days aggregation failed. Check the error above."
fi

echo ""
echo "📋 Next steps:"
echo "  1. Wait a few seconds for aggregation to complete"
echo "  2. Check aggregated tables:"
echo "     SELECT COUNT(*), MAX(date) FROM eitje_labor_hours_aggregated;"
echo "     SELECT COUNT(*), MAX(date) FROM eitje_revenue_days_aggregated;"
echo "  3. Run gap check SQL again to verify all dates are aggregated"
echo "  4. Check edge function logs in Supabase Dashboard"



