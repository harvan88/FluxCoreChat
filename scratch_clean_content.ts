import { db, templates } from './packages/db';
import { eq, and, sql } from 'drizzle-orm';

async function run() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const tag = 'system:schedule';
    
    console.log('🚀 Cleaning up drjones template content (Removing tool instructions from content)...');
    
    await db.update(templates)
        .set({ 
            content: `Nuestros horarios de atención son gestionados de forma dinámica para reflejar la realidad de cada sede.\n\n{{system:schedules}}`,
            updatedAt: new Date()
        })
        .where(and(
            eq(templates.accountId, accountId),
            sql`${templates.tags} @> ${JSON.stringify([tag])}::jsonb`
        ));
        
    console.log('✅ Done!');
    process.exit(0);
}

run().catch(console.error);
