import { db, templates, accounts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function test() {
    console.log('🔍 Locating Template: "Ximena - Modelado 360 (Precio)" for "drjones"...');
    
    try {
        const [template] = await db
            .select({
                template: templates,
                account: accounts
            })
            .from(templates)
            .innerJoin(accounts, eq(templates.accountId, accounts.id))
            .where(
                and(
                    eq(templates.name, 'Ximena - Modelado 360 (Precio)'),
                    eq(accounts.username, 'drjones')
                )
            )
            .limit(1);
        
        if (template) {
            console.log('✅ Template Found!');
            console.log(JSON.stringify(template.template, null, 2));
        } else {
            console.log('❌ Template not found.');
        }

    } catch (err) {
        console.error('❌ Database query failed:', err);
    }

    process.exit(0);
}

test().catch(err => {
    console.error('💥 Test script error:', err);
    process.exit(1);
});
