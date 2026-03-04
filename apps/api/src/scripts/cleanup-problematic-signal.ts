import { db, sql } from '@fluxcore/db';

async function cleanupProblematicSignal() {
  try {
    // Verificar cuántas señales hay con este accountId
    const count = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM fluxcore_signals
      WHERE account_id = '535949b8-58a9-4310-87a7-42a2480f5746'
    `);
    
    console.log('🔊 Señales con accountId problemático:', count[0].total);
    
    if (count[0].total > 0) {
      // Eliminar las señales problemáticas
      const result = await db.execute(sql`
        DELETE FROM fluxcore_signals
        WHERE account_id = '535949b8-58a9-4310-87a7-42a2480f5746'
      `);
      
      console.log('✅ Señales problemáticas eliminadas:', result.count);
      
      // Resetear los cursores de los projectors
      await db.execute(sql`
        UPDATE fluxcore_projector_cursors
        SET last_sequence_number = 0
      `);
      
      console.log('✅ Cursores reseteados a 0');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up:', error);
  }
}

cleanupProblematicSignal().catch(console.error);
