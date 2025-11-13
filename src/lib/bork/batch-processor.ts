// Single responsibility: Process in batches
export async function processDatesInBatches(
  dates: string[],
  processFn: (date: string) => Promise<void>,
  batchDelay = 100
) {
  console.log('[Batch] Processing', dates.length, 'dates');
  
  for (const date of dates) {
    try {
      await processFn(date);
      console.log('[Batch] Completed date:', date);
    } catch (error) {
      console.error('[Batch] Error processing date', date, ':', error);
      // Continue with next date instead of failing completely
    }
    
    // Small delay between batches to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, batchDelay));
  }
  
  console.log('[Batch] Complete');
}

