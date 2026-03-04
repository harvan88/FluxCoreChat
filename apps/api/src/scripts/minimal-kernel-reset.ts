import { db, sql } from '@fluxcore/db';

/**
 * Reset mínimo del Kernel - solo lo esencial
 */
async function minimalKernelReset() {
  console.log('🔧 RESET MÍNIMO DEL KERNEL');

  try {
    // 1. Resetear cursors de projectors (solo columna existente)
    await db.execute(sql`
      UPDATE fluxcore_projector_cursors 
      SET last_sequence_number = 0
    `);
    console.log('✅ Cursors reseteados');

    // 2. Eliminar errores de projectors
    await db.execute(sql`
      DELETE FROM fluxcore_projector_errors
    `);
    console.log('✅ Errores eliminados');

    // 3. Resetear signal_id en mensajes
    await db.execute(sql`
      UPDATE messages SET signal_id = NULL
    `);
    console.log('✅ signal_id en mensajes reseteados');

    // 4. Verificar estado
    const signalCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const cursorCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_projector_cursors`);

    console.log(`\n🎯 ESTADO FINAL:`);
    console.log(`- Señales existentes: ${signalCount[0].total} (no eliminadas por FK)`);
    console.log(`- Cursors: ${cursorCount[0].total} (reseteados a 0)`);
    console.log(`- Sistema listo para prueba ✅`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

minimalKernelReset().catch(console.error);
