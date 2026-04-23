/**
 * DESPERTADOR SEMÁNTICO: Re-vectorización Forzada
 */

import { db, templates } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { templateSemanticService } from '../apps/api/src/services/fluxcore/template-semantic.service';

const ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';

async function main() {
    console.log(`\n🌀 INICIANDO RE-VECTORIZACIÓN FORZADA (Bypass de Eventos)`);
    console.log(`----------------------------------------------------------`);

    try {
        const myTemplates = await db.select()
            .from(templates)
            .where(eq(templates.accountId, ACCOUNT_ID));

        console.log(`🔍 Encontradas ${myTemplates.length} plantillas para procesar...`);

        for (const t of myTemplates) {
            console.log(`  > Procesando: "${t.name}" (${t.id})...`);
            // LLamada directa al motor
            await templateSemanticService.syncTemplateVector(t.id, ACCOUNT_ID, true);
        }

        console.log(`\n✅ Proceso completado. Verificando resultados finales...`);
        const { spawnSync } = await import('node:child_process');
        const audit = spawnSync('bun', ['run', 'scripts/check-vectors.ts'], { encoding: 'utf8' });
        console.log(audit.stdout);

    } catch (err: any) {
        console.error(`\n❌ Error en la re-vectorización:`, err.message);
    }
}

main().catch(console.error);
