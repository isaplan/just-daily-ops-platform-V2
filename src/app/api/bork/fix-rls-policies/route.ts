import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/fix-rls-policies] Fixing RLS policies...');
    
    const supabase = await createClient();
    
    // SQL to add missing RLS policies
    const policies = [
      // Product Groups policies
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert master data" ON bork_product_groups FOR INSERT WITH CHECK (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to update master data" ON bork_product_groups FOR UPDATE USING (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete master data" ON bork_product_groups FOR DELETE USING (auth.role() = 'authenticated')`,
      
      // Payment Methods policies
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert master data" ON bork_payment_methods FOR INSERT WITH CHECK (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to update master data" ON bork_payment_methods FOR UPDATE USING (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete master data" ON bork_payment_methods FOR DELETE USING (auth.role() = 'authenticated')`,
      
      // Cost Centers policies
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert master data" ON bork_cost_centers FOR INSERT WITH CHECK (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to update master data" ON bork_cost_centers FOR UPDATE USING (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete master data" ON bork_cost_centers FOR DELETE USING (auth.role() = 'authenticated')`,
      
      // Users policies
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert master data" ON bork_users FOR INSERT WITH CHECK (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to update master data" ON bork_users FOR UPDATE USING (auth.role() = 'authenticated')`,
      `CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete master data" ON bork_users FOR DELETE USING (auth.role() = 'authenticated')`
    ];

    const results = [];
    
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy });
        if (error) {
          console.error('Policy creation error:', error);
          results.push({ policy, success: false, error: error.message });
        } else {
          console.log('Policy created successfully');
          results.push({ policy, success: true });
        }
      } catch (error) {
        console.error('Policy creation failed:', error);
        results.push({ policy, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'RLS policies fix completed',
      results
    });

  } catch (error) {
    console.error('[API /bork/fix-rls-policies] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
