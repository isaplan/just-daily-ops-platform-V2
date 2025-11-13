import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjeRevenueDays,
  // fetchEitjeAvailabilityShifts, // NOT NEEDED - Commented out per user request
  // fetchEitjeLeaveRequests, // NOT NEEDED - Commented out per user request
  // fetchEitjeEvents, // NOT NEEDED - Commented out per user request
  getEitjeCredentials
} from '@/lib/eitje/api-service';

/**
 * EITJE ENDPOINT STATUS API - EXTREME DEFENSIVE MODE
 * 
 * Provides comprehensive status information for all Eitje API endpoints
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /eitje/status] Status check request received');
    
    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();
    
    // DEFENSIVE: Define all endpoints with their configurations
    const endpointConfigs = [
      {
        name: 'environments',
        displayName: 'Environments',
        description: 'Locations/venues in the organization',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        fn: () => fetchEitjeEnvironments(baseUrl, credentials)
      },
      {
        name: 'teams',
        displayName: 'Teams',
        description: 'Teams within environments (e.g., kitchen, bar)',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        fn: () => fetchEitjeTeams(baseUrl, credentials)
      },
      {
        name: 'users',
        displayName: 'Users',
        description: 'Employee information',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        fn: () => fetchEitjeUsers(baseUrl, credentials)
      },
      {
        name: 'shift_types',
        displayName: 'Shift Types',
        description: 'Available shift types',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        fn: () => fetchEitjeShiftTypes(baseUrl, credentials)
      },
      {
        name: 'time_registration_shifts',
        displayName: 'Time Registration Shifts',
        description: 'Actual worked shifts with clock-in/out times',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
        fn: () => fetchEitjeTimeRegistrationShifts(baseUrl, credentials, '2024-10-24', '2024-10-25')
      },
      {
        name: 'planning_shifts',
        displayName: 'Planning Shifts',
        description: 'Planned/scheduled shifts',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
      },
      {
        name: 'revenue_days',
        displayName: 'Revenue Days',
        description: 'Daily revenue data per environment',
        category: 'revenue_data',
        requiresDates: true,
        maxDays: 90,
        fn: () => fetchEitjeRevenueDays(baseUrl, credentials, '2024-10-24', '2024-10-25')
      },
      // NOT NEEDED - Commented out per user request
      // {
      //   name: 'availability_shifts',
      //   displayName: 'Availability Shifts',
      //   description: 'Employee availability for shifts',
      //   category: 'labor_data',
      //   requiresDates: true,
      //   maxDays: 7,
      //   fn: () => fetchEitjeAvailabilityShifts(baseUrl, credentials, '2024-10-24', '2024-10-25')
      // },
      // {
      //   name: 'leave_requests',
      //   displayName: 'Leave Requests',
      //   description: 'Employee leave and time-off requests',
      //   category: 'labor_data',
      //   requiresDates: true,
      //   maxDays: 7,
      //   fn: () => fetchEitjeLeaveRequests(baseUrl, credentials, '2024-10-24', '2024-10-25')
      // },
      // {
      //   name: 'events',
      //   displayName: 'Events',
      //   description: 'Alternative shift data endpoint using POST method',
      //   category: 'labor_data',
      //   requiresDates: true,
      //   maxDays: 90,
      //   fn: () => fetchEitjeEvents(baseUrl, credentials, '2024-10-24', '2024-10-25')
      // }
    ];
    
    // DEFENSIVE: Test all endpoints with individual error handling
    const startTime = Date.now();
    const results: Record<string, any> = {};
    
    for (const config of endpointConfigs) {
      const endpointStartTime = Date.now();
      
      try {
        console.log(`[API /eitje/status] Testing ${config.name}...`);
        
        const data = await config.fn();
        const responseTime = Date.now() - endpointStartTime;
        
        results[config.name] = {
          success: true,
          status: 'healthy',
          dataCount: Array.isArray(data) ? data.length : 'not array',
          responseTime,
          hasData: !!data,
          error: null,
          lastChecked: new Date().toISOString(),
          config: {
            displayName: config.displayName,
            description: config.description,
            category: config.category,
            requiresDates: config.requiresDates,
            maxDays: config.maxDays
          }
        };
        
        console.log(`[API /eitje/status] ${config.name} - HEALTHY: ${Array.isArray(data) ? data.length : 'not array'} records`);
        
      } catch (error) {
        const responseTime = Date.now() - endpointStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results[config.name] = {
          success: false,
          status: 'unhealthy',
          dataCount: 0,
          responseTime,
          hasData: false,
          error: errorMessage,
          lastChecked: new Date().toISOString(),
          config: {
            displayName: config.displayName,
            description: config.description,
            category: config.category,
            requiresDates: config.requiresDates,
            maxDays: config.maxDays
          }
        };
        
        console.error(`[API /eitje/status] ${config.name} - UNHEALTHY:`, errorMessage);
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // DEFENSIVE: Analyze results by category
    const healthy = Object.values(results).filter(r => r.success).length;
    const unhealthy = Object.values(results).filter(r => !r.success).length;
    const total = Object.keys(results).length;
    
    const categoryStats = {
      master_data: {
        total: endpointConfigs.filter(c => c.category === 'master_data').length,
        healthy: Object.values(results).filter(r => r.success && r.config.category === 'master_data').length
      },
      labor_data: {
        total: endpointConfigs.filter(c => c.category === 'labor_data').length,
        healthy: Object.values(results).filter(r => r.success && r.config.category === 'labor_data').length
      },
      revenue_data: {
        total: endpointConfigs.filter(c => c.category === 'revenue_data').length,
        healthy: Object.values(results).filter(r => r.success && r.config.category === 'revenue_data').length
      }
    };
    
    console.log(`[API /eitje/status] Status check completed: ${healthy}/${total} healthy`);
    
    return NextResponse.json({
      success: true,
      message: `Eitje API status check completed: ${healthy}/${total} endpoints healthy`,
      summary: {
        total,
        healthy,
        unhealthy,
        totalTime,
        successRate: `${Math.round((healthy / total) * 100)}%`,
        categoryStats
      },
      endpoints: results,
      metadata: {
        baseUrl,
        checkedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('[API /eitje/status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check Eitje API status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
