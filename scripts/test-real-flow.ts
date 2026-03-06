/**
 * Prueba REAL del flujo de mensajes - Simula exactamente lo que pasa en producción
 * Usuario: carlos@test.com / 123456
 */

import { db, messages, chatcoreOutbox, eq, sql } from '@fluxcore/db';
import { randomUUID } from 'crypto';

async function testRealMessageFlow() {
    console.log(' PRUEBA REAL DE FLUJO DE MENSAJES\n');
    
    const testMessageId = randomUUID();
    const accountId = '805cfa36-1cff-48fe-a293-34b72820dd6f'; // Carlos
    const conversationId = '9d35128a-d35c-4d2f-816f-5b97d378c7a6';
    
    console.log('Step 1: Crear mensaje en tabla messages');
    try {
        await db.insert(messages).values({
            id: testMessageId,
            conversationId: conversationId,
            senderAccountId: accountId,
            content: { text: 'test' },
            type: 'outgoing',
            eventType: 'message',
            generatedBy: 'human',
            status: 'synced',
            version: 1,
            isCurrent: true,
            createdAt: new Date(), // Esto es lo que usamos actualmente
            targetAccountId: 'b7ad9719-ba4e-4553-9b60-410791e106d9'
        });
        console.log('✅ Step 1 PASSED: Mensaje creado\n');
    } catch (err: any) {
        console.log('❌ Step 1 FAILED:', err.message, '\n');
        return;
    }
    
    console.log('Step 2: Crear entrada en chatcore_outbox');
    try {
        const outboxPayload = {
            messageId: testMessageId,
            accountId: accountId,
            userId: accountId,
            content: { text: 'test' },
            meta: {
                ip: '127.0.0.1',
                userAgent: 'test',
                clientTimestamp: new Date().toISOString(),
                conversationId: conversationId,
                requestId: 'test-req',
                messageId: testMessageId
            }
        };
        
        await db.insert(chatcoreOutbox).values({
            messageId: testMessageId,
            status: 'pending',
            payload: JSON.stringify(outboxPayload),
            createdAt: new Date(),
            attempts: 0
        });
        console.log('✅ Step 2 PASSED: Outbox entry creado\n');
    } catch (err: any) {
        console.log('❌ Step 2 FAILED:', err.message, '\n');
        // Cleanup
        await db.delete(messages).where(eq(messages.id, testMessageId));
        return;
    }
    
    console.log('Step 3: Leer y procesar outbox entry');
    try {
        const outboxEntry = await db.query.chatcoreOutbox.findFirst({
            where: eq(chatcoreOutbox.messageId, testMessageId)
        });
        
        console.log('📊 Outbox entry leído:');
        console.log('  id:', outboxEntry?.id, '(type:', typeof outboxEntry?.id + ')');
        console.log('  messageId:', outboxEntry?.messageId, '(type:', typeof outboxEntry?.messageId + ')');
        console.log('  createdAt:', outboxEntry?.createdAt, '(type:', typeof outboxEntry?.createdAt + ')');
        console.log('  sentAt:', outboxEntry?.sentAt, '(type:', typeof outboxEntry?.sentAt + ')');
        console.log('  attempts:', outboxEntry?.attempts, '(type:', typeof outboxEntry?.attempts + ')');
        
        // Verificar si hay problema con Date objects
        if (outboxEntry?.createdAt) {
            console.log('  createdAt.toUTCString():', (outboxEntry.createdAt as any).toUTCString?.() || 'NO ES DATE');
        }
        console.log('✅ Step 3 PASSED: Lectura correcta\n');
    } catch (err: any) {
        console.log('❌ Step 3 FAILED:', err.message, '\n');
    }
    
    console.log('Step 4: UPDATE outbox con sentAt = new Date()');
    try {
        await db.update(chatcoreOutbox)
            .set({ 
                status: 'sent',
                sentAt: new Date()
            })
            .where(eq(chatcoreOutbox.messageId, testMessageId));
        console.log('✅ Step 4 PASSED: UPDATE con Date object\n');
    } catch (err: any) {
        console.log('❌ Step 4 FAILED:', err.message, '\n');
        console.log('Stack:', err.stack, '\n');
    }
    
    console.log('Step 5: UPDATE messages con signalId (bigint)');
    try {
        await db.update(messages)
            .set({ signalId: 12345 as any }) // Simular signalId
            .where(eq(messages.id, testMessageId));
        console.log('✅ Step 5 PASSED: UPDATE messages.signalId\n');
    } catch (err: any) {
        console.log('❌ Step 5 FAILED:', err.message, '\n');
    }
    
    console.log('Step 6: UPDATE outbox con string ISO (para probar el error exacto)');
    try {
        await db.update(chatcoreOutbox)
            .set({ sentAt: '2026-03-04T22:00:00.000Z' as any })
            .where(eq(chatcoreOutbox.messageId, testMessageId));
        console.log('✅ Step 6 PASSED: UPDATE con string ISO\n');
    } catch (err: any) {
        console.log('❌ Step 6 FAILED:', err.message, '\n');
    }
    
    // Cleanup
    console.log('🧹 Limpiando...');
    await db.delete(chatcoreOutbox).where(eq(chatcoreOutbox.messageId, testMessageId));
    await db.delete(messages).where(eq(messages.id, testMessageId));
    
    console.log('\n✅ Prueba completa');
    process.exit(0);
}

testRealMessageFlow().catch(err => {
    console.error('❌ Error general:', err);
    process.exit(1);
});
