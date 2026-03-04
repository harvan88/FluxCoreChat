
import { db, fluxcoreSignals, fluxcoreActors, fluxcoreAddresses, fluxcoreActorAddressLinks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function main() {
    console.log('🔍 Inspecting Signal #168 Identity State...');

    const [signal] = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.sequenceNumber, 168));
    if (!signal) {
        console.log('❌ Signal #168 not found');
        return;
    }

    const visitorToken = signal.subjectKey;
    if (!visitorToken) {
        console.log('❌ No subjectKey in signal');
        return;
    }
    
    console.log(`Signal #168 Subject: ${visitorToken}`);

    // Check Address
    const [address] = await db.select().from(fluxcoreAddresses).where(and(
        eq(fluxcoreAddresses.driverId, signal.provenanceDriverId),
        eq(fluxcoreAddresses.externalId, visitorToken)
    ));
    console.log('Address:', address ? address.id : 'MISSING');

    // Check Actor
    // Note: The actor might be different or the same as #167 depending on if it's the same visitor
    // But we check by externalKey
    const [actor] = await db.select().from(fluxcoreActors).where(eq(fluxcoreActors.externalKey, visitorToken));
    console.log('Actor:', actor ? actor.id : 'MISSING');

    if (address && actor) {
        const [link] = await db.select().from(fluxcoreActorAddressLinks).where(and(
            eq(fluxcoreActorAddressLinks.actorId, actor.id),
            eq(fluxcoreActorAddressLinks.addressId, address.id)
        ));
        console.log('Link:', link ? link.id : 'MISSING');
    } else {
        console.log('Link: Cannot check (missing actor or address)');
    }
}

main().catch(console.error).then(() => process.exit(0));
