# Just Daily Ops Platform - V2

## MongoDB + GraphQL Architecture

This is the V2 version of the platform, migrated from Supabase (PostgreSQL) to MongoDB Atlas with GraphQL API.

## Quick Start

### 1. Install Dependencies

```bash
npm install mongodb @apollo/server @as-integrations/next graphql @graphql-tools/schema
```

### 2. Set Up MongoDB Atlas

1. Create MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Add to `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=just-daily-ops-v2
```

### 3. Initialize Database

```bash
npx tsx scripts/v2-migration/initialize-db.ts
```

### 4. Migrate Data (Optional)

If migrating from Supabase:

```bash
npx tsx scripts/v2-migration/migrate-from-supabase.ts
```

### 5. Start Development

```bash
npm run dev
```

GraphQL API will be available at: `http://localhost:3000/api/graphql`

## Architecture

- **Database**: MongoDB Atlas
- **API**: GraphQL (Apollo Server)
- **Frontend**: Next.js 15 (App Router)
- **Hosting**: Vercel (Next.js) + MongoDB Atlas (Database)

## GraphQL API

### Example Query

```graphql
query {
  locations {
    id
    name
    users {
      id
      firstName
      lastName
    }
    dashboard(date: "2025-01-20") {
      sales {
        totalRevenue
      }
      labor {
        totalHours
      }
    }
  }
}
```

## Project Structure

```
src/
├── lib/
│   ├── mongodb/
│   │   ├── v2-connection.ts    # MongoDB connection
│   │   ├── v2-schema.ts        # TypeScript types
│   │   └── v2-indexes.ts       # Index definitions
│   └── graphql/
│       ├── v2-schema.ts        # GraphQL schema
│       └── v2-resolvers.ts     # GraphQL resolvers
└── app/
    └── api/
        └── graphql/
            └── route.ts        # GraphQL endpoint
```

## Next Steps

See [V2 Migration Guide](./docs/V2-MIGRATION-GUIDE.md) for detailed migration instructions.

