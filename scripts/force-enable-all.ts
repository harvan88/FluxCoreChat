
import { db, automationRules } from '@fluxcore/db';

async function main() {
    console.log('🔥 FORZANDO AUTOMATIC EN TODAS LAS REGLAS (Globales y Relacionales)...');

    // Actualizar TODAS las filas de la tabla sin filtros
    const result = await db.update(automationRules)
        .set({ mode: 'automatic', enabled: true, updatedAt: new Date() })
        .returning();

    console.log(`✅ ${result.length} reglas actualizadas a AUTOMATIC.`);
    result.forEach(r => {
        console.log(`   - ID: ${r.id} | Account: ${r.accountId} | Rel: ${r.relationshipId || 'GLOBAL'}`);
    });
}
main().catch(console.error).then(() => process.exit(0));
