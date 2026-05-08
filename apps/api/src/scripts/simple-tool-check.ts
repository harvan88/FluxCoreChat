import { db, fluxcoreToolDefinitions } from '@fluxcore/db';

async function simpleCheck() {
    console.log('🔍 SIMPLE CHECK');
    try {
        const result = await db.select().from(fluxcoreToolDefinitions).limit(1);
        console.log('✅ Result count:', result.length);
        console.log(result[0]);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

simpleCheck().catch(console.error);
