import { db } from '../index';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const query = 'precios tratamientos dentales';

    console.log('--- BUSQUEDA DIRECTA SIN AUDITORIA ---');
    
    // Generar embedding para la query
    const { embedding } = await embeddingService.embedWithConfig(query, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384
    });
    const embeddingStr = `[${embedding.join(',')}]`;

    // Buscar directamente sin ningún filtro de metadata
    const noFilter = await db.execute(sql`
        SELECT metadata, account_id, 1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as score
        FROM fluxcore_document_chunks
        WHERE account_id = ${accountId}::uuid AND embedding IS NOT NULL
        ORDER BY score DESC LIMIT 10
    `);
    console.log(`Sin filtro: ${noFilter.length} resultados`);
    noFilter.forEach((r: any) => {
        const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
        console.log(`  Score: ${(Number(r.score)*100).toFixed(2)}% | type: ${meta?.type} | status: ${meta?.status} | tpl: ${meta?.template_id || meta?.documentTitle}`);
    });

    // Buscar con LIKE
    const withLike = await db.execute(sql`
        SELECT metadata, 1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as score
        FROM fluxcore_document_chunks
        WHERE account_id = ${accountId}::uuid AND metadata::text LIKE '%template%' AND embedding IS NOT NULL
        ORDER BY score DESC LIMIT 10
    `);
    console.log(`\nCon LIKE template: ${withLike.length} resultados`);
    withLike.forEach((r: any) => {
        const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
        console.log(`  Score: ${(Number(r.score)*100).toFixed(2)}% | status: ${meta?.status} | tpl: ${meta?.template_id}`);
    });

    process.exit(0);
}

main().catch(console.error);
