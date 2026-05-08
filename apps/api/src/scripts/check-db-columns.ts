import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function checkColumns() {
    console.log('🔍 REVISANDO COLUMNAS DE account_locations');
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'account_locations'
        `);
        console.table((result as any).rows || result);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkColumns().catch(console.error);
