# MongoDB V2 Setup Instructions

## Step 1: Add Environment Variables

Add these to your `.env.local` file:

```env
# MongoDB V2 Configuration
MONGODB_URI=mongodb+srv://thewebagencycc_db_user:hGTyczAsWG10zDzZ@just-ops-daily-0.kna6xkx.mongodb.net/
MONGODB_DB_NAME=just-daily-ops-v2
```

**Important**: Make sure to add the database name to the connection string or set it separately.

## Step 2: Test Connection

Run the connection test:

```bash
npx tsx scripts/v2-migration/test-connection.ts
```

This will verify:
- ✅ Connection to MongoDB Atlas
- ✅ Database access
- ✅ List existing collections

## Step 3: Initialize Database

Once connection is confirmed, initialize the database with indexes:

```bash
npx tsx scripts/v2-migration/initialize-db.ts
```

This will create:
- All collections (if they don't exist)
- All performance indexes
- Ready for data migration

## Step 4: Test GraphQL API

Start your dev server:

```bash
npm run dev
```

Visit GraphQL Playground:
- URL: `http://localhost:3000/api/graphql`

Try this test query:

```graphql
query {
  locations {
    id
    name
  }
}
```

## Next Steps

1. ✅ Add environment variables
2. ✅ Test connection
3. ✅ Initialize database
4. ⏳ Migrate data (optional)
5. ⏳ Test GraphQL API

## Troubleshooting

### Connection Error?
- Check IP whitelist in MongoDB Atlas (should have 0.0.0.0/0)
- Verify username/password in connection string
- Check network connectivity

### Database Not Found?
- MongoDB will create the database automatically on first write
- Or create it manually in MongoDB Atlas UI

### TypeScript Errors?
- Make sure you've installed dependencies: `npm install`
- Check that `tsx` is available: `npm install -g tsx` or `npx tsx`

