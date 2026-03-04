
import { db, conversations } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';

async function main() {
    const tokens = ['vtok_1771730557704_806', 'vtok_1771730609712_241'];
    console.log(`🔍 Checking conversations for tokens: ${tokens.join(', ')}...`);

    const convs = await db.select().from(conversations).where(inArray(conversations.visitorToken, tokens));
    
    console.log(`Found ${convs.length} conversations.`);
    convs.forEach(c => {
        console.log(` - ID: ${c.id} | Visitor: ${c.visitorToken} | Rel: ${c.relationshipId}`);
    });
}

main().catch(console.error).then(() => process.exit(0));
