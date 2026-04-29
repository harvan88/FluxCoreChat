import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function applyDimensionsMigration() {
    console.log(`\n🏗️ APLICANDO MIGRACIÓN DE DIMENSIONES...`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        // 1. Crear columna si no existe
        console.log('🔹 Añadiendo columna "dimensions"...');
        await db.execute(sql`ALTER TABLE fluxcore_document_chunks ADD COLUMN IF NOT EXISTS dimensions INTEGER`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_document_chunks_dimensions ON fluxcore_document_chunks(dimensions)`);

        // 2. Realizar Backfill
        console.log('🔹 Realizando Backfill de dimensiones existentes...');
        
        // Usamos una consulta SQL directa para máxima eficiencia en el backfill
        const result = await db.execute(sql`
            UPDATE fluxcore_document_chunks 
            SET dimensions = vector_dims(embedding)
            WHERE embedding IS NOT NULL AND dimensions IS NULL
            RETURNING id
        `);

        console.log(`✅ Migración completada. Se actualizaron ${result.length} chunks.`);

        // 3. Verificación rápida
        const sample = await db.execute(sql`
            SELECT embedding_model, dimensions, count(*) 
            FROM fluxcore_document_chunks 
            GROUP BY embedding_model, dimensions
        `);

        console.log('\n📊 ESTADO ACTUAL DE LA BODEGA:');
        console.table(sample);

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

applyDimensionsMigration();
