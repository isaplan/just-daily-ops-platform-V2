# V2 Migration Guide - MongoDB + GraphQL

## Overview

This guide covers the migration from Supabase (PostgreSQL) to MongoDB Atlas with GraphQL API.

## Architecture Changes

### Before (V1 - Supabase)
- Database: PostgreSQL (Supabase)
- API: REST endpoints (`/api/*`)
- Data Access: Direct Supabase client calls
- Relationships: SQL JOINs

### After (V2 - MongoDB)
- Database: MongoDB Atlas
- API: GraphQL (`/api/graphql`)
- Data Access: GraphQL queries
- Relationships: GraphQL resolvers

## Setup Steps

### 1. MongoDB Atlas Setup

1. Create MongoDB Atlas account (if you don't have one)
2. Create a new cluster
3. Create database user
4. Whitelist IP addresses (or allow from anywhere for development)
5. Get connection string

### 2. Environment Variables

Add to `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=just-daily-ops-v2
```

### 3. Install Dependencies

```bash
npm install mongodb @apollo/server @as-integrations/next graphql @graphql-tools/schema
```

### 4. Initialize Database

Run the initialization script to create indexes:

```typescript
import { initializeDatabase } from '@/lib/mongodb/v2-indexes';

await initializeDatabase();
```

### 5. Migrate Data

Use the migration scripts to move data from Supabase to MongoDB.

## GraphQL API Usage

### Example Query

```graphql
query GetDashboard($locationId: ID!, $startDate: String!, $endDate: String!) {
  dashboard(locationId: $locationId, startDate: $startDate, endDate: $endDate) {
    id
    date
    sales {
      totalRevenue
      transactionCount
    }
    labor {
      totalHours
      totalCost
    }
    productivity {
      revenuePerHour
      laborCostPercentage
    }
  }
}
```

### Using in Next.js

```typescript
// In your ViewModel or component
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        locations {
          id
          name
          users {
            id
            firstName
          }
        }
      }
    `,
  }),
});

const { data } = await response.json();
```

## Migration Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database indexes created
- [ ] Data migrated from Supabase
- [ ] GraphQL API tested
- [ ] Next.js app updated to use GraphQL
- [ ] Old Supabase code removed

## Next Steps

1. Set up MongoDB Atlas
2. Run migration scripts
3. Test GraphQL API
4. Update Next.js app to use GraphQL
5. Deploy to Vercel

