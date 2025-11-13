/**
 * GraphQL API Route - V2
 * 
 * Apollo Server integration with Next.js 15 App Router
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@/lib/graphql/v2-schema';
import { resolvers } from '@/lib/graphql/v2-resolvers';
import { NextRequest } from 'next/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV === 'development',
});

// For Next.js 15, we need to use a compatible handler
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => {
    return { req };
  },
});

export { handler as GET, handler as POST };

