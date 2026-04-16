import { db } from '../packages/db/src/index';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Iniciando migración de dimensiones vectoriales...');
  try {
    // Liberar la restricción de dimensiones en la tabla de chunks
    // Esto cambia el tipo de 'vector(1536)' a 'vector' (flexible)
    await db.execute(sql`
      ALTER TABLE fluxcore_document_chunks 
      ALTER COLUMN embedding TYPE vector;
    `);
    console.log('✅ Éxito: La columna embedding ahora es flexible (Sovereign Mode activo).');
  } catch (error: any) {
    console.error('❌ Error ejecutando la migración:', error.message);
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('ℹ️ Verificando existencia de la tabla...');
        try {
            const tables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
            console.log('Tablas encontradas:', tables);
        } catch (e) {}
    }
  }
}

runMigration().then(() => {
    console.log('Proceso finalizado.');
    process.exit(0);
});
