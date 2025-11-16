/**
 * GraphQL Client Service
 * 
 * Centralized GraphQL client for making queries and mutations
 */

const GRAPHQL_ENDPOINT = '/api/graphql';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Execute a GraphQL query or mutation
 */
export async function executeGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

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
    
    // Handle network errors
    if (error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // Re-throw if already a formatted error
    if (error.message && !error.message.includes('GraphQL')) {
      throw error;
    }
    
    throw new Error(`GraphQL request failed: ${error.message || 'Unknown error'}`);
  }
}



