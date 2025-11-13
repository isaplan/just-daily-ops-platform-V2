#!/bin/bash

# Apply cron job migration
echo "🔄 Applying cron job migration..."
supabase db push

echo ""
echo "✅ Migration applied!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify jobs: node scripts/manage-cron-jobs.js status"
echo "  2. Check logs in Supabase dashboard"
echo ""
