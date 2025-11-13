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
 * EITJE ENDPOINT TESTING API
 * 
 * Tests individual Eitje API endpoints with small date ranges
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/test-endpoint] Endpoint test request received');
    
    const body = await request.json();
    const { 
      endpoint,
      startDate = '2024-10-24', 
      endDate = '2024-10-25'
    } = body;

    // DEFENSIVE: Validate required parameters
    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: endpoint is required'
      }, { status: 400 });
    }

    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();

    // DEFENSIVE: Simple direct test using new simple functions
    const startTime = Date.now();
    
    try {
      let data;
      
      // Use simple function calls based on endpoint
      switch (endpoint) {
        case 'environments':
          data = await fetchEitjeEnvironments(baseUrl, credentials);
          break;
        case 'teams':
          data = await fetchEitjeTeams(baseUrl, credentials);
          break;
        case 'users':
          data = await fetchEitjeUsers(baseUrl, credentials);
          break;
        case 'shift_types':
          data = await fetchEitjeShiftTypes(baseUrl, credentials);
          break;
        case 'time_registration_shifts':
          data = await fetchEitjeTimeRegistrationShifts(baseUrl, credentials, startDate, endDate);
          break;
        // case 'planning_shifts': // NOT NEEDED - Commented out per user request
        //   data = await fetchEitjePlanningShifts(baseUrl, credentials, startDate, endDate);
        //   break;
        case 'revenue_days':
          data = await fetchEitjeRevenueDays(baseUrl, credentials, startDate, endDate);
          break;
        // NEW ENDPOINTS - EXTREME DEFENSIVE MODE
        case 'availability_shifts':
          data = await fetchEitjeAvailabilityShifts(baseUrl, credentials, startDate, endDate);
          break;
        case 'leave_requests':
          data = await fetchEitjeLeaveRequests(baseUrl, credentials, startDate, endDate);
          break;
        case 'events':
          data = await fetchEitjeEvents(baseUrl, credentials, startDate, endDate);
          break;
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown endpoint: ${endpoint}`
          }, { status: 400 });
      }
      
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        message: `Endpoint ${endpoint} test successful`,
        result: {
          endpoint,
          success: true,
          responseTime,
          statusCode: 200,
          dataCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
        }
      });
      
    } catch (fetchError) {
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: false,
        error: `Fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        details: {
          endpoint,
          responseTime,
          errorType: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'
        }
      }, { status: 502 });
    }

  } catch (error) {
    console.error('[API /eitje/test-endpoint] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test endpoint'
    }, { status: 500 });
  }
}
