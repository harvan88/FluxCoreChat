
import { db, fluxcoreSignals, fluxcoreProjectorErrors, fluxcoreActors } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';

async function main() {
    const poisonSeqs = [167, 168];
    console.log(`🧹 Cleaning up poison signals: ${poisonSeqs.join(', ')}...`);

    // 1. Delete Projector Errors (Foreign Key constraint)
    const errors = await db.delete(fluxcoreProjectorErrors)
        .where(inArray(fluxcoreProjectorErrors.signalSeq, poisonSeqs))
        .returning();
    console.log(`Deleted ${errors.length} projector errors.`);

    // 2. Delete Actors created from these signals (Foreign Key constraint)
    const actors = await db.delete(fluxcoreActors)
        .where(inArray(fluxcoreActors.createdFromSignal, poisonSeqs))
        .returning();
    console.log(`Deleted ${actors.length} actors.`);

    // 3. Delete Signals
    const signals = await db.delete(fluxcoreSignals)
        .where(inArray(fluxcoreSignals.sequenceNumber, poisonSeqs))
        .returning();
    console.log(`Deleted ${signals.length} signals.`);

    console.log('✅ Cleanup complete.');
}

main().catch(console.error).then(() => process.exit(0));
