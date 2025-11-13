// Compatibility layer - re-export simple functions for backward compatibility
export * from './eitje-api-client';
export * from './eitje-database';
export * from './eitje-types';

// Legacy compatibility - minimal wrapper for existing code
export function createEitjeApiService(config: unknown) {
  console.warn('[Eitje] createEitjeApiService is deprecated. Use direct functions from eitje-api-client.ts');
  
  return {
    fetchEnvironments: () => import('./eitje-api-client').then(m => m.fetchEitjeEnvironments(config.baseUrl, config.additional_config)),
    fetchTeams: () => import('./eitje-api-client').then(m => m.fetchEitjeTeams(config.baseUrl, config.additional_config)),
    fetchUsers: () => import('./eitje-api-client').then(m => m.fetchEitjeUsers(config.baseUrl, config.additional_config)),
    fetchShiftTypes: () => import('./eitje-api-client').then(m => m.fetchEitjeShiftTypes(config.baseUrl, config.additional_config)),
    fetchTimeRegistrationShifts: (startDate: string, endDate: string) => 
      import('./eitje-api-client').then(m => m.fetchEitjeTimeRegistrationShifts(config.baseUrl, config.additional_config, startDate, endDate)),
    fetchPlanningShifts: (startDate: string, endDate: string) => 
      import('./eitje-api-client').then(m => m.fetchEitjePlanningShifts(config.baseUrl, config.additional_config, startDate, endDate)),
    fetchRevenueDays: (startDate: string, endDate: string) => 
      import('./eitje-api-client').then(m => m.fetchEitjeRevenueDays(config.baseUrl, config.additional_config, startDate, endDate)),
    // NOT NEEDED - Commented out per user request
    // fetchAvailabilityShifts: (startDate: string, endDate: string) => 
    //   import('./eitje-api-client').then(m => m.fetchEitjeAvailabilityShifts(config.baseUrl, config.additional_config, startDate, endDate)),
    // fetchLeaveRequests: (startDate: string, endDate: string) => 
    //   import('./eitje-api-client').then(m => m.fetchEitjeLeaveRequests(config.baseUrl, config.additional_config, startDate, endDate)),
    // fetchEvents: (startDate: string, endDate: string) => 
    //   import('./eitje-api-client').then(m => m.fetchEitjeEvents(config.baseUrl, config.additional_config, startDate, endDate))
  };
}