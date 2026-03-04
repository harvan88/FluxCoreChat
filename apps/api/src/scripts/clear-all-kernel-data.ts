import { db, sql } from '@fluxcore/db';

/**
 * Limpiar todos los datos del Kernel en orden correcto
 */
async function clearAllKernelData() {
  console.log('🗑️ LIMPIANDO TODOS LOS DATOS DEL KERNEL');

  try {
    // 1. Desactivar triggers de inmutabilidad
    await db.execute(sql`
      DROP TRIGGER IF EXISTS fluxcore_no_update ON fluxcore_signals
    `);
    await db.execute(sql`
      DROP TRIGGER IF EXISTS fluxcore_no_delete ON fluxcore_signals
    `);
    console.log('✅ Triggers desactivados');

    // 2. Limpiar en orden correcto (respetando foreign keys)
    
    // 2.1 Limpiar fluxcore_actors (dependen de signals)
    await db.execute(sql`
      DELETE FROM fluxcore_actors
    `);
    console.log('✅ FluxCore actors eliminados');

    // 2.2 Ahora sí eliminar señales
    await db.execute(sql`
      DELETE FROM fluxcore_signals
    `);
    console.log('✅ FluxCore signals eliminados');

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

    // 6. Limpiar otras tablas del kernel
    await db.execute(sql`
      DELETE FROM fluxcore_outbox
    `);
    console.log('✅ FluxCore outbox eliminados');

    await db.execute(sql`
      DELETE FROM fluxcore_cognition_queue
    `);
    console.log('✅ Cognition queue eliminados');

    // 7. Verificar estado final
    const signalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);
    const actorCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_actors
    `);

    console.log(`📊 Estado final:`);
    console.log(`- Señales: ${signalCount[0].total}`);
    console.log(`- Actores: ${actorCount[0].total}`);

    console.log('\n🎯 SISTEMA KERNEL LIMPIO - LISTO PARA AUDITORÍA');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

clearAllKernelData().catch(console.error);
