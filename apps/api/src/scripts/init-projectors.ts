import { db, sql } from '@fluxcore/db';

/**
 * Script para inicializar cursors de projectors
 */
async function initProjectors() {
  console.log('🔧 Initializing projectors...');

  try {
    // Crear cursors para los projectors principales
    const projectors = ['identity', 'chat', 'session'];
    
    await db.execute(sql`
        INSERT INTO fluxcore_projector_cursors (projector_name, last_sequence_number)
        VALUES ('identity', 0)
        ON CONFLICT (projector_name) DO UPDATE SET
          last_sequence_number = 0
      `);
      
      await db.execute(sql`
        INSERT INTO fluxcore_projector_cursors (projector_name, last_sequence_number)
        VALUES ('chat', 0)
        ON CONFLICT (projector_name) DO UPDATE SET
          last_sequence_number = 0
      `);
      
      await db.execute(sql`
        INSERT INTO fluxcore_projector_cursors (projector_name, last_sequence_number)
        VALUES ('session', 0)
        ON CONFLICT (projector_name) DO UPDATE SET
          last_sequence_number = 0
      `);

    // Verificar estado actual
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.log('\n📊 Projector cursors status:');
    console.table(cursors);

  } catch (error) {
    console.error('❌ Error initializing projectors:', error);
    throw error;
  }
}

initProjectors().catch(console.error);
