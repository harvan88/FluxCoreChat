import { BaseProjector } from '../kernel/base.projector';
import {
    fluxcoreSignals,
} from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { coreEventBus } from '../events';

/**
 * ChatProjector v4.0 - Bidirectional Kernel Bridge
 * 
 * Responsabilidades:
 * 1. INBOUND: Encolar signals de entrada (EXTERNAL_INPUT_OBSERVED) en cognition_queue
 *    para que FluxCore procese y genere respuestas.
 * 2. OUTBOUND: Observar signals AI_RESPONSE_GENERATED del Kernel y entregar
 *    la respuesta via ChatCore (messageCore.receive).
 * 
 * ChatCore es dueño de su mundo:
 * - Persiste mensajes en ChatCore DB
 * - Certifica señales en Kernel
 * - Entrega respuestas AI al usuario via WebSocket
 * 
 * FluxCore es dueño de su mundo:
 * - Genera respuestas AI
 * - Certifica respuestas como señales en Kernel (AI_RESPONSE_GENERATED)
 * - NUNCA escribe directamente en la DB de ChatCore
 * 
 * El Kernel es el puente entre ambos mundos.
 */

export class ChatProjector extends BaseProjector {
    protected projectorName = 'chat';

    // Turn-window para agrupar mensajes del usuario
    private readonly TURN_WINDOW_MS = 3000;

    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // Log ALL signals received for diagnosis
        console.log(`[ChatProjector] 📥 RECEIVED signal #${signal.sequenceNumber} type=${signal.factType}`);
        console.log(`[ChatProjector] 📄 EvidenceRaw keys:`, Object.keys(signal.evidenceRaw || {}));
        
        // Route signal to appropriate handler
        if (signal.factType === 'AI_RESPONSE_GENERATED') {
            await this.handleAiResponse(signal);
            return;
        }

        // Solo procesar mensajes de entrada del usuario
        if (signal.factType !== 'EXTERNAL_INPUT_OBSERVED' && 
            signal.factType !== 'chatcore.message.received') {
            console.log(`[ChatProjector] ⏭️ SKIPPED signal #${signal.sequenceNumber} - type ${signal.factType} not handled`);
            return;
        }

        console.log(`[ChatProjector] ✅ PROCESSING signal #${signal.sequenceNumber}`);

        // Extraer accountId y conversationId del evidence
        const evidence = this.parseEvidence(signal);
        console.log(`[ChatProjector] 📊 Parsed evidence:`, JSON.stringify(evidence.payload, null, 2));
        
        const accountId = evidence.payload.accountId;
        const conversationId = evidence.payload.context?.conversationId;

        if (!accountId) {
            console.warn(`[ChatProjector] ⚠️ Missing accountId in signal #${signal.sequenceNumber}`);
            console.warn(`[ChatProjector] 🔍 Evidence raw:`, JSON.stringify(signal.evidenceRaw, null, 2));
            return;
        }
        
        if (!conversationId) {
            console.warn(`[ChatProjector] ⚠️ Missing conversationId in signal #${signal.sequenceNumber}`);
            return;
        }

        // targetAccountId = quien ENVIÓ el mensaje (a quien el AI debe responder)
        const targetAccountId = evidence.payload.context?.userId || null;
        console.log(`[ChatProjector] 🎯 Ready to enqueue: conv=${conversationId.slice(0, 8)} account=${accountId.slice(0, 8)} target=${targetAccountId?.slice(0, 8) || 'none'}`);

        // Encolar en cognition_queue para FluxCore
        try {
            await this.enqueueForCognition(conversationId, accountId, targetAccountId, Number(signal.sequenceNumber), tx);
            console.log(`[ChatProjector] ✅ ENQUEUED signal #${signal.sequenceNumber} successfully`);
        } catch (err: any) {
            console.error(`[ChatProjector] ❌ FAILED to enqueue signal #${signal.sequenceNumber}:`, err.message);
            throw err;
        }
    }

    /**
     * Handle AI_RESPONSE_GENERATED signal.
     * FluxCore certified a response in the Kernel.
     * ChatCore's job: deliver the message to the user.
     * 
     * Uses setImmediate to defer messageCore.receive() AFTER the Kernel
     * transaction commits, ensuring data consistency.
     */
    private async handleAiResponse(signal: typeof fluxcoreSignals.$inferSelect): Promise<void> {
        const evidence: any = signal.evidenceRaw;

        const conversationId = evidence?.context?.conversationId;
        const accountId = evidence?.accountId;           // who responds (the business/assistant)
        const targetAccountId = evidence?.targetAccountId; // who receives (the user)
        const content = evidence?.content;

        if (!conversationId || !accountId || !content) {
            console.warn(`[ChatProjector] ⚠️ AI_RESPONSE_GENERATED signal #${signal.sequenceNumber} missing required fields`);
            return;
        }

        console.log(`[ChatProjector] 🤖 AI_RESPONSE_GENERATED signal #${signal.sequenceNumber}:`);
        console.log(`  - conv=${conversationId.slice(0, 8)} from=${accountId.slice(0, 8)} to=${targetAccountId?.slice(0, 8) || 'unknown'}`);
        console.log(`  - content: "${(content.text || '').substring(0, 80)}..."`);

        // Defer delivery to AFTER the Kernel transaction commits.
        // messageCore.receive() handles: persist + WebSocket broadcast + conversation update
        setImmediate(async () => {
            try {
                const { messageCore } = await import('../message-core');
                const result = await messageCore.receive({
                    conversationId,
                    senderAccountId: accountId,
                    targetAccountId,
                    content,
                    type: 'outgoing',
                    generatedBy: 'ai',
                });
                console.log(`[ChatProjector] ✅ AI response delivered via ChatCore: msgId=${result.messageId?.slice(0, 8)} success=${result.success}`);
            } catch (err: any) {
                console.error(`[ChatProjector] ❌ Failed to deliver AI response:`, err.message);
            }
        });
    }

    /**
     * Encolar en cognition_queue para procesamiento de FluxCore
     */
    private async enqueueForCognition(
        conversationId: string, 
        accountId: string, 
        targetAccountId: string | null,
        signalSequence: number, 
        tx: any
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + this.TURN_WINDOW_MS);

        await tx.execute(sql`
            INSERT INTO fluxcore_cognition_queue (
                conversation_id, 
                account_id, 
                target_account_id,
                last_signal_seq, 
                turn_started_at, 
                turn_window_expires_at
            )
            VALUES
                (${conversationId}, ${accountId}, ${targetAccountId}, ${signalSequence}, NOW(), ${expiresAt})
            ON CONFLICT (conversation_id) WHERE fluxcore_cognition_queue.processed_at IS NULL
            DO UPDATE SET
                last_signal_seq = EXCLUDED.last_signal_seq,
                turn_window_expires_at = EXCLUDED.turn_window_expires_at,
                target_account_id = EXCLUDED.target_account_id,
                attempts = 0,
                last_error = NULL,
                processed_at = NULL
        `);

        // Despertar CognitionWorker inmediatamente
        setImmediate(() => {
            coreEventBus.emit('kernel:cognition:wakeup', {
                conversationId,
                accountId,
            });
        });
    }

    private parseEvidence(signal: typeof fluxcoreSignals.$inferSelect) {
        const evidenceRoot: any = signal.evidenceRaw;
        
        return {
            payload: {
                // Regular gateway uses accountId; webchat gateway uses tenantId
                accountId: evidenceRoot?.accountId || evidenceRoot?.tenantId,
                context: evidenceRoot?.context, // context.userId = sender account
            },
        };
    }
}

export const chatProjector = new ChatProjector();
