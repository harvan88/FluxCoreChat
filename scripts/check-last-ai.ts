import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const CONV = 'b52e5276-021d-4084-8eea-70bde0df6a33';

const rows = await db.execute(sql`
    SELECT id, generated_by, type, content, created_at
    FROM messages
    WHERE conversation_id = ${CONV}
    ORDER BY created_at DESC
    LIMIT 6
`);

console.log('\n=== Últimos mensajes en conversación Harold↔Daniel ===\n');
for (const r of rows as any[]) {
    const raw = typeof r.content === 'string' ? r.content : JSON.stringify(r.content);
    const text = raw?.slice(0, 300) ?? '(null)';
    console.log(`[${r.created_at}] by=${r.generated_by}`);
    console.log(`  content: ${text}`);
    console.log();
}
process.exit(0);
