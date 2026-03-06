import { db, sql } from '@fluxcore/db';

async function cleanCognitionQueue() {
    console.log('🧹 Cleaning cognition_queue...');
    
    // Marcar todos los turns pendientes como procesados
    const result = await db.execute(sql`
        UPDATE fluxcore_cognition_queue 
        SET processed_at = NOW() 
        WHERE processed_at IS NULL
    `);
    
    console.log('✅ Cleaned pending turns from cognition_queue');
    
    // Verificar
    const pending = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM fluxcore_cognition_queue 
        WHERE processed_at IS NULL
    `);
    
    console.log(`📊 Pending turns after cleanup: ${pending[0]?.count || 0}`);
    
    process.exit(0);
}

cleanCognitionQueue().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
