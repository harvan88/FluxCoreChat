
import { db, fluxcoreActors, fluxcoreAddresses, fluxcoreActorAddressLinks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function main() {
    console.log('🔧 Force Fixing Link for Signal #167...');

    const visitorToken = 'vtok_1771730557704_806';
    const driverId = 'chatcore/webchat';
    const targetAddressId = 'f467e95e-0eab-413d-9958-5c728671e73c';

    // 1. Get Actor
    const [actor] = await db.select().from(fluxcoreActors).where(eq(fluxcoreActors.externalKey, visitorToken));
    if (!actor) {
        console.error('❌ Actor not found!');
        return;
    }
    console.log(`✅ Actor: ${actor.id}`);

    // 2. Verify Address
    const [address] = await db.select().from(fluxcoreAddresses).where(eq(fluxcoreAddresses.id, targetAddressId));
    if (!address) {
        console.error('❌ Target Address not found!');
        return;
    }
    console.log(`✅ Address: ${address.id} (${address.externalId})`);

    // 3. Force Insert Link
    try {
        const [link] = await db.insert(fluxcoreActorAddressLinks).values({
            actorId: actor.id,
            addressId: address.id,
            confidence: 1.0,
            version: 1
        }).returning();
        console.log(`✅ Link CREATED: ${link.id}`);
    } catch (e: any) {
        console.error('⚠️ Insert failed:', e.message);
        
        // Check if it exists now
        const [existing] = await db.select().from(fluxcoreActorAddressLinks).where(and(
            eq(fluxcoreActorAddressLinks.actorId, actor.id),
            eq(fluxcoreActorAddressLinks.addressId, address.id)
        ));
        console.log('Existing Link:', existing ? existing.id : 'NONE');
    }
}

main().catch(console.error).then(() => process.exit(0));
