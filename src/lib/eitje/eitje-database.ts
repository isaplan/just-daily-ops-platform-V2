// Single responsibility: Database operations - matches Bork's database.ts simplicity
import { createClient } from '@/integrations/supabase/server';

export async function saveEitjeRawData(
  tableName: string,
  data: unknown[]
) {
  console.log('[Eitje DB] Saving raw data:', { tableName, recordCount: data.length });
  
  const supabase = await createClient();
  
  const records = data.map(record => ({
    ...record,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  const { data: result, error } = await supabase
    .from(tableName)
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error('[Eitje DB] Save error:', error);
    throw error;
  }
  
  console.log('[Eitje DB] Saved successfully');
  return result;
}

export async function getEitjeCredentials() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('provider', 'eitje')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    throw new Error('No active Eitje credentials found');
  }
  
  return {
    baseUrl: data.base_url,
    credentials: data.additional_config
  };
}

export async function getEitjeRawData(
  tableName: string,
  limit: number = 1000
) {
  console.log('[Eitje DB] Fetching raw data:', { tableName, limit });
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[Eitje DB] Fetch error:', error);
    throw error;
  }
  
  console.log('[Eitje DB] Fetched', data?.length || 0, 'records');
  return data || [];
}
