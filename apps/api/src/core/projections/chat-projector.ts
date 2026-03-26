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

    constructor() {
        super();
        this.setupTranscriptionListener();
    }

    private setupTranscriptionListener() {
        // 🎯 Escuchar transcripciones completadas para actualizar mensajes
        coreEventBus.on('asset:transcription_completed', async (payload) => {
            console.log(`[ChatProjector] 🔔 RECEIVED asset:transcription_completed for asset ${payload.assetId}`);
            await this.handleTranscriptionCompleted(payload);
        });
    }

    private async handleTranscriptionCompleted(payload: {
        assetId: string;
        accountId: string;
        transcription: string;
        language?: string;
        model: string;
        processedAt: Date;
    }) {
        try {
            // Buscar mensajes vinculados a este asset
            const { db, messageAssets, messages } = await import('@fluxcore/db');
            const { eq } = await import('drizzle-orm');

            const linkedMessages = await db
                .select({
                    messageId: messages.id,
                    conversationId: messages.conversationId,
                    content: messages.content,
                    senderAccountId: messages.senderAccountId,
                })
                .from(messageAssets)
                .innerJoin(messages, eq(messageAssets.messageId, messages.id))
                .where(eq(messageAssets.assetId, payload.assetId));

            console.log(`[ChatProjector] 📝 Found ${linkedMessages.length} messages linked to asset ${payload.assetId}`);

            for (const link of linkedMessages) {
                // Actualizar el contenido del mensaje con la transcripción
                const oldContent = link.content as any;
                const updatedContent = {
                    ...oldContent,
                    text: payload.transcription,
                    __fluxcore: {
                        ...(oldContent?.__fluxcore || {}),
                        transcribed: true,
                        transcribedAt: payload.processedAt,
                        transcriptionModel: payload.model,
                        transcriptionLanguage: payload.language,
                    },
                };

                console.log(`[ChatProjector] 📝 UPDATING message ${link.messageId} with transcription`);

                await db
                    .update(messages)
                    .set({ 
                        content: updatedContent,
                    })
                    .where(eq(messages.id, link.messageId));

                // 🎯 EMITIR EVENTO DE MENSAJE ACTUALIZADO
                coreEventBus.emit('core:message_updated', {
                    messageId: link.messageId,
                    conversationId: link.conversationId,
                    accountId: payload.accountId,
                    senderAccountId: link.senderAccountId,
                    oldContent,
                    newContent: updatedContent,
                    transcription: payload.transcription,
                });

                console.log(`[ChatProjector] ✅ Message ${link.messageId} updated with transcription`);
                
                // 🎯 AHORA SÍ - ENCOLAR PARA IA CON LA TRANSCRIPCIÓN LISTA
                console.log(`[ChatProjector] 🎵 TRANSCRIPTION READY - ENQUEUING for AI response (conv=${link.conversationId.slice(0, 8)})`);
                
                // 🎯 IMPORTANTE: Usar targetAccountId (receptor) no senderAccountId (emisor)
                // El emisor (senderAccountId) está en mode=off, el receptor (targetAccountId) está en mode=auto
                const targetAccountId = await this.getTargetAccountIdForConversation(link.conversationId, payload.accountId);
                
                // Crear una señal simulada para encolar
                await this.enqueueTranscriptionForCognition(
                    link.conversationId,
                    targetAccountId, // 🎯 USAR RECEPTOR, NO EMISOR
                    payload.accountId, // 🎯 EMISOR como target
                    link.messageId
                );
            }
        } catch (error) {
            console.error(`[ChatProjector] ❌ Error handling transcription for asset ${payload.assetId}:`, error);
        }
    }

    private async getTargetAccountIdForConversation(conversationId: string, currentAccountId: string): Promise<string> {
        try {
            const { db, conversationParticipants } = await import('@fluxcore/db');
            const { eq } = await import('drizzle-orm');

            // Buscar el otro participante de la conversación (no el actual)
            const participants = await db
                .select()
                .from(conversationParticipants)
                .where(eq(conversationParticipants.conversationId, conversationId));

            const otherParticipant = participants.find(p => p.accountId !== currentAccountId);
            
            if (!otherParticipant) {
                console.warn(`[ChatProjector] ⚠️ No other participant found for conversation ${conversationId}, using current account`);
                return currentAccountId;
            }

            console.log(`[ChatProjector] 🎯 Found target account: ${otherParticipant.accountId} (current: ${currentAccountId})`);
            return otherParticipant.accountId;
        } catch (error) {
            console.error(`[ChatProjector] ❌ Error finding target account for conversation ${conversationId}:`, error);
            return currentAccountId; // fallback
        }
    }

    private async enqueueTranscriptionForCognition(
        conversationId: string, 
        accountId: string, 
        senderAccountId: string,
        messageId: string
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + this.TURN_WINDOW_MS);
        const { db } = await import('@fluxcore/db');
        const { sql } = await import('drizzle-orm');

        // Insertar en cognition_queue para que FluxCore procese la transcripción
        await db.transaction(async (tx: any) => {
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
                    (${conversationId}, ${accountId}, ${senderAccountId}, 0, NOW(), ${expiresAt})
                ON CONFLICT (conversation_id) WHERE fluxcore_cognition_queue.processed_at IS NULL
                DO UPDATE SET
                    last_signal_seq = EXCLUDED.last_signal_seq,
                    turn_window_expires_at = EXCLUDED.turn_window_expires_at,
                    target_account_id = EXCLUDED.target_account_id,
                    attempts = 0,
                    last_error = NULL,
                    processed_at = NULL
            `);

            console.log(`[ChatProjector] ✅ ENQUEUED transcription for AI response (messageId=${messageId.slice(0, 8)})`);
            
            // Despertar al CognitionWorker
            coreEventBus.emit('kernel:cognition:wakeup', {
                conversationId,
                accountId,
            });
        });
    }

    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // Log ALL signals received for diagnosis
        console.log(`[ChatProjector] 📥 RECEIVED signal #${signal.sequenceNumber} type=${signal.factType}`);
        console.log(`[ChatProjector] 📄 EvidenceRaw keys:`, Object.keys(signal.evidenceRaw || {}));
        
        // Route signal to appropriate handler
        if (signal.factType === 'AI_RESPONSE_GENERATED') {
            await this.handleAiResponse(signal);
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // NUEVO: Manejar cambios de estado de ChatCore (EXTERNAL_STATE_OBSERVED)
        // ═══════════════════════════════════════════════════════════════
        if (signal.factType === 'EXTERNAL_STATE_OBSERVED') {
            await this.projectStateChange(signal);
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
        
        // 🎯 VERIFICAR SI ES AUDIO PENDIENTE DE TRANSCRIPCIÓN
        if (evidence.payload.isPendingAudioTranscription) {
            console.log(`[ChatProjector] 🎵 AUDIO PENDING TRANSCRIPTION - NOT enqueuing for AI response yet`);
            console.log(`[ChatProjector] 🎵 Waiting for asset:transcription_completed events for assets:`, evidence.payload.audioAssets.map((a: any) => a.assetId));
            
            // 🎯 NO encolar para IA - esperar transcripción
            // El handler handleTranscriptionCompleted se encargará de encolar cuando la transcripción esté lista
            return;
        }
        
        console.log(`[ChatProjector] 🎯 Ready to enqueue: conv=${conversationId.slice(0, 8)} account=${accountId.slice(0, 8)} target=${targetAccountId?.slice(0, 8) || 'none'}`);

        // Encolar en cognition_queue para FluxCore
        try {
            await this.enqueueForCognition(conversationId, accountId, targetAccountId, Number(signal.sequenceNumber), tx);
            console.log(`[ChatProjector] ✅ ENQUEUED signal #${signal.sequenceNumber} successfully`);

            // 🎯 TELEMETRÍA (Fase 1): Proyección Encolada
            try {
                coreEventBus.emit('telemetry:pipeline_step', {
                    messageId: String(signal.sequenceNumber),
                    conversationId,
                    accountId,
                    step: 'proyeccion',
                    status: 'success',
                    timestamp: new Date().toISOString()
                });
            } catch (e) {}
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
        const triggerSignalId = evidence?.context?.triggerSignalId; // ✅ Correlación de trazabilidad

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
                // 🔥 CRITICAL: Resolve the actor for the responding account so messages have proper sender identity
                const { resolveActorId } = await import('../../utils/actor-resolver');
                const fromActorId = await resolveActorId(accountId);
                
                console.log(`[ChatProjector] 🎭 Resolved actor for AI response: accountId=${accountId.slice(0, 8)} -> actorId=${fromActorId?.slice(0, 8) || 'null'}`);

                const { messageCore } = await import('../message-core');
                const result = await messageCore.receive({
                    conversationId,
                    senderAccountId: accountId,
                    fromActorId: fromActorId || undefined,
                    targetAccountId,
                    content,
                    type: 'outgoing',
                    generatedBy: 'ai',
                    triggerSignalId, // ✅ Pasar ID original para telemetría
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
        
        // 🎯 DETECTAR SI ES AUDIO PENDIENTE DE TRANSCRIPCIÓN
        const content = evidenceRoot?.content || {};
        const hasAudio = content?.media?.some((m: any) => m.type === 'audio');
        const hasEmptyText = !content?.text || content?.text === '';
        
        const isPendingAudioTranscription = hasAudio && hasEmptyText;
        
        if (isPendingAudioTranscription) {
            console.log(`[ChatProjector] 🎵 DETECTED PENDING AUDIO TRANSCRIPTION (signal #${signal.sequenceNumber})`);
            console.log(`[ChatProjector] 🎵 Audio assets:`, content.media.filter((m: any) => m.type === 'audio').map((a: any) => ({ assetId: a.assetId, name: a.name })));
        }
        
        return {
            payload: {
                // Regular gateway uses accountId; webchat gateway uses tenantId
                accountId: evidenceRoot?.accountId || evidenceRoot?.tenantId,
                context: evidenceRoot?.context, // context.userId = sender account
                // 🎯 NUEVO: Marcar si es audio pendiente de transcripción
                isPendingAudioTranscription,
                audioAssets: isPendingAudioTranscription ? content.media.filter((m: any) => m.type === 'audio') : [],
            },
        };
    }

    /**
     * Maneja señales de mutación de estado de ChatCore
     * 
     * Ontológicamente: Observa declaraciones de mutación estructural
     * y opcionalmente actualiza metadatos derivados
     */
    private async projectStateChange(signal: typeof fluxcoreSignals.$inferSelect): Promise<void> {
        const evidence = signal.evidenceRaw as any;
        
        // ✅ NUEVO: Manejar mutaciones estructurales
        if (evidence.stateChange) {
            return this.handleStructuralMutation(evidence);
        }
        
        // Lógica existente para otros cambios de estado (typing, recording, idle)
        console.log(`[ChatProjector] State change processed: ${Object.keys(evidence)}`);
    }

    private async handleStructuralMutation(evidence: any): Promise<void> {
        switch (evidence.stateChange) {
            case 'message_content_overwritten':
                console.log(`[ChatProjector] Message ${evidence.messageId} overwritten by ${evidence.overwrittenBy}`);
                // Actualizar cachés, metadatos si es necesario
                break;
                
            case 'message_content_edited':
                console.log(`[ChatProjector] Message ${evidence.messageId} edited`);
                // Lógica para versionamiento futuro
                break;
                
            case 'conversation_destroyed':
                console.log(`[ChatProjector] Conversation ${evidence.conversationId} destroyed`);
                // Opcional: limpiar estructuras derivadas
                break;
                
            default:
                console.log(`[ChatProjector] Unknown state mutation: ${evidence.stateChange}`);
        }
    }
}

export const chatProjector = new ChatProjector();
