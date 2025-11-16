/**
 * Bork API Client (V2 - MongoDB)
 * 
 * Fetches sales data from Bork API for a specific date range
 */

export interface BorkApiCredentials {
  baseUrl: string;
  apiKey: string;
}

/**
 * Fetch Bork API data for a specific date
 * 
 * @param baseUrl - Base URL for the location (e.g., https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com)
 * @param apiKey - API key (appid parameter)
 * @param date - Date in YYYYMMDD format (e.g., "20251013")
 * @returns Array of ticket data
 */
export async function fetchBorkDataForDate(
  baseUrl: string,
  apiKey: string,
  date: string
): Promise<any[]> {
  try {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Build API URL: {baseUrl}/ticket/day.json/{YYYYMMDD}?appid={apiKey}&IncOpen=True&IncInternal=True
    const url = `${cleanBaseUrl}/ticket/day.json/${date}?appid=${apiKey}&IncOpen=True&IncInternal=True`;
    
    console.log(`[Bork API] Fetching data from: ${url.replace(apiKey, '***')}`);
    
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
    
    // Bork API returns an array of tickets
    if (!Array.isArray(data)) {
      console.warn('[Bork API] Response is not an array, returning empty array');
      return [];
    }

    return data;
  } catch (error: any) {
    console.error(`[Bork API] Error fetching data for date ${date}:`, error);
    throw new Error(`Failed to fetch Bork API data: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch Bork API data for a date range
 * 
 * @param baseUrl - Base URL for the location
 * @param apiKey - API key
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of ticket data for all dates in range
 */
export async function fetchBorkDataForDateRange(
  baseUrl: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  // Convert YYYY-MM-DD to YYYYMMDD and generate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const allData: any[] = [];

  // Iterate through each date in the range
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`; // YYYYMMDD format

    try {
      const dayData = await fetchBorkDataForDate(baseUrl, apiKey, dateStr);
      allData.push(...dayData);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`[Bork API] Error fetching data for ${dateStr}:`, error.message);
      // Continue with next date even if one fails
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return allData;
}


