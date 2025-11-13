import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /bork/master-sync] Starting master data sync...');
    
    const { location_ids, endpoints } = await request.json();
    
    const supabase = await createClient();
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('bork-sync-master-data', {
      body: {
        location_ids: location_ids || [
          '550e8400-e29b-41d4-a716-446655440001', // Bar Bea
          '550e8400-e29b-41d4-a716-446655440002', // L'Amour Toujours  
          '550e8400-e29b-41d4-a716-446655440003'  // Van Kinsbergen
        ],
        endpoints: endpoints || ['product_groups', 'payment_methods', 'cost_centers', 'users']
      }
    });

    if (error) {
      console.error('[API /bork/master-sync] Edge function error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log('[API /bork/master-sync] Sync completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Master data sync completed',
      data: data
    });

  } catch (error) {
    console.error('[API /bork/master-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('[API /bork/master-sync] Checking master data status...');
    
    const supabase = await createClient();
    
    // Check status of all master data tables
    const [productGroups, paymentMethods, costCenters, users] = await Promise.all([
      supabase.from('bork_product_groups').select('count', { count: 'exact', head: true }),
      supabase.from('bork_payment_methods').select('count', { count: 'exact', head: true }),
      supabase.from('bork_cost_centers').select('count', { count: 'exact', head: true }),
      supabase.from('bork_users').select('count', { count: 'exact', head: true })
    ]);

    return NextResponse.json({
      success: true,
      status: {
        product_groups: { count: productGroups.count || 0 },
        payment_methods: { count: paymentMethods.count || 0 },
        cost_centers: { count: costCenters.count || 0 },
        users: { count: users.count || 0 }
      }
    });

  } catch (error) {
    console.error('[API /bork/master-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
