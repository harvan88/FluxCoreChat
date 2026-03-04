
import { db, fluxcoreSignals, fluxcoreAddresses, fluxcoreActors, fluxcoreActorAddressLinks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function main() {
    console.log('🔍 Inspecting Signal #167 and Identity State...');

    const [signal] = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.sequenceNumber, 167));
    if (!signal) {
        console.log('❌ Signal #167 not found');
        return;
    }

    console.log('Signal #167:', {
        seq: signal.sequenceNumber,
        type: signal.factType,
        driver: signal.provenanceDriverId,
        subject: signal.subjectKey,
    });

    const visitorToken = signal.subjectKey;

    if (!visitorToken) {
        console.log('❌ No subjectKey in signal');
        return;
    }

    // Check Actor
    const [actor] = await db.select().from(fluxcoreActors).where(eq(fluxcoreActors.externalKey, visitorToken));
    console.log('Actor:', actor ? actor.id : 'MISSING');

    // Check Address
    const [address] = await db.select().from(fluxcoreAddresses).where(and(
        eq(fluxcoreAddresses.driverId, signal.provenanceDriverId),
        eq(fluxcoreAddresses.externalId, visitorToken)
    ));
    console.log('Address:', address ? address.id : 'MISSING');

    if (actor && address) {
        // Check Link
        const [link] = await db.select().from(fluxcoreActorAddressLinks).where(and(
            eq(fluxcoreActorAddressLinks.actorId, actor.id),
            eq(fluxcoreActorAddressLinks.addressId, address.id)
        ));
        console.log('Link:', link ? link.id : 'MISSING');
    }
}

main().catch(console.error).then(() => process.exit(0));
