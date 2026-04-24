
import { db } from '../index';
import { sql } from 'drizzle-orm';

async function main() {
    const chunkId = 'de4a59a9-e435-4af7-8d4e-5341b9c1ef04'; // Modelado 360
    console.log(`--- VALORES FÍSICOS EN DB PARA CHUNK: ${chunkId} ---`);

    const result = await db.execute(sql`
        SELECT 
            id,
            embedding::text as raw_vector
        FROM fluxcore_document_chunks
        WHERE id = ${chunkId}::uuid
    `);

    if (result.length > 0) {
        const vecStr = result[0].raw_vector as string;
        // El formato de postgres es "[v1,v2,...]"
        const values = vecStr.slice(1, -1).split(',').map(v => parseFloat(v));
        console.log(`Dimensiones en DB: ${values.length}`);
        console.log(`Primeros 5 valores en DB: ${values.slice(0, 5).join(', ')}`);
    } else {
        console.log("No se encontró el fragmento.");
    }

    process.exit(0);
}

main().catch(console.error);
