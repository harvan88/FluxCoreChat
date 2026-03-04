
import { db, fluxcoreAddresses, fluxcoreActorAddressLinks } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🔍 Inspecting Address and Link state...');

    const addressId = 'f467e95e-0eab-413d-9958-5c728671e73c'; // From the error log

    const [address] = await db.select().from(fluxcoreAddresses).where(eq(fluxcoreAddresses.id, addressId));
    console.log('Address:', address);

    if (address) {
        const links = await db.select().from(fluxcoreActorAddressLinks).where(eq(fluxcoreActorAddressLinks.addressId, addressId));
        console.log('Links found:', links.length);
        console.log('Links:', links);
    }
}

main().catch(console.error).then(() => process.exit(0));
