
import { db, automationRules } from '@fluxcore/db';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

async function main() {
    // ID obtenido del log de error del servidor
    const targetAccountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a';
    console.log(`🔍 Debugging Automation Rules for Account: ${targetAccountId}`);

    // 1. Reglas Globales
    const globalRules = await db.select().from(automationRules)
        .where(and(
            eq(automationRules.accountId, targetAccountId),
            isNull(automationRules.relationshipId)
        ));

    console.log('\n🌍 Global Rules (debería haber una AUTOMATIC):');
    if (globalRules.length === 0) console.log('   ❌ No global rule found!');
    globalRules.forEach(r => {
        console.log(`   - ID: ${r.id}`);
        console.log(`     Mode: ${r.mode}`);
        console.log(`     Enabled: ${r.enabled}`);
    });

    // 2. Reglas Específicas de Relación
    const relRules = await db.select().from(automationRules)
        .where(and(
            eq(automationRules.accountId, targetAccountId),
            isNotNull(automationRules.relationshipId)
        ));

    console.log(`\n🔗 Specific Relationship Rules (${relRules.length} found):`);
    relRules.forEach(r => {
        console.log(`   - RelID: ${r.relationshipId}`);
        console.log(`     Mode: ${r.mode}`);
        console.log(`     Enabled: ${r.enabled}`);
    });
}

main().catch(console.error).then(() => process.exit(0));
