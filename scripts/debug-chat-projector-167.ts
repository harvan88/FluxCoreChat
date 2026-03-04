
import { db, fluxcoreSignals } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { ChatProjector } from '../apps/api/src/core/projections/chat-projector';

async function main() {
    console.log('🐞 Debugging ChatProjector for Signal #168...');

    const [signal] = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.sequenceNumber, 168));
    if (!signal) {
        console.error('❌ Signal #168 not found');
        return;
    }

    console.log('Signal found. Attempting projection...');
    const projector = new ChatProjector();
    
    try {
        await projector['project'](signal, db); // Access protected method
        console.log('✅ Projection successful!');
    } catch (error) {
        console.error('❌ Projection failed:', error);
    }
}

main().catch(console.error).then(() => process.exit(0));
