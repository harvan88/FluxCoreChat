import { db, templates } from '../index';
import { templateSemanticService } from '../../../../apps/api/src/services/fluxcore/template-semantic.service';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('PARAISO RAG: VALIDACION FINAL');
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

    const allTemplates = await db.select().from(templates).where(eq(templates.accountId, accountId)).limit(10);
    console.log(`Plantillas encontradas: ${allTemplates.length}`);

    const updated = await templateSemanticService.guaranteeSymmetry(allTemplates, accountId);
    console.log(`Sincronizadas: ${updated}`);

    const query = 'precios tratamientos dentales';
    console.log(`Query: ${query}`);

    const results = await templateSemanticService.searchRelevantTemplatesWithScores(query, accountId);
    console.log(`Resultados: ${results.length}`);
    results.forEach((r, i) => console.log(`  [${i + 1}] ID: ${r.id} | Score: ${(r.score * 100).toFixed(2)}%`));

    process.exit(0);
}

main().catch(console.error);
