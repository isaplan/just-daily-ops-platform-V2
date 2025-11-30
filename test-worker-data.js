const { MongoClient } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    // Check worker_profiles schema
    const worker = await db.collection('worker_profiles').findOne();
    console.log('\n📋 Worker Profiles Schema:');
    console.log(JSON.stringify(worker, null, 2));
    
    // Check unified_users
    const user = await db.collection('unified_users').findOne();
    console.log('\n📋 Unified Users Schema:');
    console.log(JSON.stringify(user, null, 2));
    
    // Check eitje_raw_data for user names
    const eitjeUser = await db.collection('eitje_raw_data').findOne({
      endpoint: 'users'
    });
    console.log('\n📋 Eitje Users Schema:');
    console.log(JSON.stringify(eitjeUser, null, 2));
  } finally {
    await client.close();
  }
}

test();
