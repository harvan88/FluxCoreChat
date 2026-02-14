
import { db } from '../packages/db/src/index';
import { sql } from 'drizzle-orm';

async function listTables() {
    const res = await db.execute(sql`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
    console.log('--- TABLES IN PUBLIC SCHEMA ---');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}

listTables().catch(console.error);
