import { wesInterpreter } from './interpreter';

// DI-based symbols (injected by host)
let db: any;
let fluxcoreWorks: any;
let eq: any;
let and: any;
let desc: any;
let notInArray: any;
let workEngineService: any;
let messageCore: any;

const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'];

export class FluxiExtension {
    public readonly id = '@fluxcore/fluxi';

    /**
     * Injects core API services into the extension.
     * This avoids brittle relative imports to the core API folders.
     */
    setServices(services: {
        db: any;
        schema: any;
        operators: any;
        workEngineService: any;
        messageCore: any;
        interpreterServices: any;
    }) {
        db = services.db;
        fluxcoreWorks = services.schema.fluxcoreWorks;
        eq = services.operators.eq;
        and = services.operators.and;
        desc = services.operators.desc;
        notInArray = services.operators.notInArray;
        workEngineService = services.workEngineService;
        messageCore = services.messageCore;

        // Pass injected services to child components
        wesInterpreter.setServices(services.interpreterServices);
    }

    async onMessage(params: any): Promise<any> {
        const { accountId, conversationId, relationshipId, message, policyContext, automationMode, activeRuntimeId } = params;
        const messageText = typeof message.content?.text === 'string' ? message.content.text : '';

        // Canon v7.0: Section 4 - Runtime Sovereignty
        // We only act if we are the designated runtime.
        if (activeRuntimeId && activeRuntimeId !== this.id) {
            return { handled: false, stopPropagation: false };
        }

        const activeWork = await this.getActiveWork(accountId, relationshipId, conversationId);

        // 1. WES-155: Phase 0 - Deterministic Semantic Confirmation
        const semanticMatch = await workEngineService.resolveSemanticMatch(
            accountId,
            conversationId,
            messageText
        );

        if (semanticMatch) {
            console.log(`[FluxiExtension] ✅ Semantic Commitment detected for context ${semanticMatch.id}`);
            await workEngineService.commitSemanticConfirmation(
                semanticMatch.id,
                message.id
            );

            return {
                handled: true,
                stopPropagation: true,
                actions: [{ type: 'wes:semantic_commit', contextId: semanticMatch.id }]
            };
        }

        // 2. WES Phase 1: Resumption
        if (activeWork) {
            console.log(`[FluxiExtension] 🚦 Resuming Work ${activeWork.id} for conversation ${conversationId}`);

            const success = await workEngineService.ingestMessage(activeWork.id, messageText, {
                id: message.id,
                conversationId,
                senderAccountId: message.senderAccountId,
                recipientAccountId: accountId,
                content: message.content,
                type: message.type,
                createdAt: new Date(),
            });

            if (success) {
                return {
                    handled: true,
                    stopPropagation: true,
                    actions: [{ type: 'wes:resume_work', workId: activeWork.id }]
                };
            }
        }

        // 3. WES Phase 2: Interpretation (for new Work)
        if (automationMode !== 'disabled') {
            const proposedAnalysis = await wesInterpreter.interpret(
                accountId,
                conversationId,
                messageText
            );

            if (proposedAnalysis) {
                console.log(`[FluxiExtension] 🧠 Intent Detected: ${proposedAnalysis.intent}`);

                const proposed = await workEngineService.proposeWork({
                    accountId,
                    conversationId,
                    traceId: message.id || `intent-${Date.now()}`,
                    workDefinitionId: proposedAnalysis.workDefinitionId,
                    intent: proposedAnalysis.intent,
                    candidateSlots: proposedAnalysis.candidateSlots,
                    confidence: proposedAnalysis.confidence,
                    modelInfo: { model: 'llama-3.1-8b-instant', provider: 'groq' }
                });

                if (automationMode === 'automatic') {
                    await workEngineService.openWork(accountId, proposed.id);
                    const ack = this.buildAckMessage(proposedAnalysis.intent, policyContext);

                    await messageCore.send({
                        conversationId,
                        senderAccountId: accountId,
                        content: { text: ack },
                        type: 'outgoing',
                        generatedBy: 'system',
                        targetAccountId: message.senderAccountId,
                    });

                    return {
                        handled: true,
                        stopPropagation: true,
                        actions: [{ type: 'wes:open_work', workId: proposed.id }]
                    };
                }

                // Supervised mode: Fallback to chat so AI can ask "Shall I start X?"
                return { handled: false, stopPropagation: false };
            }
        }

        // 4. Canon v7.0 Compliance - Terminal Runtime
        // If we are the active runtime and reached here, we MUST handle the message to avoid 
        // falling back to the conversational AI (Asistentes).
        return {
            handled: true,
            stopPropagation: true,
            actions: [{ type: 'wes:not_understood' }],
            // The AIOrchestrator or MessageCore will see this 'handled' and stop.
            // We could send a "No entiendo esa operación" message here if desired.
        };
    }

    private async getActiveWork(accountId: string, relationshipId: string, conversationId: string) {
        if (!db) return null;
        return await db.query.fluxcoreWorks.findFirst({
            where: and(
                eq(fluxcoreWorks.accountId, accountId),
                eq(fluxcoreWorks.relationshipId, relationshipId),
                eq(fluxcoreWorks.conversationId, conversationId),
                notInArray(fluxcoreWorks.state, TERMINAL_STATES)
            ),
            orderBy: [desc(fluxcoreWorks.updatedAt)]
        });
    }

    private buildAckMessage(intent: string, policy: any): string {
        const { tone, formality, useEmojis } = policy.attention;
        const emoji = useEmojis ? ' ⚙️' : '';

        if (tone === 'formal') {
            return `Entendido. Procederé con la solicitud de ${intent}.${emoji}`;
        }
        if (formality === 'tú' || formality === 'vos') {
            return `¡Dale! Ahí arranco con lo de ${intent}.${emoji}`;
        }
        return `Entendido. Iniciando: ${intent}.${emoji}`;
    }
}

export const fluxiExtension = new FluxiExtension();
export const getFluxCore = () => fluxiExtension;
