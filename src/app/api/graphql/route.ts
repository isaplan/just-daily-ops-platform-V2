/**
 * GraphQL API Route - V2
 * 
 * Apollo Server integration with Next.js 15 App Router
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@/lib/graphql/v2-schema';
import { resolvers } from '@/lib/graphql/v2-resolvers';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function GET(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error: any) {
    console.error('[GraphQL Route] GET Error:', error);
    return NextResponse.json(
      { errors: [{ message: error.message || 'Internal server error' }] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error: any) {
    console.error('[GraphQL Route] POST Error:', error);
    return NextResponse.json(
      { errors: [{ message: error.message || 'Internal server error' }] },
      { status: 500 }
    );
  }
}

