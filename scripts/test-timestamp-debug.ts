/**
 * Diagnóstico de tipos timestamp - Script de prueba
 * Identifica qué tipo de valor causa el error "toUTCString is not a function"
 */

import { db, chatcoreOutbox, messages, eq, sql } from '@fluxcore/db';

async function testTimestampVariants() {
    console.log('🔬 TESTING TIMESTAMP VARIANTS\n');
    
    const testId = 'test-' + Date.now();
    
    // Test 1: String ISO directo
    console.log('Test 1: String ISO directo ("2026-03-04T21:45:30.438Z")');
    try {
        await db.execute(sql`
            INSERT INTO chatcore_outbox (message_id, status, payload, sent_at)
            VALUES (${testId + '-1'}, 'pending', '{}', ${'2026-03-04T21:45:30.438Z'})
        `);
        console.log('✅ Test 1 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 1 FAILED:', err.message, '\n');
    }
    
    // Test 2: Date object JavaScript
    console.log('Test 2: Date object (new Date())');
    try {
        await db.execute(sql`
            INSERT INTO chatcore_outbox (message_id, status, payload, sent_at)
            VALUES (${testId + '-2'}, 'pending', '{}', ${new Date()})
        `);
        console.log('✅ Test 2 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 2 FAILED:', err.message, '\n');
    }
    
    // Test 3: SQL NOW()
    console.log('Test 3: SQL NOW()');
    try {
        await db.execute(sql`
            INSERT INTO chatcore_outbox (message_id, status, payload, sent_at)
            VALUES (${testId + '-3'}, 'pending', '{}', NOW())
        `);
        console.log('✅ Test 3 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 3 FAILED:', err.message, '\n');
    }
    
    // Test 4: Drizzle ORM API con Date
    console.log('Test 4: Drizzle ORM API con Date object');
    try {
        await db.insert(chatcoreOutbox).values({
            messageId: testId + '-4',
            status: 'pending',
            payload: '{}',
            sentAt: new Date()
        });
        console.log('✅ Test 4 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 4 FAILED:', err.message, '\n');
    }
    
    // Test 5: Drizzle ORM API con string ISO
    console.log('Test 5: Drizzle ORM API con string ISO');
    try {
        await db.insert(chatcoreOutbox).values({
            messageId: testId + '-5',
            status: 'pending',
            payload: '{}',
            sentAt: '2026-03-04T21:45:30.438Z' as any
        });
        console.log('✅ Test 5 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 5 FAILED:', err.message, '\n');
    }
    
    // Test 6: Update con Date object
    console.log('Test 6: UPDATE con Date object');
    try {
        await db.update(chatcoreOutbox)
            .set({ sentAt: new Date() })
            .where(eq(chatcoreOutbox.messageId, testId + '-1'));
        console.log('✅ Test 6 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 6 FAILED:', err.message, '\n');
    }
    
    // Test 7: Update con string
    console.log('Test 7: UPDATE con string ISO');
    try {
        await db.update(chatcoreOutbox)
            .set({ sentAt: '2026-03-04T21:45:30.438Z' as any })
            .where(eq(chatcoreOutbox.messageId, testId + '-2'));
        console.log('✅ Test 7 PASSED\n');
    } catch (err: any) {
        console.log('❌ Test 7 FAILED:', err.message, '\n');
    }
    
    // Test 8: bigint signalId en messages
    console.log('Test 8: UPDATE messages.signalId con bigint');
    try {
        const testMessageId = '550e8400-e29b-41d4-a716-446655440000'; // UUID de prueba
        await db.update(messages)
            .set({ signalId: 12345 as any })
            .where(eq(messages.id, testMessageId));
        console.log('✅ Test 8 PASSED (o no encontró mensaje)\n');
    } catch (err: any) {
        console.log('❌ Test 8 FAILED:', err.message, '\n');
    }
    
    console.log('🧹 Limpiando registros de prueba...');
    await db.execute(sql`DELETE FROM chatcore_outbox WHERE message_id LIKE ${testId + '%'}`);
    
    console.log('\n✅ Diagnóstico completo');
    process.exit(0);
}

testTimestampVariants().catch(err => {
    console.error('❌ Error general:', err);
    process.exit(1);
});
