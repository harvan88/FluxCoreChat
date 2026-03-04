import { db, sql } from '@fluxcore/db';

async function checkSchema() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_errors'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas actuales en fluxcore_projector_errors:');
    console.table(result);
    
    // Verificar si existe la columna signal_sequence
    const hasSignalSequence = result.some(col => col.column_name === 'signal_sequence');
    console.log(`\n✅ ¿Tiene signal_sequence? ${hasSignalSequence ? 'SÍ' : 'NO'}`);
    
    // Verificar si existe la columna attempts
    const hasAttempts = result.some(col => col.column_name === 'attempts');
    console.log(`✅ ¿Tiene attempts? ${hasAttempts ? 'SÍ' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema().catch(console.error);
