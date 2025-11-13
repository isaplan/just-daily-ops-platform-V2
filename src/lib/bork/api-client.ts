// Single responsibility: Call Bork API
export async function testBorkConnection(baseUrl: string, apiKey: string, date: string) {
  console.log('[Bork API] Testing connection:', { baseUrl, date });
  
  const url = `${baseUrl}/ticket/day.json/${date}?appid=${apiKey}&IncInternal=True&IncOpen=True`;
  const response = await fetch(url);
  
  console.log('[Bork API] Response:', response.status);
  return response;
}

export async function fetchBorkData(baseUrl: string, apiKey: string, date: string) {
  console.log('[Bork API] Fetching data for:', date);
  
  const url = `${baseUrl}/ticket/day.json/${date}?appid=${apiKey}&IncInternal=True&IncOpen=True`;
  
  try {
    const response = await fetch(url);
    
    console.log('[Bork API] Fetch data response:', response.status);
    
    if (!response.ok) {
      throw new Error(`Bork API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Bork API] Fetched', Array.isArray(data) ? data.length : 'not array', 'records for', date);
    
    return data;
    
  } catch (error) {
    console.error('[Bork API] Fetch error:', error);
    
    // Return empty array for failed API calls instead of throwing
    console.log('[Bork API] Returning empty data due to API failure');
    return [];
  }
}
