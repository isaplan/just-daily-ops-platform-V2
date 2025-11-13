import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjeRevenueDays,
  getEitjeCredentials
} from '@/lib/eitje/api-service';

/**
 * EITJE TEST ALL ENDPOINTS API - EXTREME DEFENSIVE MODE
 * 
 * Tests all available Eitje API endpoints with comprehensive error handling
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/test-all-endpoints] Test all endpoints request received');
    
    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();
    
    // DEFENSIVE: Define all endpoints to test
    const masterDataEndpoints = [
      { name: 'environments', fn: () => fetchEitjeEnvironments(baseUrl, credentials) },
      { name: 'teams', fn: () => fetchEitjeTeams(baseUrl, credentials) },
      { name: 'users', fn: () => fetchEitjeUsers(baseUrl, credentials) },
      { name: 'shift_types', fn: () => fetchEitjeShiftTypes(baseUrl, credentials) }
    ];
    
    const dataEndpoints = [
      { name: 'time_registration_shifts', fn: () => fetchEitjeTimeRegistrationShifts(baseUrl, credentials, '2024-10-24', '2024-10-25') },
      { name: 'revenue_days', fn: () => fetchEitjeRevenueDays(baseUrl, credentials, '2024-10-24', '2024-10-25') },
      { name: 'availability_shifts', fn: () => fetchEitjeAvailabilityShifts(baseUrl, credentials, '2024-10-24', '2024-10-25') },
      { name: 'leave_requests', fn: () => fetchEitjeLeaveRequests(baseUrl, credentials, '2024-10-24', '2024-10-25') },
      { name: 'events', fn: () => fetchEitjeEvents(baseUrl, credentials, '2024-10-24', '2024-10-25') }
    ];
    
    const allEndpoints = [...masterDataEndpoints, ...dataEndpoints];
    
    // DEFENSIVE: Test all endpoints with individual error handling
    const startTime = Date.now();
    const results: Record<string, any> = {};
    
    for (const endpoint of allEndpoints) {
      const endpointStartTime = Date.now();
      
      try {
        console.log(`[API /eitje/test-all-endpoints] Testing ${endpoint.name}...`);
        
        const data = await endpoint.fn();
        const responseTime = Date.now() - endpointStartTime;
        
        results[endpoint.name] = {
          success: true,
          dataCount: Array.isArray(data) ? data.length : 'not array',
          responseTime,
          hasData: !!data,
          error: null
        };
        
        console.log(`[API /eitje/test-all-endpoints] ${endpoint.name} - SUCCESS: ${Array.isArray(data) ? data.length : 'not array'} records`);
        
      } catch (error) {
        const responseTime = Date.now() - endpointStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results[endpoint.name] = {
          success: false,
          dataCount: 0,
          responseTime,
          hasData: false,
          error: errorMessage
        };
        
        console.error(`[API /eitje/test-all-endpoints] ${endpoint.name} - FAILED:`, errorMessage);
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // DEFENSIVE: Analyze results
    const successful = Object.values(results).filter(r => r.success).length;
    const total = Object.keys(results).length;
    const failed = total - successful;
    
    console.log(`[API /eitje/test-all-endpoints] Test completed: ${successful}/${total} successful`);
    
    return NextResponse.json({
      success: true,
      message: `Tested ${successful}/${total} endpoints successfully`,
      results,
      summary: {
        total,
        successful,
        failed,
        totalTime,
        successRate: `${Math.round((successful / total) * 100)}%`
      }
    });

  } catch (error) {
    console.error('[API /eitje/test-all-endpoints] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test all endpoints'
    }, { status: 500 });
  }
}
