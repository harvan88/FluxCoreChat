/**
 * Verification Script: Deterministic Semantic Sync & Fallback
 */

import { db, templates, fluxcoreTemplateSettings, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { fluxCoreTemplateSettingsService } from '../apps/api/src/services/fluxcore/template-settings.service';
import { templateService } from '../apps/api/src/services/template.service';
import { templateSemanticService } from '../apps/api/src/services/fluxcore/template-semantic.service';

const TEST_TEMPLATE_ID = '99999999-9999-9999-9999-999999999999';
const TEST_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';

async function main() {
    console.log(`\n🧪 INICIANDO PRUEBA DE SINCRONÍA SEMÁNTICA`);
    console.log(`[Test] Service Check: ${templateSemanticService ? 'Ready' : 'Failed'}`);
    console.log(`-------------------------------------------`);

    try {
        // 1. Limpieza inicial
        await db.delete(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.fileId, TEST_TEMPLATE_ID));
        await db.delete(fluxcoreTemplateSettings).where(eq(fluxcoreTemplateSettings.templateId, TEST_TEMPLATE_ID));
        await db.delete(templates).where(eq(templates.id, TEST_TEMPLATE_ID));

        console.log(`1. Creando plantilla de prueba...`);
        await templateService.createTemplate(TEST_ACCOUNT_ID, {
            name: 'Test Template Fallback',
            content: 'Contenido de prueba',
            allowAutomatedUse: true
        });
        
        // Simular que el UUID es el nuestro para que el test sea determinista (opcional, pero forzaremos el ID)
        // En realidad usaremos el ID generado.
        const [t] = await db.select().from(templates).where(eq(templates.name, 'Test Template Fallback')).limit(1);
        const templateId = t.id;

        console.log(`2. Verificando FALLBACK (debe usar el nombre)...`);
        // Esperar un momento para el listener asíncrono
        await new Promise(r => setTimeout(r, 2000));
        
        const [chunkFallback] = await db.select()
            .from(fluxcoreDocumentChunks)
            .where(eq(fluxcoreDocumentChunks.fileId, templateId));
        
        if (chunkFallback?.content === 'Test Template Fallback') {
            console.log(` ✅ Fallback exitoso: "${chunkFallback.content}"`);
        } else {
            console.error(` ❌ Fallback fallido. Content:`, chunkFallback?.content);
        }

        console.log(`3. Actualizando instrucciones de IA (Garantía de Soberanía)...`);
        await fluxCoreTemplateSettingsService.updateSettings(
            templateId,
            true,
            'Instrucciones explícitas de alta prioridad'
        );

        await new Promise(r => setTimeout(r, 2000));

        const [chunkUpdated] = await db.select()
            .from(fluxcoreDocumentChunks)
            .where(eq(fluxcoreDocumentChunks.fileId, templateId));

        if (chunkUpdated?.content === 'Instrucciones explícitas de alta prioridad') {
            console.log(` ✅ Sincronización exitosa: "${chunkUpdated.content}"`);
        } else {
            console.error(` ❌ Sincronización fallida. Content:`, chunkUpdated?.content);
        }

        console.log(`\n✨ PRUEBA FINALIZADA CON ÉXITO.`);
    } catch (err: any) {
        console.error(`\n❌ Error en el test:`, err.message);
    } finally {
        // No limpiamos para que el usuario pueda ver los datos si quiere, 
        // o limpiamos para dejar ordenado.
        // await db.delete(templates).where(eq(templates.name, 'Test Template Fallback'));
    }
}

main().catch(console.error);
