import { db, fluxcoreDocumentChunks, messages, templates } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const query = 'HORARIO_SUNDIO';
    console.log(`--- 🕵️ BÚSQUEDA GLOBAL DE "${query}" ---`);

    // 1. Chunks (RAG)
    const chunks = await db.select().from(fluxcoreDocumentChunks).where(sql`content ILIKE ${'%' + query + '%'}`);
    console.log(`\n📚 Encontrado en Chunks (RAG): ${chunks.length}`);
    chunks.forEach(c => console.log(`   - ID: ${c.id}, Account: ${c.accountId}, Content: ${c.content?.substring(0, 100)}...`));

    // 2. Mensajes (Historial)
    const msgs = await db.select().from(messages).where(sql`content::text ILIKE ${'%' + query + '%'}`);
    console.log(`\n💬 Encontrado en Historial de Mensajes: ${msgs.length}`);
    msgs.forEach(m => console.log(`   - ID: ${m.id}, Conv: ${m.conversationId}, CreatedAt: ${m.createdAt}`));

    // 3. Plantillas (Legacy Fields?)
    const tmpls = await db.select().from(templates).where(sql`instructions ILIKE ${'%' + query + '%'}`);
    console.log(`\n📋 Encontrado en Instrucciones de Plantillas: ${tmpls.length}`);
}

main().catch(console.error);
