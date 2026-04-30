import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function test() {
    console.log('🔍 Checking Database Triggers for "templates" table...');
    
    try {
        const result = await db.execute(sql`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'templates'
        `);
        
        console.log('📋 Triggers on "templates" table:');
        console.table(result);
        
    } catch (err) {
        console.error('❌ Database query failed:', err);
    }

    process.exit(0);
}

test().catch(err => {
    console.error('💥 Test script error:', err);
    process.exit(1);
});
