/**
 * EMERGENCY RESTORE: Reinstala @fluxcore/asistentes para TODAS las cuentas
 * que perdieron su instalación durante la migración de IDs canónicos.
 */
import { db, accounts, extensionInstallations } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';

async function restore() {
    console.log('=== RESTAURACIÓN DE INSTALACIONES ===');

    // 1. Obtener todas las cuentas
    const allAccounts = await db.select({ id: accounts.id }).from(accounts);
    console.log(`Total cuentas: ${allAccounts.length}`);

    // 2. Obtener cuentas que YA tienen @fluxcore/asistentes
    const existing = await db
        .select({ accountId: extensionInstallations.accountId })
        .from(extensionInstallations)
        .where(eq(extensionInstallations.extensionId, '@fluxcore/asistentes'));

    const alreadyInstalled = new Set(existing.map(e => e.accountId));
    console.log(`Cuentas que ya tienen instalación: ${alreadyInstalled.size}`);

    // 3. Filtrar las que necesitan instalación
    const needInstall = allAccounts.filter(a => !alreadyInstalled.has(a.id));
    console.log(`Cuentas que necesitan restauración: ${needInstall.length}`);

    if (needInstall.length === 0) {
        console.log('✅ Todas las cuentas ya tienen @fluxcore/asistentes instalado');
        return;
    }

    // 4. Insertar en lote
    const defaultConfig = {
        enabled: true,
        provider: 'groq',
        mode: 'suggest',
        responseDelay: 30,
        model: 'llama-3.1-8b-instant',
        maxTokens: 256,
        temperature: 0.7,
    };

    const defaultPermissions = [
        'read:context.public',
        'read:context.private',
        'read:context.relationship',
        'read:context.history',
        'write:context.overlay',
        'send:messages',
        'modify:automation',
    ];

    const values = needInstall.map(a => ({
        accountId: a.id,
        extensionId: '@fluxcore/asistentes',
        version: '1.0.0',
        enabled: true,
        config: defaultConfig,
        grantedPermissions: defaultPermissions,
        grantedBy: null,
        canSharePermissions: true,
    }));

    await db.insert(extensionInstallations).values(values);
    console.log(`✅ Instalado @fluxcore/asistentes para ${needInstall.length} cuentas`);

    // 5. Verificación final
    const total = await db
        .select({ accountId: extensionInstallations.accountId })
        .from(extensionInstallations)
        .where(eq(extensionInstallations.extensionId, '@fluxcore/asistentes'));
    console.log(`\nVerificación: ${total.length} cuentas con @fluxcore/asistentes`);
    console.log('=== RESTAURACIÓN COMPLETA ===');
}

restore()
    .catch(err => { console.error('ERROR:', err); process.exit(1); })
    .then(() => process.exit(0));
