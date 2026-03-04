
import { db, fluxcoreSignals, fluxcoreProjectorErrors, fluxcoreActors } from '@fluxcore/db';
import { sql, inArray } from 'drizzle-orm';

async function main() {
    const badId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56';
    console.log(`🔍 Searching for signals with bad ID: ${badId}...`);

    const signals = await db.select({
        seq: fluxcoreSignals.sequenceNumber,
        type: fluxcoreSignals.factType
    })
    .from(fluxcoreSignals)
    .where(sql`evidence_raw::text LIKE ${`%${badId}%`}`);

    if (signals.length === 0) {
        console.log('✅ No poison signals found.');
        return;
    }

    console.log(`Found ${signals.length} poison signals:`);
    signals.forEach(s => console.log(` - #${s.seq} [${s.type}]`));

    const seqs = signals.map(s => s.seq);
    console.log(`\n🧹 Deleting signals: ${seqs.join(', ')}...`);

    // 1. Delete Projector Errors
    await db.delete(fluxcoreProjectorErrors)
        .where(inArray(fluxcoreProjectorErrors.signalSeq, seqs));
    console.log('✅ Deleted projector errors');

    // 2. Delete Actors (created from these signals)
    await db.delete(fluxcoreActors)
        .where(inArray(fluxcoreActors.createdFromSignal, seqs));
    console.log('✅ Deleted associated actors');

    // 3. Delete Signals
    await db.delete(fluxcoreSignals)
        .where(inArray(fluxcoreSignals.sequenceNumber, seqs));
    console.log('✅ Deleted signals');
    
    console.log('🎉 Cleanup complete. The projector should resume automatically.');
}

main().catch(console.error).then(() => process.exit(0));
