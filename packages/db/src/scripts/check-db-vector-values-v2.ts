
import { db } from '../index';
import { sql } from 'drizzle-orm';
import { fluxcoreDocumentChunks } from '../schema';

async function main() {
    console.log(`--- VALORES FÍSICOS EN DB (ÚLTIMO CHUNK) ---`);

    const result = await db.execute(sql`
        SELECT 
            id,
            content,
            embedding::text as raw_vector
        FROM fluxcore_document_chunks
        ORDER BY created_at DESC
        LIMIT 1
    `);

    if (result.length > 0) {
        const vecStr = result[0].raw_vector as string;
        const values = vecStr.slice(1, -1).split(',').map(v => parseFloat(v));
        console.log(`ID: ${result[0].id}`);
        console.log(`Contenido: ${result[0].content.substring(0, 50)}...`);
        console.log(`Dimensiones en DB: ${values.length}`);
        console.log(`Primeros 5 valores en DB: ${values.slice(0, 5).join(', ')}`);
    } else {
        console.log("No se encontraron fragmentos.");
    }

    process.exit(0);
}

main().catch(console.error);
