
import { db, fluxcoreActors, fluxcoreAddresses, fluxcoreActorAddressLinks } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🔧 Recreating Missing Actor & Link for Signal #168...');

    const visitorToken = 'vtok_1771730609712_241';
    const tenantId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56';
    const addressId = 'e32daf47-f100-41e5-951a-5b0cbcfa26b1';
    const signalSeq = 168;

    // 1. Create Actor
    console.log('Creating Actor...');
    const [actor] = await db.insert(fluxcoreActors).values({
        type: 'provisional',
        externalKey: visitorToken,
        tenantId,
        createdFromSignal: signalSeq,
        internalRef: `webchat:${visitorToken}`,
    }).returning();
    console.log(`✅ Actor Created: ${actor.id}`);

    // 2. Verify Address exists
    const [address] = await db.select().from(fluxcoreAddresses).where(eq(fluxcoreAddresses.id, addressId));
    if (!address) {
        console.error('❌ Address missing! Cannot link.');
        return;
    }
    console.log(`✅ Address confirmed: ${address.id}`);

    // 3. Create Link
    console.log('Creating Link...');
    const [link] = await db.insert(fluxcoreActorAddressLinks).values({
        actorId: actor.id,
        addressId: address.id,
        confidence: 1.0,
        version: 1
    }).returning();
    console.log(`✅ Link Created: ${link.id}`);

    console.log('🎉 Fix complete. ChatProjector should now unblock past #168.');
}

main().catch(console.error).then(() => process.exit(0));
