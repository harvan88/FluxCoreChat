/**
 * FluxCore Deterministic Conversation Cleaner
 * 
 * Usage: 
 *   bun run scripts/clear-conversation.ts <CONVERSATION_ID>
 */

import { 
    db, 
    aiTraces, 
    messages, 
    aiSuggestions, 
    fluxcoreCognitionQueue, 
    aiSignals, 
    fluxcoreActionAudit, 
    fluxcoreOutbox, 
    chatcoreOutbox,
    conversationParticipants
} from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const conversationId = process.argv[2];

if (!conversationId) {
    console.error('❌ Error: Debes proporcionar un conversationId');
    process.exit(1);
}

async function main() {
    console.log(`\n🧹 INICIANDO LIMPIEZA DETERMINISTA: ${conversationId}`);
    console.log(`--------------------------------------------------`);

    try {
        // 1. Mensajes
        await db.delete(messages).where(eq(messages.conversationId, conversationId));
        console.log(`  ✅ [messages] eliminados`);

        // 2. Participantes
        await db.delete(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
        console.log(`  ✅ [conversation_participants] eliminados`);

        // 3. Trazas y Señales
        await db.delete(aiTraces).where(eq(aiTraces.conversationId, conversationId));
        await db.delete(aiSignals).where(eq(aiSignals.conversationId, conversationId));
        console.log(`  ✅ [ai_traces/ai_signals] eliminados`);

        // 4. Sugerencias y Acción Audit
        await db.delete(aiSuggestions).where(eq(aiSuggestions.conversationId, conversationId));
        await db.delete(fluxcoreActionAudit).where(eq(fluxcoreActionAudit.conversationId, conversationId));
        console.log(`  ✅ [ai_suggestions/fluxcore_action_audit] eliminados`);

        // 5. Outboxes
        await db.delete(fluxcoreOutbox).where(eq(fluxcoreOutbox.conversationId, conversationId));
        await db.delete(chatcoreOutbox).where(eq(chatcoreOutbox.conversationId, conversationId));
        console.log(`  ✅ [fluxcore_outbox/chatcore_outbox] limpiados`);

        // 6. Cola de Cognición
        await db.delete(fluxcoreCognitionQueue).where(eq(fluxcoreCognitionQueue.conversationId, conversationId));
        console.log(`  ✅ [fluxcore_cognition_queue] purgada`);

        console.log(`\n✨ Conversación ${conversationId} limpiada por completo.`);
    } catch (err: any) {
        console.error(`\n❌ Error FATAL durante la limpieza:`, err.message);
        process.exit(1);
    }
}

main().catch(console.error);
