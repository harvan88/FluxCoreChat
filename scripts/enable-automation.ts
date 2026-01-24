
import { db, accounts, automationRules } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

async function main() {
    console.log('🔧 Activando Automatización Global...');

    // 1. Obtener cuenta (la primera o todas)
    const accountsList = await db.select().from(accounts);

    if (accountsList.length === 0) {
        console.error('❌ No accounts found.');
        process.exit(1);
    }

    for (const account of accountsList) {
        console.log(`👤 Cuenta: ${account.id} (${account.email || 'No email'})`);

        // Buscar regla global existente
        const [existingRule] = await db.select().from(automationRules).where(
            and(
                eq(automationRules.accountId, account.id),
                isNull(automationRules.relationshipId)
            )
        );

        if (existingRule) {
            console.log(`   🔸 Regla existente detectada. ID: ${existingRule.id}`);
            console.log(`      Modo actual: ${existingRule.mode}`);

            if (existingRule.mode !== 'automatic') {
                console.log('   🔄 Actualizando a AUTOMATIC...');
                await db.update(automationRules)
                    .set({
                        mode: 'automatic',
                        enabled: true,
                        updatedAt: new Date()
                    })
                    .where(eq(automationRules.id, existingRule.id));
                console.log('   ✅ Hecho.');
            } else {
                console.log('   ✅ Ya está en AUTOMATIC.');
            }
        } else {
            console.log('   🆕 Creando nueva regla global AUTOMATIC...');
            await db.insert(automationRules).values({
                accountId: account.id,
                mode: 'automatic',
                enabled: true,
                relationshipId: null, // Global
                config: {},
            });
            console.log('   ✅ Creada.');
        }
    }

    console.log('🎉 Automatización activada para todas las cuentas.');
    process.exit(0);
}

main().catch(console.error);
