import { db, sql } from '@fluxcore/db';

/**
 * Reiniciar los projectors después de la migración del esquema
 */
async function restartProjectors() {
  console.log('🔄 REINICIANDO PROJECTORS');

  try {
    // 1. Resetear todos los cursors a 0
    await db.execute(sql`
      UPDATE fluxcore_projector_cursors 
      SET last_sequence_number = 0, error_count = 0, last_error = NULL
    `);
    console.log('✅ Cursors reseteados');

    // 2. Eliminar errores antiguos
    await db.execute(sql`
      DELETE FROM fluxcore_projector_errors
    `);
    console.log('✅ Errores eliminados');

    // 3. Verificar estado
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number, error_count, last_error
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.log('\n📊 ESTADO DE CURSORS:');
    console.table(cursors);

    // 4. Verificar señales disponibles
    const signalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);

    console.log(`\n📊 SEÑALES DISPONIBLES: ${signalCount[0].total}`);

    console.log('\n🎯 PROJECTORS LISTOS PARA PROCESAR ✅');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

restartProjectors().catch(console.error);
