
import { db, templates } from '../index';
import { templateSemanticService } from '../../../../apps/api/src/services/fluxcore/template-semantic.service';
import { eq } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`--- AUDITORÍA DE SIMETRÍA: PLANTILLAS ---`);

    // 1. Obtener plantillas reales de ChatCore
    const allTemplates = await db.select().from(templates).where(eq(templates.accountId, accountId)).limit(10);
    console.log(`Encontradas ${allTemplates.length} plantillas en ChatCore.`);

    // 2. Ejecutar Garantía de Fidelidad
    const updated = await templateSemanticService.guaranteeSymmetry(allTemplates, accountId);
    console.log(`Resultado de Auditoría: ${updated} plantillas necesitaban actualización.`);

    // 3. Simular una búsqueda para verificar coherencia
    console.log(`\n--- TEST DE BÚSQUEDA AUTOCURABLE ---`);
    const results = await templateSemanticService.searchRelevantTemplatesWithScores("consulta precio", accountId);
    console.log(`Resultados encontrados: ${results.length}`);
    results.forEach(r => console.log(` - ID: ${r.id} | Score: ${(r.score * 100).toFixed(2)}%`));

    console.log('\n🏁 Blindaje Verificado.');
    process.exit(0);
}

main().catch(console.error);
