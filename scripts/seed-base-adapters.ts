import { db, fluxcoreRealityAdapters } from '@fluxcore/db';

const CHATCORE_SIGNING_SECRET =
    process.env.CHATCORE_SIGNING_SECRET || 'chatcore-dev-secret-local';

const WEBCHAT_SIGNING_SECRET =
    process.env.WEBCHAT_SIGNING_SECRET || 'webchat-dev-secret-local';

async function main() {
    console.log('🔌 Seeding base reality adapters...');

    await db.insert(fluxcoreRealityAdapters).values([
        {
            adapterId: 'chatcore-gateway',
            driverId: 'chatcore/internal',
            adapterClass: 'GATEWAY',
            description: 'Certifica mensajes desde el backend autenticado de la plataforma.',
            signingSecret: CHATCORE_SIGNING_SECRET,
            adapterVersion: '1.0.0',
        },
        {
            adapterId: 'chatcore-webchat-gateway',
            driverId: 'chatcore/webchat',
            adapterClass: 'GATEWAY',
            description: 'Certifica mensajes desde el widget embebible. Identidad puede ser provisional.',
            signingSecret: WEBCHAT_SIGNING_SECRET,
            adapterVersion: '1.0.0',
        },
    ]).onConflictDoNothing();

    console.log('✅ Base adapters seeded:');
    console.log('   - chatcore-gateway (driverId: chatcore/internal)');
    console.log('   - chatcore-webchat-gateway (driverId: chatcore/webchat)');

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Failed to seed adapters:', err);
    process.exit(1);
});
