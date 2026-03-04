import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, pool } from './connection';
import path from 'path';

async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    const migrationsFolder = path.resolve(__dirname, '../migrations');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
