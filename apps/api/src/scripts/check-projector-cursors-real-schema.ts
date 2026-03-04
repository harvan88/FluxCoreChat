import { db, sql } from '@fluxcore/db';

/**
 * Verificar el esquema REAL de fluxcore_projector_cursors
 */
async function checkProjectorCursorsRealSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA REAL DE fluxcore_projector_cursors');

  try {
    // 1. Verificar columnas reales
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA REAL:');
    console.table(schema);

    // 2. Verificar datos actuales
    const data = await db.execute(sql`
      SELECT * FROM fluxcore_projector_cursors
    `);

    console.log('\n📊 DATOS ACTUALES:');
    console.table(data);

    // 3. Verificar si error_count existe
    const hasErrorCount = schema.some(col => col.column_name === 'error_count');
    console.log(`\n🔍 ¿Tiene error_count? ${hasErrorCount ? '✅ SÍ' : '❌ NO'}`);

    // 4. Verificar si last_error existe
    const hasLastError = schema.some(col => col.column_name === 'last_error');
    console.log(`🔍 ¿Tiene last_error? ${hasLastError ? '✅ SÍ' : '❌ NO'}`);

    // 5. Verificar si last_processed_at existe
    const hasLastProcessedAt = schema.some(col => col.column_name === 'last_processed_at');
    console.log(`🔍 ¿Tiene last_processed_at? ${hasLastProcessedAt ? '✅ SÍ' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkProjectorCursorsRealSchema().catch(console.error);
