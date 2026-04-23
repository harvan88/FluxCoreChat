import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function auditRAGSchema() {
    console.log('\n=== AUDITORÍA FORENSE EMPÍRICA: ESQUEMA RAG vs ASSETS ===\n');

    try {
        // 1. Check constraints on fluxcore_vector_store_files
        console.log('🔍 Buscando Foreign Keys en: fluxcore_vector_store_files');
        const fileConstraints = await db.execute(sql`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='fluxcore_vector_store_files';
        `);

        console.table(fileConstraints);

        const hasAssetFK = fileConstraints.some(r => r.foreign_table_name === 'assets');
        if (!hasAssetFK) {
            console.log('❌ FALLO ESTRUCTURAL CONFIRMADO: No existe Foreign Key hacia la tabla "assets". El file_id está suelto.');
        } else {
            console.log('✅ OK: Existe Foreign Key hacia assets.');
        }

        // 2. Check structure of fluxcore_document_chunks
        console.log('\n🔍 Buscando Columnas y Foreign Keys en: fluxcore_document_chunks');
        const chunkConstraints = await db.execute(sql`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='fluxcore_document_chunks';
        `);

        console.table(chunkConstraints);
        
        const chunkDependsOnVectorStore = chunkConstraints.some(r => r.foreign_table_name === 'fluxcore_vector_stores');
        
        if (chunkDependsOnVectorStore) {
            console.log('❌ SILO CONFIRMADO: Los chunks (vectores) están anclados rígidamente a "fluxcore_vector_stores".');
            console.log('   Consecuencia: Si subes el mismo archivo a 3 vector stores diferentes, se duplicarán sus chunks 3 veces (Costo y Tokens x3).');
        }

        console.log('\n=== FIN DE LA AUDITORÍA EMPÍRICA ===\n');
        process.exit(0);

    } catch (e) {
        console.error('Error durante auditoría:', e);
        process.exit(1);
    }
}

auditRAGSchema();
