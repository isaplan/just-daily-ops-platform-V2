# V2 Setup Complete ✅

## What I've Built

### ✅ Core MongoDB Infrastructure

1. **MongoDB Connection** (`src/lib/mongodb/v2-connection.ts`)
   - Serverless-optimized connection pooling
   - Handles Next.js hot reloading
   - Environment variable configuration

2. **MongoDB Schema** (`src/lib/mongodb/v2-schema.ts`)
   - TypeScript interfaces for all collections
   - Based on your existing Supabase structure
   - Includes: Locations, Users, Teams, Bork, Eitje, PowerBI data

3. **Database Indexes** (`src/lib/mongodb/v2-indexes.ts`)
   - Performance-optimized indexes
   - Critical compound indexes for dashboard queries
   - Auto-initialization function

### ✅ GraphQL API

1. **GraphQL Schema** (`src/lib/graphql/v2-schema.ts`)
   - Complete type definitions
   - Based on your Next.js app requirements
   - Supports: Locations, Users, Teams, Dashboard, Sales, Labor, P&L

2. **GraphQL Resolvers** (`src/lib/graphql/v2-resolvers.ts`)
   - Relationship traversal (Users ↔ Locations ↔ Teams)
   - Data fetching from MongoDB
   - Dashboard aggregations

3. **GraphQL Endpoint** (`src/app/api/graphql/route.ts`)
   - Apollo Server integration
   - Next.js App Router compatible
   - Available at `/api/graphql`

### ✅ Migration Tools

1. **Database Initialization** (`scripts/v2-migration/initialize-db.ts`)
   - Creates all indexes
   - One-time setup script

2. **Data Migration** (`scripts/v2-migration/migrate-from-supabase.ts`)
   - Migrates from Supabase to MongoDB
   - Handles: Locations, Users, Teams, System Mappings

### ✅ Documentation

1. **Migration Guide** (`docs/V2-MIGRATION-GUIDE.md`)
2. **V2 README** (`README-V2.md`)

## What You Need to Do

### 1. Install Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "mongodb": "^6.3.0",
    "@apollo/server": "^4.9.5",
    "@as-integrations/next": "^2.0.0",
    "graphql": "^16.8.1",
    "@graphql-tools/schema": "^10.0.0"
  }
}
```

Then run:
```bash
npm install
```

### 2. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (or use existing)
3. Create database user
4. Whitelist IPs (or allow from anywhere for dev)
5. Get connection string

### 3. Configure Environment Variables

Add to `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=just-daily-ops-v2
```

### 4. Initialize Database

```bash
npx tsx scripts/v2-migration/initialize-db.ts
```

### 5. Test GraphQL API

Start dev server:
```bash
npm run dev
```

Visit: `http://localhost:3000/api/graphql`

Try this query:
```graphql
query {
  locations {
    id
    name
  }
}
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Set up MongoDB Atlas
3. ✅ Initialize database
4. ⏳ Migrate data (optional)
5. ⏳ Update Next.js app to use GraphQL
6. ⏳ Set up cron jobs for API syncing
7. ⏳ Deploy to Vercel

## Questions?

- MongoDB Atlas setup: See MongoDB Atlas docs
- GraphQL queries: See `docs/V2-MIGRATION-GUIDE.md`
- Migration: Run `scripts/v2-migration/migrate-from-supabase.ts`

## What's Next?

Once you have MongoDB Atlas set up, I can:
1. Help you test the GraphQL API
2. Create cron job scripts for API syncing
3. Update your Next.js ViewModels to use GraphQL
4. Set up MongoDB Change Streams for real-time updates

Let me know when you have MongoDB Atlas ready! 🚀

