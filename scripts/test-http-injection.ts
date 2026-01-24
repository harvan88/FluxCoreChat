
import { db, conversations, relationships, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function main() {
    console.log('🚀 Iniciando Test de Inyección HTTP Real...');

    // 1. Datos
    const [conversation] = await db.select().from(conversations).limit(1);
    if (!conversation) throw new Error('No conversations found');

    const [rel] = await db.select().from(relationships).where(eq(relationships.id, conversation.relationshipId));

    // Usar la cuenta opuesta a la cuenta 'A' como emisor simulado (o simplemente A si es sandbox)
    const senderId = rel?.accountBId || 'fake-sender-id';

    const text = `Hola IA, prueba de inyección HTTP ${Date.now()}`;
    const payload = {
        conversationId: conversation.id,
        senderAccountId: senderId,
        text
    };

    // 2. HTTP Call
    console.log(`📡 Enviando mensaje a http://localhost:3000/test/inject...`);
    console.log(`   - Conversation: ${conversation.id}`);
    console.log(`   - Text: "${text}"`);

    try {
        const resp = await fetch('http://localhost:3000/test/inject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error('❌ Error HTTP:', resp.status, data);
            process.exit(1);
        }

        console.log('✅ Mensaje aceptado por el servidor:', data);

        // 3. Verificación
        console.log('⏳ Esperando 10 segundos para ver si la IA responde...');
        await new Promise(r => setTimeout(r, 10000));

        const lastMessages = await db.select()
            .from(messages)
            .where(eq(messages.conversationId, conversation.id))
            .orderBy(desc(messages.createdAt))
            .limit(5);

        const aiReply = lastMessages.find(m => m.generatedBy === 'ai' && new Date(m.createdAt) > new Date(Date.now() - 15000));

        if (aiReply) {
            console.log('\n🎉 ¡ÉXITO! La IA respondió:');
            console.log(`   🤖 [AI]: ${JSON.stringify(aiReply.content)}`);
        } else {
            console.error('\n⚠️ La IA NO respondió (o tardó demasiado).');
            console.log('   Últimos mensajes:', lastMessages.map(m => `[${m.generatedBy}] ${JSON.stringify(m.content)}`));
        }

    } catch (e) {
        console.error('❌ Fallo de conexión:', e);
    }
    process.exit(0);
}

main().catch(console.error);
