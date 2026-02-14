import { db, extensionInstallations, actors, automationRules, accountRuntimeConfig } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

async function migrate() {
    console.log('--- STARTING CANON ID MIGRATION ---');

    // 1. extension_installations
    console.log('Migrating extension_installations...');
    await db.update(extensionInstallations)
        .set({ extensionId: '@fluxcore/asistentes' })
        .where(eq(extensionInstallations.extensionId, '@fluxcore/fluxcore'));

    await db.update(extensionInstallations)
        .set({ extensionId: '@fluxcore/fluxi' })
        .where(eq(extensionInstallations.extensionId, '@fluxcore/wes'));

    // 2. actors
    console.log('Migrating actors...');
    await db.update(actors)
        .set({ extensionId: '@fluxcore/asistentes' })
        .where(eq(actors.extensionId, '@fluxcore/fluxcore'));

    await db.update(actors)
        .set({ extensionId: '@fluxcore/fluxi' })
        .where(eq(actors.extensionId, '@fluxcore/wes'));

    // 3. account_runtime_config (Safety check)
    console.log('Migrating account_runtime_config...');
    await db.update(accountRuntimeConfig)
        .set({ activeRuntimeId: '@fluxcore/asistentes' })
        .where(eq(accountRuntimeConfig.activeRuntimeId, '@fluxcore/fluxcore'));

    await db.update(accountRuntimeConfig)
        .set({ activeRuntimeId: '@fluxcore/fluxi' })
        .where(eq(accountRuntimeConfig.activeRuntimeId, '@fluxcore/wes'));

    // 4. automation_rules (JSONB)
    console.log('Migrating automation_rules JSONB config...');
    // Update @fluxcore/fluxcore -> @fluxcore/asistentes
    await db.execute(sql`
    UPDATE automation_rules 
    SET config = jsonb_set(config, '{extensionId}', '"@fluxcore/asistentes"') 
    WHERE config->>'extensionId' = '@fluxcore/fluxcore'
  `);

    // Update @fluxcore/wes -> @fluxcore/fluxi
    await db.execute(sql`
    UPDATE automation_rules 
    SET config = jsonb_set(config, '{extensionId}', '"@fluxcore/fluxi"') 
    WHERE config->>'extensionId' = '@fluxcore/wes'
  `);

    console.log('--- MIGRATION COMPLETE ---');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
}).then(() => process.exit(0));
