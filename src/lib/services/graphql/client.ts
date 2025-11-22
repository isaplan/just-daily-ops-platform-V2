/**
 * GraphQL Client Service
 * 
 * Centralized GraphQL client for making queries and mutations
 * 
 * IMPORTANT: For Server Components, this directly invokes GraphQL resolvers
 * to avoid HTTP self-calls which can timeout.
 * 
 * Server-side: Calls resolvers directly (no HTTP)
 * Client-side: Uses HTTP fetch to /api/graphql
 */

const GRAPHQL_ENDPOINT = '/api/graphql';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

// ✅ Singleton pattern for Apollo Server to prevent memory leaks
let apolloServerInstance: any = null;
let apolloServerPromise: Promise<any> | null = null;

/**
 * Get the GraphQL endpoint URL
 * For Server Components: Construct absolute URL
 * For Client Components: Use relative URL
 */
function getGraphQLEndpoint(): string {
  // Check if we're on the server
  if (typeof window === 'undefined') {
    // Server-side: construct absolute URL
    // In development, use localhost
    // In production, use environment variable or construct from request
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    // Try multiple host sources in order of preference
    const host = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 
                 process.env.VERCEL_URL || 
                 process.env.HOST ||
                 `localhost:${process.env.PORT || 3000}`;
    
    const url = `${protocol}://${host}${GRAPHQL_ENDPOINT}`;
    
    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[GraphQL Client] Server-side endpoint:', url);
    }
    
    return url;
  }
  // Client-side: use relative URL
  return GRAPHQL_ENDPOINT;
}

/**
 * Execute a GraphQL query or mutation
 * 
 * Server-side: Calls resolvers directly (no HTTP)
 * Client-side: Uses HTTP fetch
 */
export async function executeGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> {
  const isServer = typeof window === 'undefined';
  
  // ✅ SERVER-SIDE: Use Apollo Server execution (no HTTP)
  if (isServer) {
    try {
      // ✅ Singleton pattern: Reuse existing Apollo Server instance
      if (!apolloServerPromise) {
        apolloServerPromise = (async () => {
          try {
            const { ApolloServer } = await import('@apollo/server');
            const { typeDefs } = await import('@/lib/graphql/v2-schema');
            const { resolvers } = await import('@/lib/graphql/v2-resolvers');
            
            const server = new ApolloServer({
              typeDefs,
              resolvers,
              introspection: false,
            });
            
            // Start the server (required before executing operations)
            await server.start();
            
            return server;
          } catch (error) {
            // Reset promise on error so next call can retry
            apolloServerPromise = null;
            throw error;
          }
        })();
      }
      
      // Wait for server to be ready (or get existing instance)
      const server = await apolloServerPromise;
      
      // Store instance for reuse
      if (!apolloServerInstance) {
        apolloServerInstance = server;
      }
      
      // Execute the query using Apollo Server's execution engine
      const result = await server.executeOperation(
        {
          query,
          variables: variables || {},
        },
        {
          contextValue: {},
        }
      );
      
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[GraphQL Server] Direct Apollo execution:', {
          query: query.substring(0, 100) + '...',
          variables,
        });
      }
      
      // Transform Apollo result to GraphQLResponse format
      if (result.body.kind === 'single') {
        // ✅ Force serialization through JSON to ensure all MongoDB objects/Date objects are converted to plain objects/strings
        // This prevents "Only plain objects" errors when passing data from Server Components to Client Components
        const serializedData = JSON.parse(JSON.stringify(result.body.singleResult.data));
        
        return {
          data: serializedData as T,
          errors: result.body.singleResult.errors?.map((e: any) => ({
            message: e.message,
            path: e.path,
          })),
        };
      }
      
      // Fall through to HTTP if execution fails
      console.warn('[GraphQL Client] Apollo execution returned unexpected format, using HTTP');
    } catch (directError: any) {
      // If direct execution fails, fall back to HTTP
      console.warn('[GraphQL Client] Direct Apollo execution failed, falling back to HTTP:', directError.message);
      // Continue to HTTP fallback below
    }
  }
  
  // ✅ CLIENT-SIDE: Use HTTP fetch
  try {
    const endpoint = getGraphQLEndpoint();
    const requestBody = JSON.stringify({
      query,
      variables,
    });
    
    // Log the request (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[GraphQL Request]', {
        endpoint,
        isServer,
        query: query.substring(0, 100) + '...',
        variables,
      });
    }
    
    // Use fetch with appropriate configuration
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
      cache: 'no-store', // Don't cache GraphQL requests
      // Increased timeout for complex queries (30s)
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GraphQL Client] HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: GraphQLResponse<T> = await response.json();
    
    // Log the response
    console.log('[GraphQL Response]', result);

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ');
      
      // Check for MongoDB connection errors
      if (errorMessages.includes('ETIMEOUT') || errorMessages.includes('querySrv')) {
        throw new Error('MongoDB connection timeout. Please check your MongoDB connection settings or try again later.');
      }
      if (errorMessages.includes('ENOTFOUND') || errorMessages.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to MongoDB. Please verify your connection string and network settings.');
      }
      
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    return result;
  } catch (error: any) {
    console.error('[GraphQL Client] Error:', error);
    
    // Handle network errors with more detail
    if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      const isServer = typeof window === 'undefined';
      const endpoint = getGraphQLEndpoint();
      
      // Provide helpful error message
      if (isServer) {
        console.error('[GraphQL Client] Server-side fetch failed:', {
          endpoint,
          error: error.message,
          hint: 'Server Components may need to call GraphQL resolvers directly instead of via HTTP',
        });
        throw new Error(
          `GraphQL server-side fetch failed. Endpoint: ${endpoint}. ` +
          `This may occur if the server cannot reach itself. ` +
          `Error: ${error.message}`
        );
      }
      
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // Re-throw if already a formatted error
    if (error.message && !error.message.includes('GraphQL')) {
      throw error;
    }
    
    throw new Error(`GraphQL request failed: ${error.message || 'Unknown error'}`);
  }
}



