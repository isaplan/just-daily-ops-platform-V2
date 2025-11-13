#!/bin/bash

echo "🚀 Re-aggregating all P&L data..."
echo ""

# Van Kinsbergen
echo "📍 Van Kinsbergen"
for year in 2023 2024 2025; do
  echo "  Year $year..."
  curl -s -X POST http://localhost:3000/api/finance/pnl-aggregate \
    -H "Content-Type: application/json" \
    -d "{\"locationId\":\"550e8400-e29b-41d4-a716-446655440001\",\"year\":$year,\"aggregateAll\":true}" | \
    grep -o '"message":"[^"]*"' | head -1
  sleep 0.5
done

echo ""
echo "📍 Bar Bea"
for year in 2023 2024 2025; do
  echo "  Year $year..."
  curl -s -X POST http://localhost:3000/api/finance/pnl-aggregate \
    -H "Content-Type: application/json" \
    -d "{\"locationId\":\"550e8400-e29b-41d4-a716-446655440002\",\"year\":$year,\"aggregateAll\":true}" | \
    grep -o '"message":"[^"]*"' | head -1
  sleep 0.5
done

echo ""
echo "📍 L'Amour Toujours"
for year in 2023 2024 2025; do
  echo "  Year $year..."
  curl -s -X POST http://localhost:3000/api/finance/pnl-aggregate \
    -H "Content-Type: application/json" \
    -d "{\"locationId\":\"550e8400-e29b-41d4-a716-446655440003\",\"year\":$year,\"aggregateAll\":true}" | \
    grep -o '"message":"[^"]*"' | head -1
  sleep 0.5
done

echo ""
echo "✨ Re-aggregation complete!"
