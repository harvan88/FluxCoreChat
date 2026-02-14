import { db, accountRuntimeConfig } from '../packages/db/src';
import { eq } from 'drizzle-orm';

async function setup() {
    const haroldId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

    console.log(`Setting up Master Switch for Harold (${haroldId})...`);

    await db.insert(accountRuntimeConfig).values({
        accountId: haroldId,
        activeRuntimeId: '@fluxcore/fluxcore', // El cerebro de Agentes
        config: {
            preferredAssistantId: 'ed582f16-af36-48bd-b76e-025c0d04d3ab', // Su asistente activo
            lastUpdatedBy: 'Antigravity-Refactor'
        }
    }).onConflictDoUpdate({
        target: accountRuntimeConfig.accountId,
        set: {
            activeRuntimeId: '@fluxcore/fluxcore',
            config: {
                preferredAssistantId: 'ed582f16-af36-48bd-b76e-025c0d04d3ab',
                lastUpdatedBy: 'Antigravity-Refactor'
            },
            updatedAt: new Date()
        }
    });

    console.log('✅ Harold is now officially using FluxCore Agentes as his Master Runtime.');
}

setup().catch(console.error);
