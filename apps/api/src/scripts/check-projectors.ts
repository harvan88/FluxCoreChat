import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar el estado de los projectors
 */
async function checkProjectors() {
  console.log('🔍 Checking projectors status...');

  try {
    // Verificar cursors de projectors
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number, error_count, last_error
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.log('📊 Projector cursors:');
    console.table(cursors);

    // Verificar errores de projectors
    const errors = await db.execute(sql`
      SELECT projector_name, signal_sequence_number, error_message, created_at, attempts
      FROM fluxcore_projector_errors
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 Recent projector errors:');
    console.table(errors);

    // Verificar outbox status
    const outbox = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM fluxcore_outbox
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n📊 FluxCore outbox status:');
    console.table(outbox);

  } catch (error) {
    console.error('❌ Error checking projectors:', error);
    throw error;
  }
}

checkProjectors().catch(console.error);
