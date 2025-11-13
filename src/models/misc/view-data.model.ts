/**
 * View Data Model Layer
 * Type definitions for view data pages
 */

export interface ViewDataOverview {
  dataSources: Array<{
    id: string;
    name: string;
    description: string;
    route: string;
  }>;
}



