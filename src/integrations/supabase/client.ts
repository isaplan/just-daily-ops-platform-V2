/**
 * Stub Supabase Client for V2 Migration
 * 
 * This is a temporary stub to allow the build to succeed while migrating
 * from Supabase to MongoDB/GraphQL. Files using this will need to be
 * migrated to use the new GraphQL API.
 * 
 * TODO: Migrate all files using this to MongoDB/GraphQL
 */

// Stub Supabase client that returns a minimal mock
export function createClient() {
  console.warn(
    '[V2 Migration] Using stub Supabase client. ' +
    'This file needs to be migrated to MongoDB/GraphQL.'
  );

  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      upsert: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
    }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  };
}

// Export a default instance for files that import `supabase` directly
export const supabase = createClient();

