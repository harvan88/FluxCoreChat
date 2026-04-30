import { db, templates } from '@fluxcore/db';
import { eq, and, or, like } from 'drizzle-orm';

async function check() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`🔍 Checking templates for account: ${accountId}`);
    
    const results = await db
        .select({
            id: templates.id,
            name: templates.name,
            trigger: templates.triggerKeyword,
            isPublic: templates.isPublic,
            isActive: templates.isActive
        })
        .from(templates)
        .where(eq(templates.accountId, accountId));
    
    console.log(`✅ Found ${results.length} templates:`);
    results.forEach(r => {
        if (r.trigger) {
            console.log(`   - [${r.isActive ? 'ACTIVE' : 'OFF'}] [${r.isPublic ? 'PUB' : 'PRIV'}] "${r.name}" -> Trigger: "${r.trigger}"`);
        }
    });
}

check().catch(console.error);
