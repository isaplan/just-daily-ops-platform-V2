/**
 * View Data Service Layer
 * Data fetching for view data pages
 */

import { ViewDataOverview } from "@/models/misc/view-data.model";

/**
 * Fetch view data overview
 */
export async function fetchViewDataOverview(): Promise<ViewDataOverview> {
  return {
    dataSources: [
      {
        id: "eitje-data",
        name: "Eitje Data",
        description: "View hours, finance, workers, and locations data from Eitje",
        route: "/finance/data/eitje-data",
      },
    ],
  };
}



