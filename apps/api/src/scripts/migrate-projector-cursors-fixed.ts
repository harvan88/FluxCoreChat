import { db, sql } from '@fluxcore/db';

/**
 * Migrar el esquema de fluxcore_projector_cursors - versión corregida
 */
async function migrateProjectorCursorsFixed() {
  console.log('🔧 MIGRANDO ESQUEMA DE fluxcore_projector_cursors - VERSIÓN CORREGIDA');

  try {
    // 1. Agregar last_processed_at
    try {
      await db.execute(sql`ALTER TABLE fluxcore_projector_cursors ADD COLUMN last_processed_at timestamp NOT NULL DEFAULT NOW()`);
      console.log('✅ Columna last_processed_at agregada');
    } catch (error) {
      console.log('⚠️ last_processed_at ya existe o no se pudo agregar:', error);
    }

    // 2. Agregar error_count
    try {
      await db.execute(sql`ALTER TABLE fluxcore_projector_cursors ADD COLUMN error_count bigint NOT NULL DEFAULT 0`);
      console.log('✅ Columna error_count agregada');
    } catch (error) {
      console.log('⚠️ error_count ya existe o no se pudo agregar:', error);
    }

    // 3. Agregar last_error
    try {
      await db.execute(sql`ALTER TABLE fluxcore_projector_cursors ADD COLUMN last_error text`);
      console.log('✅ Columna last_error agregada');
    } catch (error) {
      console.log('⚠️ last_error ya existe o no se pudo agregar:', error);
    }

    // 4. Verificar esquema final
    const finalSchema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA FINAL:');
    console.table(finalSchema);

    // 5. Verificar datos
    const data = await db.execute(sql`
      SELECT * FROM fluxcore_projector_cursors
    `);

    console.log('\n📊 DATOS ACTUALES:');
    console.table(data);

    console.log('\n🎯 MIGRACIÓN COMPLETADA ✅');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

migrateProjectorCursorsFixed().catch(console.error);
