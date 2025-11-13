import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/disable-rls] Disabling RLS for master data tables...');
    
    const supabase = await createClient();
    
    // Disable RLS for master data tables
    const tables = ['bork_product_groups', 'bork_payment_methods', 'bork_cost_centers', 'bork_users'];
    
    const results = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY` 
        });
        
        if (error) {
          console.error(`RLS disable error for ${table}:`, error);
          results.push({ table, success: false, error: error.message });
        } else {
          console.log(`RLS disabled for ${table}`);
          results.push({ table, success: true });
        }
      } catch (error) {
        console.error(`RLS disable failed for ${table}:`, error);
        results.push({ table, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'RLS disabled for master data tables',
      results
    });

  } catch (error) {
    console.error('[API /bork/disable-rls] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
