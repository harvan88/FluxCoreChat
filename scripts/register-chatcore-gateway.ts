
import { db, fluxcoreRealityAdapters } from '@fluxcore/db';

async function main() {
    console.log('🔌 Registering ChatCore Gateway Adapter...');

    try {
        await db.insert(fluxcoreRealityAdapters).values({
            adapterId: 'fluxcore/chatcore-gateway',
            driverId: '@fluxcore/chatcore',
            adapterClass: 'GATEWAY',
            description: 'Internal ChatCore Reality Gateway',
            signingSecret: 'sovereign-secret-key-change-me-in-prod',
            adapterVersion: '1.0.0',
        }).onConflictDoUpdate({
            target: fluxcoreRealityAdapters.adapterId,
            set: {
                driverId: '@fluxcore/chatcore',
                adapterClass: 'GATEWAY',
                signingSecret: 'sovereign-secret-key-change-me-in-prod',
                adapterVersion: '1.0.0',
            }
        });

        console.log('✅ Adapter registered successfully: fluxcore/chatcore-gateway');
    } catch (error) {
        console.error('❌ Failed to register adapter:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

main();
