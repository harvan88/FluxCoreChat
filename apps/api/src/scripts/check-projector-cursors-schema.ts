import { db, sql } from '@fluxcore/db';

/**
 * Verificar si la columna last_processed_at existe realmente
 */
async function checkProjectorCursorsSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA DE fluxcore_projector_cursors');

  try {
    // 1. Verificar esquema real
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA REAL:');
    console.table(schema);

    // 2. Verificar si last_processed_at existe
    const hasLastProcessedAt = schema.some(row => row.column_name === 'last_processed_at');
    
    if (hasLastProcessedAt) {
      console.log('\n✅ La columna last_processed_at EXISTE');
    } else {
      console.log('\n❌ La columna last_processed_at NO EXISTE');
    }

    // 3. Verificar datos actuales
    const data = await db.execute(sql`
      SELECT * FROM fluxcore_projector_cursors
      LIMIT 3
    `);

    console.log('\n📊 DATOS ACTUALES:');
    console.table(data);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkProjectorCursorsSchema().catch(console.error);
