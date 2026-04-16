import { db, templates, fluxcoreTemplateSettings, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { templateSemanticService } from '../services/fluxcore/template-semantic.service';

/**
 * Script de Inicialización de Vectores de Plantillas
 * 
 * Lee todas las plantillas autorizadas de una cuenta y genera sus vectores iniciales.
 */

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno

async function initialize() {
    console.log(`\n🚀 INICIALIZANDO VECTORES PARA CUENTA: ${ACCOUNT_ID}`);

    // LIMPIEZA PREVIA (Para asegurar consistencia de llaves snake_case)
    const storeId = await templateSemanticService.getOrCreateSystemStore(ACCOUNT_ID);
    await db.delete(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.vectorStoreId, storeId));
    console.log(`🧹 Limpieza completada para Store ID: ${storeId}`);

    const authorizedTemplates = await db.select({
        id: templates.id
    })
    .from(templates)
    .innerJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
    .where(and(
        eq(templates.accountId, ACCOUNT_ID),
        eq(fluxcoreTemplateSettings.authorizeForAI, true)
    ));

    console.log(`📊 Encontradas ${authorizedTemplates.length} plantillas autorizadas.`);

    let indexed = 0;
    for (const t of authorizedTemplates) {
        console.log(`[INDEX] Procesando plantilla: ${t.id}`);
        await templateSemanticService.syncTemplateVector(t.id, ACCOUNT_ID, true);
        indexed++;
    }

    console.log(`\n✅ Proceso completado. ${indexed} plantillas indexadas semánticamente.`);
    process.exit(0);
}

initialize().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
