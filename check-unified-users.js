const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    // Check one unified user
    const user = await db.collection('unified_users').findOne();
    console.log('\n📋 Unified User Sample:');
    console.log(JSON.stringify(user, null, 2));
    
    // Check count
    const count = await db.collection('unified_users').countDocuments();
    console.log(`\n📊 Total unified_users: ${count}`);
    
    // Check for users with eitje_user_id
    const withEitje = await db.collection('unified_users').countDocuments({ eitje_user_id: { $exists: true } });
    console.log(`📊 Users with eitje_user_id field: ${withEitje}`);
    
    // Check fields
    const fields = await db.collection('unified_users').findOne({ eitje_user_id: { $exists: true } });
    console.log('\n📋 User with eitje_user_id:');
    console.log(JSON.stringify(fields, null, 2));
  } finally {
    await client.close();
  }
}

check().catch(console.error);
