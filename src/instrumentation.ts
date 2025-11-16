/**
 * Next.js Instrumentation Hook
 * 
 * This file runs once when the server starts.
 * Use it to initialize services like cron jobs.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize cron manager on server startup
    const { getCronManager } = await import('@/lib/cron/v2-cron-manager');
    const cronManager = getCronManager();
    
    // Ensure cron manager is initialized
    await cronManager.initialize();
    
    console.log('[Instrumentation] Cron manager initialized on server startup');
  }
}


