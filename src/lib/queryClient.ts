import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Log to Supabase execution_logs table
async function logQueryExecution(
  type: 'query' | 'mutation',
  queryKey: any,
  startTime: number,
  endTime: number,
  success: boolean,
  error?: any
) {
  try {
    await supabase.from('execution_logs').insert({
      execution_type: type,
      query_key: JSON.stringify(queryKey),
      duration_ms: endTime - startTime,
      success,
      error_message: error?.message || null,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    });
  } catch (err) {
    console.error('[Query Logger] Failed to log execution:', err);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      const endTime = performance.now();
      const startTime = query.state.dataUpdatedAt || endTime;
      
      console.log('[Query Success]', {
        queryKey: query.queryKey,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        dataSize: JSON.stringify(data).length
      });

      logQueryExecution('query', query.queryKey, startTime, endTime, true);
    },
    onError: (error, query) => {
      const endTime = performance.now();
      const startTime = query.state.dataUpdatedAt || endTime;
      
      console.error('[Query Error]', {
        queryKey: query.queryKey,
        error: error.message,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });

      logQueryExecution('query', query.queryKey, startTime, endTime, false, error);
    }
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      const endTime = performance.now();
      const startTime = mutation.state.submittedAt || endTime;
      
      console.log('[Mutation Success]', {
        mutationKey: mutation.options.mutationKey,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });

      logQueryExecution('mutation', mutation.options.mutationKey, startTime, endTime, true);
    },
    onError: (error, variables, context, mutation) => {
      const endTime = performance.now();
      const startTime = mutation.state.submittedAt || endTime;
      
      console.error('[Mutation Error]', {
        mutationKey: mutation.options.mutationKey,
        error: error.message,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });

      logQueryExecution('mutation', mutation.options.mutationKey, startTime, endTime, false, error);
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
