import { db, sql } from '@fluxcore/db';

/**
 * Script para describir la estructura de una tabla
 */
async function describeTable() {
  console.log('🔍 Describing fluxcore_projector_cursors table...');

  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📊 Table structure:');
    console.table(result);

  } catch (error) {
    console.error('❌ Error describing table:', error);
    throw error;
  }
}

describeTable().catch(console.error);
