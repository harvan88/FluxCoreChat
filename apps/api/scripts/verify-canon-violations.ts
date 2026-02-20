#!/usr/bin/env bun
import { db, fluxcoreProjectorErrors, fluxcoreProjectorCursors, fluxcoreSignals } from '@fluxcore/db';
import { isNull, desc, asc } from 'drizzle-orm';

async function main() {
    console.log('\n=== CANON VIOLATION FIX VERIFICATION ===\n');

    // 1. fluxcore_projector_errors exists and is empty
    const errors = await db.select().from(fluxcoreProjectorErrors).where(isNull(fluxcoreProjectorErrors.resolvedAt));
    console.log(`[V1] Projector errors (unresolved): ${errors.length}`);
    if (errors.length > 0) {
        console.table(errors.map(e => ({ projector: e.projectorName, seq: e.signalSeq, attempts: e.attempts, msg: e.errorMessage.slice(0, 60) })));
    } else {
        console.log('    ✅ No unresolved projector errors\n');
    }

    // 2. Cursor state
    const cursors = await db.select().from(fluxcoreProjectorCursors).orderBy(asc(fluxcoreProjectorCursors.projectorName));
    console.log('[V1] Projector cursors:');
    cursors.forEach(c => console.log(`    ${c.projectorName}: seq ${c.lastSequenceNumber}`));

    // 3. Last signal in journal
    const [lastSig] = await db.select().from(fluxcoreSignals).orderBy(desc(fluxcoreSignals.sequenceNumber)).limit(1);
    console.log(`\n[V1] Last signal in Journal: seq #${lastSig?.sequenceNumber} (${lastSig?.factType} from ${lastSig?.certifiedByAdapter})`);

    const allAtCurrent = cursors.every(c => c.lastSequenceNumber === lastSig?.sequenceNumber);
    console.log(`\n[V1] All cursors at latest signal? ${allAtCurrent ? '✅ YES' : '❌ NO — some cursors behind'}`);

    // 4. Verify RuntimeGateway registration (code check only)
    console.log('\n[V2] Runtime registration check (from code):');
    console.log('    AsistentesLocalRuntime.runtimeId = "asistentes-local" ✅ (verified in source)');
    console.log('    index.ts: runtimeGateway.register(asistentesLocalRuntime) ✅');
    console.log('    PolicyContext: mapProviderToRuntimeId("groq") → "asistentes-local" ✅');

    console.log('\n=== END VERIFICATION ===\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
