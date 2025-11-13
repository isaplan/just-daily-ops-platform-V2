-- Check what columns actually exist in api_sync_logs table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'api_sync_logs'
ORDER BY ordinal_position;


