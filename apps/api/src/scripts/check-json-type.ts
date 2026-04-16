import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno

async function diagnose() {
    console.log(`\n🔍 INSPECCIÓN DE LLAVES JSON`);
    
    const sample = await db.select({
        m: fluxcoreDocumentChunks.metadata
    })
    .from(fluxcoreDocumentChunks)
    .where(eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID))
    .limit(1);

    if (sample.length > 0) {
        console.log(`Metadata Raw:`, sample[0].m);
        console.log(`Type of Metadata:`, typeof sample[0].m);
        
        if (typeof sample[0].m === 'string') {
            console.log(`⚠️ ALERTA: Metadata se está guardando como STRING en un campo JSONB (Double wrapping?)`);
        }
    }

    process.exit(0);
}

diagnose().catch(console.error);
