
import { db, accounts, conversations, messages, relationships } from '@fluxcore/db';
import { messageCore } from '../apps/api/src/core/message-core';
import { messageDispatchService } from '../apps/api/src/services/message-dispatch.service';
import { eq, desc } from 'drizzle-orm';

// El import de messageDispatchService ya inicializa el listener por efecto secundario en su constructor

async function main() {
    console.log('🚀 Iniciando Test de Flujo de Eventos (MessageCore -> Event -> MessageDispatch -> Runtime -> AI)');

    // 1. Obtener datos de prueba
    const [account] = await db.select().from(accounts).limit(1);
    if (!account) throw new Error('❌ No accounts found in DB');
    console.log(`👤 Cuenta objetivo: ${account.id}`);

    // Buscar una conversación existente
    const [conversation] = await db.select().from(conversations).limit(1);

    if (!conversation) {
        throw new Error('❌ No conversations found. Create one manually first via UI or seed.');
    }

    console.log(`💬 Conversación ID: ${conversation.id}`);

    // 2. Simular Mensaje Entrante
    const [rel] = await db.select().from(relationships).where(eq(relationships.id, conversation.relationshipId));
    if (!rel) throw new Error('❌ Relationship not found');

    // Determinar sender (simulamos que escribe la contraparte)
    const senderId = rel.accountAId === account.id ? rel.accountBId : rel.accountAId;
    const text = `Test de evento ${Date.now()} - Hola IA`;

    console.log(`\n📨 Enviando mensaje simulado de ${senderId}: "${text}"`);

    const result = await messageCore.receive({
        conversationId: conversation.id,
        senderAccountId: senderId,
        content: { text },
        type: 'incoming',
        generatedBy: 'human',
    });

    console.log('✅ MessageCore.receive completado:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Msg ID: ${result.messageId}`);
    console.log('✅ MessageCore.receive completado (Persistencia OK).');
    console.log(`   - Automation Real: ${result.automation?.mode}`);

    // HACK DE PRUEBA: Si sale supervised, forzamos un evento sintético "automatic" 
    // para probar que el Orchestrator funciona si estuviera configurado así.
    if (result.automation?.mode !== 'automatic') {
        console.log('\n⚡ Forzando evento sintético core:message_received con modo AUTOMATIC...');

        const { coreEventBus } = await import('../apps/api/src/core/events');

        // Emitimos evento manual
        coreEventBus.emit('core:message_received', {
            envelope: {
                conversationId: conversation.id,
                senderAccountId: senderId,
                content: { text },
                type: 'incoming',
                generatedBy: 'human',
                targetAccountId: account.id // Necesario
            },
            result: {
                ...result,
                automation: { shouldProcess: true, mode: 'automatic', rule: null, reason: "Forced Test" }
            }
        });
    }

    // 3. Esperar respuesta (Orquestador tiene delay configurado, usualmente 2-5s)
    console.log('\n⏳ Esperando respuesta de IA (8 segundos)...');
    await new Promise(r => setTimeout(r, 8000));

    // 4. Verificar DB
    const replies = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(5);

    // Buscar respuesta IA reciente (creada en los últimos 10s)
    const threshold = new Date(Date.now() - 10000);
    const aiReply = replies.find(m => m.generatedBy === 'ai' && m.createdAt > threshold);

    if (aiReply) {
        console.log('\n🎉 ÉXITO COMPLETO!');
        console.log(`   🤖 Respuesta IA: ${JSON.stringify(aiReply.content)}`);
        console.log(`   🆔 ID: ${aiReply.id}`);
    } else {
        console.error('\n❌ FALLO: No se detectó respuesta de IA.');
        console.log('   Últimos mensajes en DB:', replies.map(m => `\n   - [${m.generatedBy}] ${JSON.stringify(m.content)}`));

        console.log('\nPosibles causas:');
        console.log('1. Orchestrator no escuchó el evento.');
        console.log('2. ExtensionHost falló al generar respuesta (ver logs del server).');
        console.log('3. OpenAI/Groq error.');
    }

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error fatal en test:', err);
    process.exit(1);
});
