import { db, fluxcoreRealityAdapters } from '@fluxcore/db';

async function register() {
  const adapters = [
    {
      adapterId: 'chatcore-gateway',
      driverId: 'chatcore/internal',
      adapterClass: 'GATEWAY',
      description: 'Web Chat Reality Gateway',
      signingSecret: 'chatcore-dev-secret-local',
      adapterVersion: '1.0.0',
    },
    {
        adapterId: 'fluxcore-cognition-gateway',
        driverId: 'fluxcore/cognition',
        adapterClass: 'GATEWAY',
        description: 'Internal Cognition Dispatcher Gateway',
        signingSecret: 'fluxcore-cognition-dev-secret-local',
        adapterVersion: '1.0.0',
    },
    {
        adapterId: 'cognitive-gateway',
        driverId: 'fluxcore/cognition',
        adapterClass: 'GATEWAY',
        description: 'Cognitive Reality Observer Gateway',
        signingSecret: 'sovereign-secret-key-change-me-in-prod',
        adapterVersion: '1.0.0',
    },
    {
        adapterId: 'runtime-gateway',
        driverId: 'fluxcore/cognition',
        adapterClass: 'GATEWAY',
        description: 'AI Runtime Gateway',
        signingSecret: 'sovereign-secret-key-change-me-in-prod',
        adapterVersion: '1.0.0',
    },
    {
        adapterId: 'kernel-projector-adapter',
        driverId: 'kernel/projector',
        adapterClass: 'GATEWAY',
        description: 'Kernel Projector Truth Observer',
        signingSecret: 'sovereign-secret-key-change-me-in-prod',
        adapterVersion: '1.0.0',
    }
  ];

  for (const adapter of adapters) {
    console.log(`Checking/Registering ${adapter.adapterId}...`);
    await db.insert(fluxcoreRealityAdapters)
      .values(adapter as any)
      .onConflictDoUpdate({
        target: fluxcoreRealityAdapters.adapterId,
        set: adapter as any
      });
  }
  
  console.log('--- ALL ADAPTERS REGISTERED ---');
  process.exit(0);
}

register();
