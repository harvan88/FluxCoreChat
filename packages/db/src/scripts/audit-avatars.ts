import { db, assets } from '../index';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- BUSCANDO ASSETS DE TIPO AVATAR ---');
    const res = await db.select().from(assets).where(eq(assets.scope, 'profile_avatar')).limit(10);

    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}

main().catch(console.error);
