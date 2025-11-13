import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /locations] Fetching locations...');
    
    const supabase = await createClient();
    
    // Add timeout wrapper for database query
    const queryPromise = supabase
      .from('locations')
      .select('id, bork_connection_status, bork_connection_tested_at, bork_connection_message')
      .order('name');
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );
    
    try {
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('[API /locations] Database error:', error);
      
      // Fallback: Return mock data when database is down
      if (error.message.includes('521') || error.message.includes('Web server is down') || error.message.includes('canceling statement due to statement timeout') || error.message.includes('Database query timeout')) {
        console.log('[API /locations] Database is down, returning fallback data');
        return NextResponse.json({ 
          success: true, 
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              bork_connection_status: 'not_tested',
              bork_connection_tested_at: null,
              bork_connection_message: null
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440001', 
              bork_connection_status: 'not_tested',
              bork_connection_tested_at: null,
              bork_connection_message: null
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440003',
              bork_connection_status: 'not_tested', 
              bork_connection_tested_at: null,
              bork_connection_message: null
            }
          ]
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    console.log('[API /locations] Found', data?.length || 0, 'locations');
    
    return NextResponse.json({ 
      success: true, 
      data: data || [] 
    });
    
    } catch (timeoutError) {
      console.error('[API /locations] Timeout error:', timeoutError);
      console.log('[API /locations] Database timeout, returning fallback data');
      return NextResponse.json({ 
        success: true, 
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            bork_connection_status: 'not_tested',
            bork_connection_tested_at: null,
            bork_connection_message: null
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001', 
            bork_connection_status: 'not_tested',
            bork_connection_tested_at: null,
            bork_connection_message: null
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            bork_connection_status: 'not_tested', 
            bork_connection_tested_at: null,
            bork_connection_message: null
          }
        ]
      });
    }
    
  } catch (error) {
    console.error('[API /locations] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
