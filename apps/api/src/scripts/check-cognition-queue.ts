import { db, sql } from '@fluxcore/db';

async function checkCognitionQueue() {
    console.log('🔍 DIAGNÓSTICO DE COGNITION QUEUE');
    
    try {
        const result = await db.execute(sql`
            SELECT id, conversation_id, account_id, attempts, last_error, 
                   processed_at, turn_started_at, turn_window_expires_at
            FROM fluxcore_cognition_queue
            ORDER BY turn_started_at DESC
            LIMIT 10
        `);
        
        console.table(result);
        
        const pending = await db.execute(sql`
            SELECT count(*) as count
            FROM fluxcore_cognition_queue
            WHERE processed_at IS NULL
        `);
        
        console.log(`\n📋 Turns pendientes: ${(pending[0] as any).count}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkCognitionQueue().catch(console.error);
