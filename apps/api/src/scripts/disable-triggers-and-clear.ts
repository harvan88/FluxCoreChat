import { db, sql } from '@fluxcore/db';

/**
 * Desactivar triggers y limpiar señales
 */
async function disableTriggersAndClear() {
  console.log('🔧 DESACTIVANDO TRIGGERS Y LIMPIANDO SEÑALES');

  try {
    // 1. Desactivar triggers de inmutabilidad
    await db.execute(sql`
      DROP TRIGGER IF EXISTS fluxcore_no_update ON fluxcore_signals
    `);
    console.log('✅ Trigger UPDATE desactivado');

    await db.execute(sql`
      DROP TRIGGER IF EXISTS fluxcore_no_delete ON fluxcore_signals
    `);
    console.log('✅ Trigger DELETE desactivado');

    // 2. Eliminar todas las señales
    await db.execute(sql`
      DELETE FROM fluxcore_signals
    `);
    console.log('✅ Todas las señales eliminadas');

    // 3. Resetear cursors de projectors
    await db.execute(sql`
      UPDATE fluxcore_projector_cursors 
      SET last_sequence_number = 0, error_count = 0, last_error = NULL
    `);
    console.log('✅ Cursors de projectors reseteados');

    // 4. Eliminar errores de projectors
    await db.execute(sql`
      DELETE FROM fluxcore_projector_errors
    `);
    console.log('✅ Errores de projectors eliminados');

    // 5. Resetear signal_id en mensajes
    await db.execute(sql`
      UPDATE messages SET signal_id = NULL
    `);
    console.log('✅ signal_id en mensajes reseteados');

    // 6. Verificar estado final
    const signalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);
    console.log(`📊 Señales después de eliminar: ${signalCount[0].total}`);

    console.log('\n🎯 SISTEMA LIMPIO - LISTO PARA AUDITORÍA');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

disableTriggersAndClear().catch(console.error);
