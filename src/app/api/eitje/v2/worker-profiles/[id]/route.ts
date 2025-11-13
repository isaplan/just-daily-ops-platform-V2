import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * GET /api/eitje/v2/worker-profiles/[id]
 * Get single worker profile by ID
 * 
 * Returns: { success: boolean, data: {...}, error?: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error) {
      console.error('[API /eitje/v2/worker-profiles/[id]] Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Worker profile not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[API /eitje/v2/worker-profiles/[id]] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch worker profile'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/eitje/v2/worker-profiles/[id]
 * Update worker profile (for live editing)
 * 
 * Body: {
 *   contract_type?: string,
 *   contract_hours?: number,
 *   hourly_wage?: number,
 *   wage_override?: boolean,
 *   effective_from?: DATE,
 *   effective_to?: DATE,
 *   notes?: string
 * }
 * 
 * Returns: { success: boolean, data: {...}, error?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const supabase = await createClient();

    // Update profile
    const { data, error } = await supabase
      .from('worker_profiles')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(id, 10))
      .select()
      .single();

    if (error) {
      console.error('[API /eitje/v2/worker-profiles/[id]] Update error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Worker profile not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[API /eitje/v2/worker-profiles/[id]] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update worker profile'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/eitje/v2/worker-profiles/[id]
 * Delete worker profile
 * 
 * Returns: { success: boolean, error?: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = await createClient();

    const { error } = await supabase
      .from('worker_profiles')
      .delete()
      .eq('id', parseInt(id, 10));

    if (error) {
      console.error('[API /eitje/v2/worker-profiles/[id]] Delete error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Worker profile deleted successfully'
    });

  } catch (error) {
    console.error('[API /eitje/v2/worker-profiles/[id]] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete worker profile'
    }, { status: 500 });
  }
}

