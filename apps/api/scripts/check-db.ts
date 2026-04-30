import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function test() {
    console.log('🔍 Checking Database Schema for "templates" table...');
    
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'templates'
        `);
        
        console.log('📋 Columns in "templates" table:');
        console.table(result);
        
        // 2. Probar una consulta simple a templates
        console.log('\n🔍 Testing simple query to "templates"...');
        const count = await db.execute(sql`SELECT count(*) FROM templates`);
        console.log(`✅ Count:`, count[0]);

        // 3. Probar la consulta que falla en TemplateService
        console.log('\n🔍 Testing the complex query with join...');
        const joinTest = await db.execute(sql`
            SELECT t.id, t.name, a.alias 
            FROM templates t 
            LEFT JOIN accounts a ON t.account_id = a.id 
            LIMIT 1
        `);
        console.log(`✅ Join test success:`, joinTest[0]);

    } catch (err) {
        console.error('❌ Database query failed:', err);
    }

    process.exit(0);
}

test().catch(err => {
    console.error('💥 Test script error:', err);
    process.exit(1);
});
