import { db, accounts } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('=== DIAGNÓSTICO RÁPIDO ===\n');

    // 1. Políticas
    console.log('1. POLÍTICAS DE IA:');
    const policies = await db.execute(sql`
        SELECT a.username, p.mode, p.account_id
        FROM fluxcore_account_policies p
        LEFT JOIN accounts a ON a.id = p.account_id
        LIMIT 5
    `) as any;
    
    policies.forEach((p: any) => {
        console.log(`   ${p.username || 'N/A'}: mode=${p.mode}`);
    });

    // 2. Conversaciones visitantes
    console.log('\n2. CONVERSACIONES VISITANTES:');
    const convs = await db.execute(sql`
        SELECT id, owner_account_id, visitor_token, relationship_id
        FROM conversations
        WHERE visitor_token IS NOT NULL
        LIMIT 3
    `) as any;
    
    console.log(`   Total: ${convs.length}`);
    convs.forEach((c: any) => {
        console.log(`   - Conv ${c.id.slice(0,8)}, owner=${c.owner_account_id.slice(0,8)}, rel=${c.relationship_id || 'NULL'}`);
    });

    // 3. Cognition queue
    console.log('\n3. COGNITION QUEUE:');
    const queue = await db.execute(sql`
        SELECT id, conversation_id, account_id, target_account_id, processed_at, last_error
        FROM fluxcore_cognition_queue
        ORDER BY created_at DESC
        LIMIT 3
    `) as any;
    
    console.log(`   Total: ${queue.length}`);
    queue.forEach((q: any) => {
        console.log(`   - Queue ${q.id}, conv=${q.conversation_id.slice(0,8)}, account=${q.account_id.slice(0,8)}, target=${q.target_account_id?.slice(0,8) || 'NULL'}, processed=${q.processed_at ? 'YES' : 'NO'}`);
        if (q.last_error) console.log(`     ERROR: ${q.last_error}`);
    });

    // 4. Self-relationships
    console.log('\n4. SELF-RELATIONSHIPS (problema):');
    const selfRels = await db.execute(sql`
        SELECT COUNT(*) as count FROM relationships
        WHERE account_a_id = account_b_id
    `) as any;
    console.log(`   Total: ${selfRels[0]?.count || 0}`);

    console.log('\n=== FIN DIAGNÓSTICO ===');
}

main().catch(console.error).then(() => process.exit(0));
