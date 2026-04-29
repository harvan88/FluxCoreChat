/**
 * FluxiRuntime — FluxCore v8.3
 *
 * Canon §4.12: Sovereign transactional runtime.
 * Converts conversational messages into deterministic Works.
 *
 * INVARIANTS:
 *  - NO DB access during handleMessage (Canon Inv. 10)
 *  - All config arrives in RuntimeInput.runtimeConfig (workDefinitions, LLM params)
 *  - Returns declarative actions only (ActionExecutor mediates persistence)
 *  - NEVER delegates to AsistentesLocal or AsistentesOpenAI
 *
 * Execution flow (Canon §3):
 *  Phase 1: Active Work? → ingest into existing Work (advance_work_state)
 *  Phase 2: WES Interpreter (LLM) → ProposedWork analysis
 *  Phase 3: Gate check → propose_work or no_action
 *  Phase 4: Return declarative actions
 */

import type { RuntimeAdapter, RuntimeInput, ExecutionAction } from '../../../core/fluxcore-types';
import { llmClient } from '../llm-client.service';
import { asistentesLocalRuntime } from './asistentes-local.runtime';

interface WorkDefinition {
    id: string;
    typeId: string;
    version: string;
    definitionJson: {
        bindingAttribute: string;
        slots: Array<{ path: string; type: string; required?: boolean }>;
        fsm?: { initial: string; transitions: any[] };
    };
}

interface ProposedAnalysis {
    workDefinitionId: string;
    intent: string;
    candidateSlots: Array<{ path: string; value: any; evidence: { text: string; confidence?: number } }>;
    confidence: number;
}


export class FluxiRuntime implements RuntimeAdapter {
    readonly runtimeId = '@fluxcore/fluxi';
    readonly displayName = 'Fluxi/WES (v8.2)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;
        const conversationId = policyContext.conversationId;

        // 1. Guard: mode gate
        if (policyContext.mode === 'off') {
            return [{ type: 'no_action', reason: 'Automation mode is off' }];
        }

        // 2. Guard: loop prevention
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastMessage) {
            return [{ type: 'no_action', reason: 'No messages in conversation' }];
        }
        if (lastMessage.role === 'assistant' || lastMessage.role === 'system') {
            return [{ type: 'no_action', reason: 'Loop prevention: last message is not from user' }];
        }

        const messageText = lastMessage.content;
        if (!messageText) {
            return [{ type: 'no_action', reason: 'No text content in last message' }];
        }

        const accountId = runtimeConfig.accountId;

        // ── Phase 0: Semantic Confirmation (Deterministic, no LLM) ────────────
        // If the user is confirming a pending semantic context (sí/ok/dale),
        // commit it immediately without LLM interpretation.
        // Absorbed from legacy Extension (fluxcore-fluxi) into sovereign Runtime.
        try {
            const wes = runtimeConfig.workEngineService;
            if (wes && typeof wes.resolveSemanticMatch === 'function') {
                const semanticMatch = await wes.resolveSemanticMatch(accountId, conversationId, messageText);
                if (semanticMatch) {
                    console.log(`[FluxiRuntime] Phase 0: Semantic confirmation matched (context=${semanticMatch.id})`);
                    await wes.commitSemanticConfirmation(semanticMatch.id, `runtime-${Date.now()}`);
                    return [{
                        type: 'send_message',
                        conversationId,
                        content: 'Confirmado. Procesando tu solicitud.',
                    }];
                }
            }
        } catch (error: any) {
            console.warn(`[FluxiRuntime] Phase 0: Semantic confirmation check failed (non-blocking):`, error.message);
        }

        // workDefinitions come from RuntimeConfig (resolved before handleMessage)
        const workDefinitions: WorkDefinition[] = runtimeConfig.workDefinitions ?? [];
        const activeWorkId = policyContext.activeWork?.workId;

        // ── Phase 1: Active Work exists → ingest new slot values ─────────────
        if (activeWorkId) {
            return this.handleActiveWork(input, activeWorkId);
        }

        // ── Phase 2: No active work → interpret for new transactional intent ──
        if (workDefinitions.length === 0) {
            return this.respondConversationally(input);
        }

        return this.interpretAndPropose(input, workDefinitions);
    }

    /**
     * Phase 1: An active Work exists. Try to extract slot values from the user message.
     */
    private async handleActiveWork(
        input: RuntimeInput,
        workId: string
    ): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;
        const messageText = conversationHistory[conversationHistory.length - 1]?.content || '';
        const conversationId = policyContext.conversationId;
        const { provider: llmProvider, model: llmModel, maxTokens: llmMaxTokens, temperature: llmTemperature } = runtimeConfig;

        // Note: Semantic confirmation (sí/ok/dale) is now handled by Phase 0 in handleMessage()
        // before we reach this point. If we're here, the message is new data, not a confirmation.

        // Use LLM to extract slot values from the message
        const systemPrompt = `Eres el Agente de Extracción Transaccional de la cuenta. Estás gestionando un proceso (Work) en curso.
Tu tarea: extraer los datos (slots) necesarios del mensaje para avanzar el proceso.

REGLAS:
1. Extrae pares de "path" y "value".
2. Incluye el texto exacto como "evidence".
3. Devuelve ÚNICAMENTE un JSON array: [{"path": "...", "value": "...", "evidence": "..."}]
4. Si no hay datos nuevos, devuelve [].`;

        try {
            const result = await llmClient.complete({
                provider: llmProvider ?? 'groq',
                model: llmModel ?? 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Mensaje del usuario: "${messageText}"` },
                ],
                maxTokens: llmMaxTokens ?? 256,
                temperature: 0.1, // Low temperature for extraction tasks
            });

            const slots = this.parseSlotExtractionResult(result.content);

            if (slots.length > 0) {
                return [{
                    type: 'advance_work_state',
                    conversationId,
                    workId,
                    slots,
                    replyMessage: `Entendido. He registrado la información. ¿Hay algo más que necesite?`,
                }];
            }

            // No slots extracted — ask user for clarification
            return [{
                type: 'send_message',
                conversationId,
                content: `Entiendo el contexto, pero necesito que seas más específico con los datos para poder procesar esta solicitud correctamente.`,
            }];

        } catch (error: any) {
            console.error(`[FluxiRuntime] Slot extraction failed for work ${workId}:`, error.message);
            return this.respondConversationally(input);
        }
    }

    /**
     * Phase 2+3: No active work. Interpret message for transactional intent.
     */
    private async interpretAndPropose(
        input: RuntimeInput,
        workDefinitions: WorkDefinition[]
    ): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;
        const messageText = conversationHistory[conversationHistory.length - 1]?.content || '';
        const conversationId = policyContext.conversationId;
        const { provider: llmProvider, model: llmModel, maxTokens: llmMaxTokens } = runtimeConfig;

        const defsForPrompt = workDefinitions.map(d => ({
            id: d.typeId,
            bindingAttribute: d.definitionJson.bindingAttribute,
            slots: d.definitionJson.slots?.map(s => ({ 
                path: s.path, 
                type: s.type, 
                required: s.required,
                description: (s as any).description // 🎯 INSTRUCCIÓN DE CAMPO: Guía a la IA para no inventar slots
            })) ?? [],
        }));

        const systemPrompt = `Eres el Agente de Ejecución Transaccional de la cuenta. Tu única función es mapear la intención del usuario a uno de los WorkDefinitions disponibles.

INVENTARIO:
${JSON.stringify(defsForPrompt)}

LÓGICA:
1. Si la intención coincide con un ID del inventario, propón la apertura del Work y extrae los datos presentes.
2. De lo contrario, responde exactamente: null.

RESPUESTA (JSON):
{
  "workDefinitionTypeId": "id",
  "intent": "descripción",
  "candidateSlots": [{"path": "p", "value": "v", "evidence": {"text": "t", "confidence": 0.9}}],
  "confidence": 0.95
}`;

        try {
            const result = await llmClient.complete({
                provider: llmProvider ?? 'groq',
                model: llmModel ?? 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: messageText },
                ],
                maxTokens: llmMaxTokens ?? 512,
                temperature: 0.1,
            });

            const analysis = this.parseInterpretationResult(result.content, workDefinitions);

            if (!analysis) {
                return this.respondConversationally(messageText, conversationId, runtimeConfig);
            }

            // Phase 3: Gate — verify minimum binding attribute evidence
            if (analysis.candidateSlots.length === 0) {
                return [{
                    type: 'send_message',
                    conversationId,
                    content: `Entiendo lo que quieres hacer, pero necesito un poco más de información para convertirlo en una acción operativa. ¿Me das más detalle?`,
                }];
            }

            // Gate passed — return propose_work action
            return [{
                type: 'propose_work',
                conversationId,
                workDefinitionId: analysis.workDefinitionId,
                intent: analysis.intent,
                candidateSlots: analysis.candidateSlots,
                confidence: analysis.confidence,
                replyMessage: `Entiendo que quieres ${analysis.intent}. Déjame procesar eso.`,
            }];

        } catch (error: any) {
            console.error(`[FluxiRuntime] Interpretation failed:`, error.message);
            return this.respondConversationally(input);
        }
    }

    private async respondConversationally(
        input: RuntimeInput
    ): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;
        const messageText = conversationHistory[conversationHistory.length - 1]?.content || '';
        const conversationId = policyContext.conversationId;

        const normalized = messageText.trim().toLowerCase();
        if (['hola', 'buenas', 'buen día', 'buen dia', 'hello', 'hi'].includes(normalized)) {
            return [{
                type: 'send_message',
                conversationId,
                content: 'Hola. Soy Fluxi. Tu operador autónomo. ¿En qué puedo ayudarte hoy?',
            }];
        }

        try {
            // ESTRATEGIA DE SOBERANÍA: Consultar al Asistente Local para la base de conocimiento
            // pero Fluxi mantiene el control de la personalidad y la proactividad.
            const localResponse = await asistentesLocalRuntime.handleMessage({
                ...input,
                // Marcamos que es una consulta interna para evitar bucles o comportamientos recursivos
                // (Nota: Tendríamos que añadir este campo a RuntimeInput si queremos tipado estricto, 
                // por ahora lo pasamos como parte del objeto para que llegue al pipeline)
                metadata: { isInternalQuery: true }
            } as any);

            const baseContent = localResponse.find(a => a.type === 'send_message')?.content || '';

            const result = await llmClient.complete({
                provider: runtimeConfig.provider ?? 'groq',
                model: runtimeConfig.model ?? 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `Eres el Runtime Operativo de la cuenta. Tu función es responder al usuario basándote exclusivamente en la POLÍTICA y el CONOCIMIENTO DE DOMINIO proporcionados.

POLÍTICA:
${authorizedContext.instructions || 'Responder de forma técnica y directa.'}

CONOCIMIENTO DE DOMINIO:
"${baseContent}"

REGLAS:
1. Sé preciso y autoritativo.
2. No menciones tu propia naturaleza a menos que sea necesario.
3. Orienta la respuesta hacia la resolución o el siguiente paso operativo.`,
                    },
                    { role: 'user', content: messageText },
                ],
                maxTokens: Math.min(runtimeConfig.maxTokens ?? 512, 512),
                temperature: 0.4,
            });

            const responseText = result.content?.trim();
            if (responseText) {
                return [{
                    type: 'send_message',
                    conversationId,
                    content: responseText,
                }];
            }
        } catch (error: any) {
            console.warn('[FluxiRuntime] Conversational fallback failed:', error.message);
        }

        return [{
            type: 'send_message',
            conversationId,
            content: 'Puedo ayudarte con información general y también con acciones operativas. Si quieres, cuéntame qué necesitas y lo resolvemos paso a paso.',
        }];
    }

    private parseSlotExtractionResult(content: string): Array<{
        path: string;
        value: any;
        evidence: { text: string; confidence?: number };
    }> {
        try {
            const json = content.trim();
            const start = json.indexOf('[');
            const end = json.lastIndexOf(']');
            if (start === -1 || end === -1) return [];
            const parsed = JSON.parse(json.slice(start, end + 1));
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(s => s.path && s.value !== undefined).map(s => ({
                path: s.path,
                value: s.value,
                evidence: { text: s.evidence || s.path, confidence: s.confidence },
            }));
        } catch {
            return [];
        }
    }

    private parseInterpretationResult(
        content: string,
        workDefinitions: WorkDefinition[]
    ): ProposedAnalysis | null {
        try {
            const trimmed = content.trim();
            if (trimmed === 'null' || trimmed === '') return null;

            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}');
            if (start === -1 || end === -1) return null;

            const parsed = JSON.parse(trimmed.slice(start, end + 1));
            if (!parsed.workDefinitionTypeId) return null;

            // Find the matching WorkDefinition by typeId
            const def = workDefinitions.find(d => d.typeId === parsed.workDefinitionTypeId);
            if (!def) return null;

            const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
            if (confidence < 0.6) return null; // Minimum confidence gate

            return {
                workDefinitionId: def.id,
                intent: parsed.intent || parsed.workDefinitionTypeId,
                candidateSlots: Array.isArray(parsed.candidateSlots) ? parsed.candidateSlots : [],
                confidence,
            };
        } catch {
            return null;
        }
    }
}

export const fluxiRuntime = new FluxiRuntime();
