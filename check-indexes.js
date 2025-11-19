const { initializeDatabase } = require('./src/lib/mongodb/v2-indexes.ts');

initializeDatabase()
  .then(() => {
    console.log('✅ All MongoDB indexes created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  });
