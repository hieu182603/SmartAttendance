import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartattendance';

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected successfully\n');

    const db = mongoose.connection.db;

    console.log('📋 Checking existing collections...');
    const existingCollections = await db.listCollections().toArray();
    const collectionNames = existingCollections.map(c => c.name);
    console.log(`Found ${collectionNames.length} collections: ${collectionNames.join(', ')}\n`);

    const migrations = [];

    if (!collectionNames.includes('notifications')) {
      migrations.push({
        name: 'Create notifications collection',
        action: async () => {
          console.log('📝 Creating notifications collection...');
          await db.createCollection('notifications');
          
          const notificationsCollection = db.collection('notifications');
          
          await notificationsCollection.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
          await notificationsCollection.createIndex({ type: 1, createdAt: -1 });
          await notificationsCollection.createIndex({ userId: 1 });
          
          console.log('✅ Notifications collection created with indexes');
        }
      });
    } else {
      console.log('✅ Notifications collection already exists');
      
      const notificationsCollection = db.collection('notifications');
      const indexes = await notificationsCollection.indexes();
      const indexNames = indexes.map(idx => Object.keys(idx.key).join('_'));
      
      if (!indexNames.some(name => name.includes('userId') && name.includes('isRead') && name.includes('createdAt'))) {
        migrations.push({
          name: 'Add missing indexes to notifications',
          action: async () => {
            console.log('📝 Adding indexes to notifications collection...');
            await notificationsCollection.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
            await notificationsCollection.createIndex({ type: 1, createdAt: -1 });
            console.log('✅ Indexes added');
          }
        });
      }
    }

    if (migrations.length === 0) {
      console.log('\n✅ No migrations needed. Database is up to date.\n');
    } else {
      console.log(`\n🔄 Running ${migrations.length} migration(s)...\n`);
      
      for (const migration of migrations) {
        console.log(`📦 ${migration.name}...`);
        await migration.action();
        console.log('');
      }
      
      console.log('✅ All migrations completed successfully!\n');
    }

    console.log('📊 Final collection list:');
    const finalCollections = await db.listCollections().toArray();
    finalCollections.forEach(c => {
      console.log(`   - ${c.name}`);
    });
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();

