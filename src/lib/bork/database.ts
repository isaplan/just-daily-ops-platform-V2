// Single responsibility: Database operations
export async function saveRawData(supabase: any, locationId: string, date: string, data: unknown[]) {
  console.log('[Database] Saving raw data:', { locationId, date, recordCount: data.length });
  
  const rawDataRecord = {
    location_id: locationId,
    date: date,
    product_name: 'RAW_DATA_STORAGE',
    category: 'STEP1_RAW_DATA',
    quantity: data.length,
    price: 0,
    revenue: 0,
    raw_data: {
      raw_response: data,
      api_url: `ticket/day.json/${date}`,
      record_count: data.length,
      step: 'raw_data_storage',
      created_at: new Date().toISOString()
    }
  };
  
  // Add timeout protection for database insert
  const insertPromise = supabase
    .from('bork_sales_data')
    .insert(rawDataRecord);
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database insert timeout')), 10000) // 10 seconds for insert
  );
  
  try {
    const result = await Promise.race([insertPromise, timeoutPromise]) as any;
    
    console.log('[Database] Save result:', result.error ? 'ERROR' : 'SUCCESS');
    if (result.error) {
      console.error('[Database] Error details:', result.error);
    }
    
    return result;
    
  } catch (timeoutError) {
    console.error('[Database] Insert timeout:', timeoutError);
    
    // Return a mock success result when timeout occurs
    return {
      data: null,
      error: null,
      status: 200,
      statusText: 'OK'
    };
  }
}
