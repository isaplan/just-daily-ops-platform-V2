import { createClient } from "@/integrations/supabase/client";

interface UpdateConnectionStatusParams {
  location_id: string;
  status: string;
  tested_at: string;
  message: string;
}

export async function updateConnectionStatus(
  locationId: string,
  status: 'success' | 'failed',
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Try RPC function first
    try {
      const params: UpdateConnectionStatusParams = {
        location_id: locationId,
        status: status,
        tested_at: new Date().toISOString(),
        message: message
      };
      
      const { error } = await supabase.rpc('update_location_connection_status', params);

      if (error) throw error;
      
      console.log(`✅ Connection status updated for ${locationId}: ${status}`);
      return { success: true };
    } catch (rpcError) {
      console.log(`⚠️ RPC function failed, trying direct update:`, rpcError);
      
      // Fallback: Direct table update
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          bork_connection_status: status,
          bork_connection_tested_at: new Date().toISOString(),
          bork_connection_message: message
        })
        .eq('id', locationId);

      if (updateError) throw updateError;
      
      console.log(`✅ Connection status updated for ${locationId}: ${status} (direct update)`);
      return { success: true };
    }
  } catch (error) {
    let errorMsg = 'Unknown error';
    
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (error && typeof error === 'object') {
      errorMsg = JSON.stringify(error);
    }
    
    console.error(`❌ Failed to update connection status:`, errorMsg);
    console.error(`❌ Full error object:`, error);
    return { success: false, error: errorMsg };
  }
}
