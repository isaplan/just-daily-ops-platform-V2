/**
 * Bork Master Data API Client (V2 - MongoDB)
 * 
 * Fetches master/catalog data from Bork API
 */

export interface BorkApiCredentials {
  baseUrl: string;
  apiKey: string;
}

/**
 * Fetch product groups from Bork API
 * 
 * @param baseUrl - Base URL for the location
 * @param apiKey - API key (appid parameter)
 * @returns Array of product group data
 */
export async function fetchBorkProductGroups(
  baseUrl: string,
  apiKey: string
): Promise<any[]> {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const url = `${cleanBaseUrl}/catalog/productgrouplist.json?appid=${apiKey}`;
    
    console.log(`[Bork API] Fetching product groups from: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bork API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[Bork API] Product groups response is not an array, returning empty array');
      return [];
    }

    return data;
  } catch (error: any) {
    console.error(`[Bork API] Error fetching product groups:`, error);
    throw new Error(`Failed to fetch Bork product groups: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch payment methods from Bork API
 * 
 * @param baseUrl - Base URL for the location
 * @param apiKey - API key (appid parameter)
 * @returns Array of payment method data
 */
export async function fetchBorkPaymentMethods(
  baseUrl: string,
  apiKey: string
): Promise<any[]> {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const url = `${cleanBaseUrl}/catalog/paymodegrouplist.json?appid=${apiKey}`;
    
    console.log(`[Bork API] Fetching payment methods from: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bork API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[Bork API] Payment methods response is not an array, returning empty array');
      return [];
    }

    return data;
  } catch (error: any) {
    console.error(`[Bork API] Error fetching payment methods:`, error);
    throw new Error(`Failed to fetch Bork payment methods: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch cost centers from Bork API
 * 
 * @param baseUrl - Base URL for the location
 * @param apiKey - API key (appid parameter)
 * @returns Array of cost center data
 */
export async function fetchBorkCostCenters(
  baseUrl: string,
  apiKey: string
): Promise<any[]> {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const url = `${cleanBaseUrl}/centers.json?appid=${apiKey}`;
    
    console.log(`[Bork API] Fetching cost centers from: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bork API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[Bork API] Cost centers response is not an array, returning empty array');
      return [];
    }

    return data;
  } catch (error: any) {
    console.error(`[Bork API] Error fetching cost centers:`, error);
    throw new Error(`Failed to fetch Bork cost centers: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch users/employees from Bork API
 * 
 * @param baseUrl - Base URL for the location
 * @param apiKey - API key (appid parameter)
 * @returns Array of user data
 */
export async function fetchBorkUsers(
  baseUrl: string,
  apiKey: string
): Promise<any[]> {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const url = `${cleanBaseUrl}/users.json?appid=${apiKey}`;
    
    console.log(`[Bork API] Fetching users from: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bork API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[Bork API] Users response is not an array, returning empty array');
      return [];
    }

    return data;
  } catch (error: any) {
    console.error(`[Bork API] Error fetching users:`, error);
    throw new Error(`Failed to fetch Bork users: ${error.message || 'Unknown error'}`);
  }
}





