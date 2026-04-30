import { db, accounts } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function test() {
    console.log('📡 Testing DB connection...');
    try {
        const result = await db.execute(sql`SELECT 1 as connected`);
        console.log('✅ Basic SQL worked:', result);
        
        const accs = await db.select().from(accounts).limit(1);
        console.log('✅ Drizzle select worked, count:', accs.length);
    } catch (err) {
        console.error('❌ DB Test failed:', err);
    }
    process.exit(0);
}

test();
