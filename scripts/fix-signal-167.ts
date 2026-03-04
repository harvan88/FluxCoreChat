
import { db, fluxcoreActors, fluxcoreAddresses, fluxcoreActorAddressLinks, fluxcoreSignals } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function main() {
    console.log('🔧 Fixing missing Identity Data for Signal #167...');

    const visitorToken = 'vtok_1771730557704_806';
    const driverId = 'chatcore/webchat';

    // 1. Get Actor
    const [actor] = await db.select().from(fluxcoreActors).where(eq(fluxcoreActors.externalKey, visitorToken));
    if (!actor) {
        console.error('❌ Actor not found! This should not happen based on previous inspection.');
        return;
    }
    console.log(`✅ Found Actor: ${actor.id}`);

    // 2. Create Address if missing
    let [address] = await db.select().from(fluxcoreAddresses).where(and(
        eq(fluxcoreAddresses.driverId, driverId),
        eq(fluxcoreAddresses.externalId, visitorToken)
    ));

    if (!address) {
        console.log('⚠️ Address missing. Creating...');
        [address] = await db.insert(fluxcoreAddresses).values({
            driverId,
            externalId: visitorToken,
        }).returning();
        console.log(`✅ Created Address: ${address.id}`);
    } else {
        console.log(`✅ Address already exists: ${address.id}`);
    }

    // 3. Create Link if missing
    let [link] = await db.select().from(fluxcoreActorAddressLinks).where(and(
        eq(fluxcoreActorAddressLinks.actorId, actor.id),
        eq(fluxcoreActorAddressLinks.addressId, address.id)
    ));

    if (!link) {
        console.log('⚠️ Link missing. Creating...');
        [link] = await db.insert(fluxcoreActorAddressLinks).values({
            actorId: actor.id,
            addressId: address.id,
            confidence: 1.0,
            version: 1
        }).returning();
        console.log(`✅ Created Link: ${link.id}`);
    } else {
        console.log(`✅ Link already exists: ${link.id}`);
    }

    console.log('🎉 Fix complete. ChatProjector should now be able to process Signal #167.');
}

main().catch(console.error).then(() => process.exit(0));
