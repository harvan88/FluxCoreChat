#!/usr/bin/env bun
/**
 * Wakes up all projectors manually.
 * Use this after the API server has been processing signals
 * but the projectors may be stuck on a poison-pill signal.
 */
import { identityProjector } from '../src/services/fluxcore/identity-projector.service';
import { chatProjector } from '../src/core/projections/chat-projector';
import { db, fluxcoreProjectorCursors } from '@fluxcore/db';

const RESET = process.argv.includes('--reset');

async function main() {
    if (RESET) {
        console.log('🔄 Resetting projector cursors to 0...');
        await db.delete(fluxcoreProjectorCursors);
        console.log('   ✅ Cursors reset');
    }

    console.log('\n🚀 Waking up projectors...\n');

    console.log('[1/2] IdentityProjector...');
    await identityProjector.wakeUp();
    console.log('[1/2] IdentityProjector done\n');

    console.log('[2/2] ChatProjector...');
    await chatProjector.wakeUp();
    console.log('[2/2] ChatProjector done\n');

    console.log('✅ All projectors processed.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ wakeup-projectors failed:', err);
    process.exit(1);
});
