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
    readonly runtimeId = 'fluxi-runtime';
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

        // workDefinitions come from RuntimeConfig (resolved before handleMessage)
        const workDefinitions: WorkDefinition[] = runtimeConfig.workDefinitions ?? [];
        const activeWorkId = policyContext.activeWork?.workId;

        // ── Phase 1: Active Work exists → ingest new slot values ─────────────
        if (activeWorkId) {
            return this.handleActiveWork(activeWorkId, messageText, conversationId, runtimeConfig);
        }

        // ── Phase 2: No active work → interpret for new transactional intent ──
        if (workDefinitions.length === 0) {
            return [{ type: 'no_action', reason: 'No WorkDefinitions configured for this account' }];
        }

        return this.interpretAndPropose(messageText, conversationId, workDefinitions, runtimeConfig);
    }

    /**
     * Phase 1: An active Work exists. Try to extract slot values from the user message.
     */
    private async handleActiveWork(
        workId: string,
        messageText: string,
        conversationId: string,
        runtimeConfig: RuntimeInput['runtimeConfig']
    ): Promise<ExecutionAction[]> {
        const { provider: llmProvider, model: llmModel, maxTokens: llmMaxTokens, temperature: llmTemperature } = runtimeConfig;

        // Check for semantic confirmation first (deterministic, no LLM needed)
        const confirmKeywords = ['sí', 'si', 'ok', 'dale', 'confirmar', 'confirmado', 'afirmativo', 'está bien'];
        if (confirmKeywords.includes(messageText.toLowerCase().trim())) {
            // Semantic confirmation is handled by ActionExecutor via semantic context lookup
            // Return advance_work_state with empty slots — ActionExecutor will do the lookup
            return [{
                type: 'advance_work_state',
                conversationId,
                workId,
                slots: [],
                replyMessage: 'Confirmado. Procesando...',
            }];
        }

        // Use LLM to extract slot values from the message
        const systemPrompt = `Eres el extractor de datos del sistema transaccional Fluxi.
Tu tarea: extraer valores de slots del mensaje del usuario para un Work en progreso.
Devuelve ÚNICAMENTE un JSON array de slots extraídos o [] si no hay datos nuevos.
Formato: [{"path": "slot.path", "value": "valor_extraído", "evidence": "texto exacto del mensaje"}]`;

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
                content: `No pude identificar información relevante en tu mensaje. ¿Podrías ser más específico?`,
            }];

        } catch (error: any) {
            console.error(`[FluxiRuntime] Slot extraction failed for work ${workId}:`, error.message);
            return [{ type: 'no_action', reason: `Slot extraction error: ${error.message}` }];
        }
    }

    /**
     * Phase 2+3: No active work. Interpret message for transactional intent.
     */
    private async interpretAndPropose(
        messageText: string,
        conversationId: string,
        workDefinitions: WorkDefinition[],
        runtimeConfig: RuntimeInput['runtimeConfig']
    ): Promise<ExecutionAction[]> {
        const { provider: llmProvider, model: llmModel, maxTokens: llmMaxTokens } = runtimeConfig;

        const defsForPrompt = workDefinitions.map(d => ({
            id: d.typeId,
            bindingAttribute: d.definitionJson.bindingAttribute,
            slots: d.definitionJson.slots?.map(s => ({ path: s.path, type: s.type, required: s.required })) ?? [],
        }));

        const systemPrompt = `Eres el intérprete transaccional de Fluxi.
Analiza si el mensaje del usuario expresa una intención transaccional que coincide con alguna de las definiciones de Work disponibles.

WorkDefinitions disponibles:
${JSON.stringify(defsForPrompt, null, 2)}

Si detectas intención transaccional, responde ÚNICAMENTE con este JSON:
{
  "workDefinitionTypeId": "id_del_tipo",
  "intent": "descripción breve de la intención",
  "candidateSlots": [{"path": "slot.path", "value": "valor", "evidence": {"text": "texto exacto", "confidence": 0.9}}],
  "confidence": 0.85
}

Si NO hay intención transaccional clara, responde exactamente: null`;

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
                return [{ type: 'no_action', reason: 'No transactional intent detected by WES Interpreter' }];
            }

            // Phase 3: Gate — verify minimum binding attribute evidence
            if (analysis.candidateSlots.length === 0) {
                return [{ type: 'no_action', reason: 'ProposedWork rejected: no candidate slots with evidence' }];
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
            return [{ type: 'no_action', reason: `WES Interpreter error: ${error.message}` }];
        }
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
