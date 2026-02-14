import { aiService } from '../../../apps/api/src/services/ai.service';
import { WorkDefinition, workDefinitionService } from '../../../apps/api/src/services/work-definition.service';
import { logTrace } from '../../../apps/api/src/utils/file-logger';
import { metricsService } from '../../../apps/api/src/services/metrics.service';
import { aiCircuitBreaker } from '../../../apps/api/src/services/ai-circuit-breaker.service';

export interface ProposedWorkAnalysis {
    workDefinitionId: string;
    intent: string;
    candidateSlots: Array<{
        path: string;
        value: any;
        evidence: {
            text: string;
            confidence?: number;
        };
    }>;
    confidence: number;
    reasoning: string;
}

export class WesInterpreterService {

    /**
     * Analiza un mensaje para detectar intenciones transaccionales basadas en WorkDefinitions activas.
     */
    async interpret(
        accountId: string,
        conversationId: string,
        text: string,
        modelInfo?: { model?: string; provider?: string } // Optional param, logged if used
    ): Promise<ProposedWorkAnalysis | null> {
        // Circuit Breaker Check
        if (!aiCircuitBreaker.isAvailable('wes-interpreter')) {
            metricsService.increment('wes.interpreter.skipped', 1, { reason: 'circuit_open' });
            return null;
        }

        const start = Date.now();
        metricsService.increment('wes.interpreter.requests', 1, { accountId });

        // Log interpretation attempt
        logTrace(`[WesInterpreter] Analyzing intent for conversation ${conversationId}`, {
            textLength: text.length,
            modelInfo
        });

        try {
            // 1. Obtener definiciones disponibles
            let definitions: WorkDefinition[] = [];
            try {
                definitions = await workDefinitionService.listLatest(accountId);
            } catch (error) {
                console.error('[WesInterpreter] Error fetching definitions:', error);
                metricsService.increment('wes.interpreter.errors', 1, { type: 'fetch_definitions', accountId });
                return null;
            }

            if (definitions.length === 0) {
                return null;
            }

            // 2. Simplificar definiciones para el prompt
            const simplifiedDefs = definitions.map(d => ({
                id: d.typeId, // Usamos typeId como identificador lógico para el LLM
                bindingAttribute: d.definitionJson.bindingAttribute,
                slots: d.definitionJson.slots.map(s => ({
                    path: s.path,
                    type: s.type,
                    required: s.required,
                    description: s.path // Podríamos agregar descripción si existiera en schema
                }))
            }));

            // 3. Construir Prompt de Sistema
            const systemPrompt = `You are the Transactional Interpreter of a Work Operating System.
Your goal is to analyze user messages and map them to ONE of the available Work Definitions, but ONLY if the user explicitly expresses an intent that matches and provides the required Binding Attribute.

Available Work Definitions:
${JSON.stringify(simplifiedDefs, null, 2)}

Instructions:
1. Analyze the USER MESSAGE.
2. Determine if it matches any Work Definition intent.
3. CRITICAL: You MUST find explicit textual evidence for the "bindingAttribute" of the matching definition.
4. If a match is found and binding attribute evidence exists, extract other slots if present.
5. Return a JSON object (and ONLY JSON).

Output JSON Format (success):
{
  "match": true,
  "workDefinitionId": "STRING (the typeId)",
  "intent": "STRING (brief explanation of user intent)",
  "confidence": NUMBER (0.0 to 1.0),
  "slots": [
    {
      "path": "STRING (slot path)",
      "value": ANY (normalized value),
      "evidence": "STRING (exact text substring from message)"
    }
  ]
}

Output JSON Format (no match or ambiguity):
{
  "match": false,
  "reason": "STRING (why)"
}

Rules:
- Do NOT hallucinate evidence. "evidence" must be a substring of the message.
- If multiple definitions match, choose the most specific one.
- If confidence is low (< 0.7), return match: false.
- Do NOT answer the user. Just output JSON.
`;

            // Use direct rawCompletion helper
            const response = await aiService.rawCompletion({
                model: 'llama-3.1-8b-instant', // Match successful trace for reliability
                provider: 'groq',
                systemPrompt,
                messages: [{ role: 'user', content: text }],
                temperature: 0,
                maxTokens: 512,
                responseFormat: { type: 'json_object' }
            });

            const content = response.content || '';
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            let parsed: any;
            try {
                parsed = JSON.parse(cleanContent);
            } catch (e) {
                console.warn('[WesInterpreter] Failed to parse LLM JSON:', cleanContent);
                metricsService.increment('wes.interpreter.errors', 1, { type: 'json_parse', accountId });
                // Do not trip circuit breaker for parse errors, might be model quirk, not outage
                return null;
            }

            // Valid Response received
            aiCircuitBreaker.recordSuccess('wes-interpreter');

            if (parsed.match === true && parsed.workDefinitionId) {
                // Mapear de vuelta al ID interno (UUID)
                const def = definitions.find(d => d.typeId === parsed.workDefinitionId);
                if (!def) return null;

                logTrace(`[WesInterpreter] Match found: ${def.typeId} (${parsed.intent})`, { conversationId, confidence: parsed.confidence });
                metricsService.increment('wes.interpreter.matches', 1, { accountId, workDefinitionId: def.typeId });

                return {
                    workDefinitionId: def.id, // UUID real
                    intent: parsed.intent || 'Detected by AI',
                    confidence: parsed.confidence || 0.9,
                    reasoning: parsed.reason || '',
                    candidateSlots: (parsed.slots || []).map((s: any) => ({
                        path: s.path,
                        value: s.value,
                        evidence: {
                            text: s.evidence || '',
                            confidence: 1
                        }
                    }))
                };
            }

            return null;

        } catch (error: any) {
            console.error('[WesInterpreter] LLM Call failed:', error.message);
            aiCircuitBreaker.recordFailure('wes-interpreter');
            metricsService.increment('wes.interpreter.errors', 1, { type: 'llm_call_failed', accountId });
            return null;
        } finally {
            metricsService.recordTiming('wes.interpreter.latency', Date.now() - start, { accountId });
        }
    }

    /**
     * WOS-100: Analiza un mensaje en el contexto de un Trabajo ACTIVO.
     * Su objetivo es extraer valores para los slots que faltan o actualizar los existentes si el usuario lo solicita.
     */
    async solveActiveWork(
        accountId: string,
        workId: string,
        definition: WorkDefinition,
        currentState: { slots: Record<string, any>; state: string },
        text: string
    ): Promise<Array<{ path: string, value: any, evidence: string }> | null> {
        if (!aiCircuitBreaker.isAvailable('wes-interpreter')) return null;

        const start = Date.now();
        logTrace(`[WesInterpreter] Solving active work ${workId} (${definition.typeId})`, { textLength: text.length });

        try {
            const systemPrompt = `You are the Active Work Solver of a Work Operating System.
An existing transactional process is ACTIVE. Your goal is to extract specific slot values from the user's message to complete the state.

Work Type: ${definition.typeId}
Current State: ${currentState.state}
Current Slots: ${JSON.stringify(currentState.slots, null, 2)}
Expected Slots Schema: ${JSON.stringify(definition.definitionJson.slots, null, 2)}

Instructions:
1. Analyze the USER MESSAGE.
2. Identify values for any expected slots that are currently missing or need updating.
3. CRITICAL: You MUST find explicit textual evidence for every value you extract.
4. Return a JSON object (and ONLY JSON).

Output JSON Format:
{
  "matchesFound": true/false,
  "slots": [
    {
      "path": "STRING (slot path)",
      "value": ANY (normalized value),
      "evidence": "STRING (exact text substring from message)"
    }
  ],
  "reasoning": "STRING (brief explanation)"
}

Rules:
- If no new information is present in the message, return matchesFound: false.
- Do NOT hallucinate. Values MUST have evidence in the message.
- Do NOT answer the user. Just output JSON.`;

            const response = await aiService.rawCompletion({
                model: 'llama-3.1-8b-instant',
                provider: 'groq',
                systemPrompt,
                messages: [{ role: 'user', content: text }],
                temperature: 0,
                maxTokens: 512,
                responseFormat: { type: 'json_object' }
            });

            const content = response.content || '';
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            let parsed: any;
            try {
                parsed = JSON.parse(cleanContent);
            } catch (e) {
                return null;
            }

            if (parsed.matchesFound === true && Array.isArray(parsed.slots)) {
                return parsed.slots;
            }

            return null;
        } catch (error: any) {
            console.error('[WesInterpreter] Solve Active Work failed:', error.message);
            return null;
        } finally {
            metricsService.recordTiming('wes.interpreter.solve.latency', Date.now() - start, { accountId });
        }
    }
}

export const wesInterpreter = new WesInterpreterService();
