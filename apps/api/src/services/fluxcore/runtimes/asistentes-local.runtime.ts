/**
 * AsistentesLocalRuntime — FluxCore v8.5
 *
 * Canon §4.10: Sovereign cognitive runtime. Local LLM execution.
 *
 * INVARIANTS:
 *  - NO DB access during handleMessage (Canon Inv. 10)
 *  - NO direct effect execution — returns actions only
 *  - NO calls to other runtimes
 *  - All config arrives in RuntimeInput.runtimeConfig
 *
 * Capabilities (parity with old fluxcore-asistentes extension):
 *  - RAG via search_knowledge tool (Query Service — no DB, HTTP call)
 *  - Template sending via send_template tool
 *  - Multi-round tool calling (up to MAX_TOOL_ROUNDS)
 *  - Provider fallback built into LLMClient
 */

import type { RuntimeAdapter, RuntimeInput, ExecutionAction, SendTemplateAction } from '../../../core/fluxcore-types';
import type { LLMCompletionResult, LLMMessage } from '../llm-client.service';
import { createCapabilityDeps } from '../../capability-deps-factory.service';
import { capabilityLocalRuntimeToolsService } from '../../capability-local-runtime-tools.service';
import { promptBuilder } from '../prompt-builder.service';
import { llmClient } from '../llm-client.service';
import { retrievalService } from '../../retrieval.service';
import * as Prompts from './asistentes-local.prompts';
import { trackCognitiveStep } from '../../../telemetry/tracer';
import { getModelCapabilities } from '../provider-capabilities';
import { templateSemanticService } from '../template-semantic.service';

const MAX_TOOL_ROUNDS = 3;
const ASISTENTES_LOCAL_CAPABILITY_CEILING = ['search_knowledge', 'send_template', 'list_available_templates'];

export type AuthorizedTemplateDefinition = {
    templateId: string;
    name: string;
    instructions?: string;
    content?: string;
};

type ParsedTemplateResponse = {
    foundTemplateMarker: boolean;
    templateActions: SendTemplateAction[];
    residualText: string | null;
    errors: string[];
};

type TemplateFollowUpContext = {
    templateId: string;
    name: string;
    renderedContent: string;
};

function getNextNonWhitespaceIndex(text: string, startIndex: number): number {
    let cursor = startIndex;
    while (cursor < text.length && /\s/.test(text[cursor]!)) {
        cursor += 1;
    }
    return cursor;
}

function normalizeTemplateVariables(input: unknown): Record<string, string> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {};
    }

    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            variables[key] = String(value);
        }
    }
    return variables;
}

function extractJsonObject(text: string, startIndex: number): { variables: Record<string, string>; endIndex: number } | null {
    const jsonStart = getNextNonWhitespaceIndex(text, startIndex);
    if (jsonStart >= text.length || text[jsonStart] !== '{') {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = jsonStart; i < text.length; i += 1) {
        const char = text[i]!;

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\' && inString) {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                const rawObject = text.slice(jsonStart, i + 1);
                try {
                    return {
                        variables: normalizeTemplateVariables(JSON.parse(rawObject)),
                        endIndex: i + 1,
                    };
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

function normalizeResidualText(text: string): string | null {
    const normalized = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

    return normalized.length > 0 ? normalized : null;
}

function removeRanges(text: string, ranges: Array<{ start: number; end: number }>): string | null {
    if (ranges.length === 0) {
        return normalizeResidualText(text);
    }

    const orderedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const mergedRanges: Array<{ start: number; end: number }> = [];

    for (const range of orderedRanges) {
        const lastRange = mergedRanges[mergedRanges.length - 1];
        if (!lastRange || range.start > lastRange.end) {
            mergedRanges.push({ ...range });
            continue;
        }
        lastRange.end = Math.max(lastRange.end, range.end);
    }

    const parts: string[] = [];
    let cursor = 0;

    for (const range of mergedRanges) {
        if (cursor < range.start) {
            parts.push(text.slice(cursor, range.start));
        }
        cursor = Math.max(cursor, range.end);
    }

    if (cursor < text.length) {
        parts.push(text.slice(cursor));
    }

    return normalizeResidualText(parts.join('\n'));
}

function serializeTemplateVariables(variables?: Record<string, string>): string {
    return JSON.stringify(
        Object.entries(variables ?? {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    );
}

function dedupeTemplateActions(actions: SendTemplateAction[]): SendTemplateAction[] {
    const seen = new Set<string>();

    return actions.filter(action => {
        const signature = `${action.templateId}:${serializeTemplateVariables(action.variables)}`;
        if (seen.has(signature)) {
            return false;
        }
        seen.add(signature);
        return true;
    });
}



function parseTemplateResponse(params: {
    responseText: string;
    conversationId: string;
    authorizedTemplateIds: string[];
    templateDefinitions: AuthorizedTemplateDefinition[];
}): ParsedTemplateResponse {
    const { responseText, conversationId, authorizedTemplateIds, templateDefinitions } = params;
    const markerRegex = /(?:CALL|Call)[_\s]*TEMPLATE:\s*([a-f\d-]+)/ig;
    const authorizedTemplateSet = new Set(authorizedTemplateIds);
    const templateActions: SendTemplateAction[] = [];
    const rangesToRemove: Array<{ start: number; end: number }> = [];
    const errors: string[] = [];
    let foundTemplateMarker = false;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(responseText)) !== null) {
        foundTemplateMarker = true;
        const templateId = match[1];
        if (!templateId) {
            continue;
        }

        const markerStart = match.index;
        let markerEnd = match.index + match[0].length;
        const nextNonWhitespaceIndex = getNextNonWhitespaceIndex(responseText, markerEnd);
        const hasJsonCandidate = nextNonWhitespaceIndex < responseText.length && responseText[nextNonWhitespaceIndex] === '{';
        let variables: Record<string, string> = {};

        if (hasJsonCandidate) {
            const parsedObject = extractJsonObject(responseText, markerEnd);
            if (parsedObject) {
                variables = parsedObject.variables;
                markerEnd = parsedObject.endIndex;
            } else {
                console.warn(`[AsistentesLocal] ⚠️ Ignoring malformed JSON payload for template marker: ${templateId}`);
            }
        }

        rangesToRemove.push({ start: markerStart, end: markerEnd });

        if (!authorizedTemplateSet.has(templateId)) {
            console.warn(`[AsistentesLocal] ⚠️ IA tried to call unauthorized template: ${templateId}`);
            errors.push(`Template ID not authorized: ${templateId}`);
            continue;
        }

        // Validate required variables
        const templateDef = templateDefinitions.find(t => t.templateId === templateId);
        if (templateDef && templateDef.content) {
            const missingVars: string[] = [];
            const regex = /\{\{([^}]+)\}\}/g;
            let varMatch;
            while ((varMatch = regex.exec(templateDef.content)) !== null) {
                const reqVar = varMatch[1].trim();
                if (reqVar && !variables[reqVar]) {
                    missingVars.push(reqVar);
                }
            }
            if (missingVars.length > 0) {
                errors.push(`Faltan variables requeridas para la plantilla '${templateDef.name}': ${missingVars.join(', ')}`);
                continue; // Do not push to templateActions if missing variables
            }
        }

        templateActions.push({
            type: 'send_template',
            templateId,
            conversationId,
            variables,
        });
    }

    return {
        foundTemplateMarker,
        templateActions: dedupeTemplateActions(templateActions),
        residualText: removeRanges(responseText, rangesToRemove),
        errors,
    };
}

function getAuthorizedTemplateDefinitions(authorizedContext: RuntimeInput['authorizedContext']): AuthorizedTemplateDefinition[] {
    const templates = (authorizedContext.businessProfile as { templates?: unknown }).templates;
    if (!Array.isArray(templates)) {
        return [];
    }

    // Filtrar por los IDs autorizados para garantizar consistencia con el parser
    const authorizedTemplateIds = new Set(authorizedContext.authorizedTemplates || []);

    return templates
        .filter((template): template is AuthorizedTemplateDefinition => {
            return !!template &&
                typeof template === 'object' &&
                typeof (template as AuthorizedTemplateDefinition).templateId === 'string' &&
                authorizedTemplateIds.has((template as AuthorizedTemplateDefinition).templateId); // Solo autorizadas
        })
        .map(template => ({
            templateId: template.templateId,
            name: typeof template.name === 'string' && template.name.trim().length > 0 ? template.name : template.templateId,
            instructions: typeof (template as any).instructions === 'string' ? (template as any).instructions : undefined,
            content: typeof template.content === 'string' ? template.content : undefined,
        }));
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderTemplateContent(content: string, variables?: Record<string, string>): string {
    let renderedContent = content;

    for (const [key, value] of Object.entries(variables ?? {})) {
        renderedContent = renderedContent.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'), value);
    }

    return renderedContent;
}

function buildTemplateFollowUpContext(
    actions: SendTemplateAction[],
    authorizedContext: RuntimeInput['authorizedContext']
): TemplateFollowUpContext[] {
    const templateDefinitions = getAuthorizedTemplateDefinitions(authorizedContext);

    return actions
        .map(action => {
            const definition = templateDefinitions.find(template => template.templateId === action.templateId);
            if (!definition?.content || definition.content.trim().length === 0) {
                return null;
            }

            return {
                templateId: action.templateId,
                name: definition.name,
                renderedContent: renderTemplateContent(definition.content, action.variables),
            };
        })
        .filter((entry): entry is TemplateFollowUpContext => !!entry);
}

function summarizeResidualFacts(residualText: string): string | null {
    const trimmed = residualText.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }

        const lines = Object.entries(parsed)
            .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            .map(([key, value]) => `- ${key}: ${String(value)}`);

        return lines.length > 0 ? lines.join('\n') : null;
    } catch {
        return null;
    }
}

function sanitizeFollowUpText(text: string | null | undefined): string | null {
    const trimmed = text?.trim();
    if (!trimmed || /^NO_FOLLOW_UP$/i.test(trimmed)) {
        return null;
    }

    if (/CALL_TEMPLATE:/i.test(trimmed)) {
        return null;
    }

    if (/^```(?:json)?[\s\S]*```$/i.test(trimmed)) {
        return null;
    }

    if (/^(\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed)) {
        return null;
    }

    return trimmed;
}

function logLLMCompletion(params: {
    phase: 'main' | 'template_follow_up' | 'intent_router';
    result: LLMCompletionResult;
    round?: number;
}): void {
    const { phase, result, round } = params;
    const suffix = typeof round === 'number' ? ` round=${round}` : '';
    console.log(`[AsistentesLocal] 🧠 LLM ${phase}${suffix}: ${JSON.stringify({
        provider: result.provider,
        model: result.model,
        finishReason: result.finishReason ?? null,
        content: result.content,
        toolCalls: result.toolCalls ?? [],
        usage: result.usage ?? null,
    })}`);
}

// ─── Runtime ────────────────────────────────────────────────────────────────

export class AsistentesLocalRuntime implements RuntimeAdapter {
    readonly runtimeId = 'asistentes-local';
    readonly displayName = 'Asistentes Local (v8.5)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, authorizedContext, runtimeConfig, conversationHistory } = input;

        // 1. Guard: mode gate
        if (policyContext.mode === 'off') {
            return [{ type: 'no_action', reason: 'Automation mode is off' }];
        }

        // 2. Guard: loop prevention
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastMessage) return [{ type: 'no_action', reason: 'No messages in conversation' }];
        const provider = (runtimeConfig.provider ?? 'groq') as 'groq' | 'openai';
        const model = runtimeConfig.model ?? 'llama-3.1-8b-instant';
        const maxTokens = runtimeConfig.maxTokens ?? 1024;
        const temperature = runtimeConfig.temperature ?? 0.7;

        // 3. Fase 0: Tamiz Semántico (Aguas Arriba)
        // Reducimos el conjunto de plantillas a las 10 más relevantes semánticamente.
        let sievedTemplateIds: string[] = authorizedContext.authorizedTemplates || [];
        
        console.log(`\n======================================================`);
        console.log(`🧠 [FASE 0] TAMIZ SEMÁNTICO - EVALUACIÓN`);
        console.log(`======================================================`);
        
        try {
            const relevantIds = await trackCognitiveStep(
                'FASE_0_SIEVE',
                { 
                    'account.id': authorizedContext.accountId,
                    'templates.total': String(authorizedContext.authorizedTemplates?.length)
                },
                { 
                    lastMessage: lastMessage.content,
                    availableTemplates: authorizedContext.authorizedTemplates
                },
                async () => {
                    // Si hay pocas plantillas, no hace falta filtrar pero sí reportar
                    if (sievedTemplateIds.length <= 10) {
                        return sievedTemplateIds;
                    }
                    return await templateSemanticService.searchRelevantTemplateIds(
                        lastMessage.content, 
                        authorizedContext.accountId, 
                        10
                    );
                },
                input.executionId // 🎯 VÍNCULO DETERMINISTA (v10.0)
            );
            
            sievedTemplateIds = relevantIds;
            console.log(`✅ Tamiz completado: ${sievedTemplateIds.length} plantillas seleccionadas.`);
        } catch (error) {
            console.error(`[AsistentesLocal] ⚠️ Error en Tamiz Semántico:`, error);
        }

        // Ajustamos el authorizedContext para las fases siguientes
        const sievedAuthorizedContext = {
            ...authorizedContext,
            authorizedTemplates: sievedTemplateIds
        };

        // ── FASE 1: INTENT ROUTER ─────────────────────────────────────────────
        const templateDefinitions = getAuthorizedTemplateDefinitions(sievedAuthorizedContext);
        let matchedTemplateIds: string[] = [];
        let extractedIntent: string | null = null;

        if (templateDefinitions.length > 0) {
            const relevantHistory = conversationHistory
                .slice(-4)
                .map(h => `${h.role.toUpperCase()}: ${h.content}`)
                .join('\n');
            
            // Re-mapeo para tokens cortos (ahorro de latencia y distorsión)
            const templatesText = templateDefinitions.map((t, index) => {
                return `- ID: T${index + 1} (${t.templateId})\n  Nombre: ${t.name}\n  Cuándo usarla: ${t.instructions ?? 'Coincidencia con intención'}`;
            }).join('\n\n');
            const routerSystemPrompt = Prompts.buildRouterSystemPrompt(templatesText);

            console.log(`\n======================================================`);
            console.log(`🧠 [FASE 1] LLM ROUTER - INPUT (EVALUACIÓN DE INTENCIÓN)`);
            console.log(`======================================================`);
            console.log(`[Router System Prompt]:\n${routerSystemPrompt.substring(0, 500)}...\n`);

            const routerResult = await trackCognitiveStep(
                'FASE_1_ROUTER',
                { 
                    'account.id': authorizedContext.accountId,
                    'model': model
                },
                { 
                    systemInstructions: routerSystemPrompt, // EXPOSICIÓN TOTAL
                    history: relevantHistory, 
                    candidates: templateDefinitions.map(t => ({ id: t.templateId, name: t.name }))
                },
                async () => {
                    return await this.evaluateTemplateIntents({
                        provider,
                        model,
                        conversationContext: relevantHistory,
                        templates: templateDefinitions,
                    });
                },
                input.executionId // 🎯 VÍNCULO DETERMINISTA (v10.0)
            );

            matchedTemplateIds = routerResult.matchedTemplateIds;
            extractedIntent = routerResult.extractedIntent;

            console.log(`\n======================================================`);
            console.log(`🧠 [FASE 1] LLM ROUTER - OUTPUT`);
            console.log(`======================================================`);
            console.log(`✅ Plantillas Rutadas: ${matchedTemplateIds.join(', ')}`);
            console.log(`🎯 Intención Base Extraída: "${extractedIntent}"`);
        }

        // ── FASE 2: RAG DETERMINISTA ──────────────────────────────────────────
        let deterministicRagContext = '';
        if (extractedIntent && extractedIntent.trim().length > 0) {
            console.log(`\n======================================================`);
            console.log(`🧠 [FASE 2] RAG DETERMINISTA - SEARCH`);
            console.log(`======================================================`);
            console.log(`Ejecutando Similarity Search Vectorial nativa para: "${extractedIntent}"...`);
            try {
                const ragResult = await trackCognitiveStep(
                    'FASE_2_RAG',
                    { 
                        'account.id': authorizedContext.accountId,
                        'intent': extractedIntent
                    },
                    { intent: extractedIntent, vectorStores: runtimeConfig.vectorStoreIds },
                    async () => {
                        return await retrievalService.buildContext(
                            extractedIntent,
                            runtimeConfig.vectorStoreIds,
                            authorizedContext.accountId,
                            { topK: 2, maxTokens: 800 }
                        );
                    },
                    input.executionId // 🎯 VÍNCULO DETERMINISTA (v10.0)
                );

                if (ragResult.context) {
                    deterministicRagContext = ragResult.context;
                    console.log(`\n======================================================`);
                    console.log(`🧠 [FASE 2] RAG DETERMINISTA - RESULTADOS ENCONTRADOS`);
                    console.log(`======================================================`);
                    console.log(`✅ Chunks extraídos: ${ragResult.chunksUsed}`);
                    console.log(`[VISTA PREVIA DEL CONTEXTO DE CONOCIMIENTO]:\n${ragResult.context.substring(0, 500)}...\n`);
                } else {
                    console.log(`\n======================================================`);
                    console.log(`🧠 [FASE 2] RAG DETERMINISTA - SIN RESULTADOS`);
                    console.log(`======================================================`);
                    console.log(`⚠️ Advertencia: No se encontraron documentos relevantes en la base por encima del umbral de confianza.`);
                }
            } catch (error: any) {
                console.error(`[AsistentesLocal] 📛 Error ejecutando RAG Determinista: ${error.message}`);
            }
        }

        // 4. Preparación de Contexto Estricto para Fase 2
        // Solo inyectaremos al Prompt Builder las plantillas seleccionadas por la Fase 1 !!
        const strictAuthorizedContext = {
            ...authorizedContext,
            authorizedTemplates: matchedTemplateIds
        };
        if (strictAuthorizedContext.businessProfile && strictAuthorizedContext.businessProfile.templates) {
            strictAuthorizedContext.businessProfile = {
                ...strictAuthorizedContext.businessProfile,
                templates: strictAuthorizedContext.businessProfile.templates.filter(t => matchedTemplateIds.includes(t.templateId))
            };
        }

        const strictPolicyContext = {
            ...policyContext,
            authorizedTemplates: matchedTemplateIds
        };
        if (strictPolicyContext.resolvedBusinessProfile && (strictPolicyContext.resolvedBusinessProfile as any).templates) {
            strictPolicyContext.resolvedBusinessProfile = {
                ...strictPolicyContext.resolvedBusinessProfile,
                templates: (strictPolicyContext.resolvedBusinessProfile as any).templates.filter((t: any) => matchedTemplateIds.includes(t.templateId))
            };
        }

        // 5. Build prompt (Fase 2) usando SOLO las plantillas filtradas
        let { systemPrompt, messages } = promptBuilder.build({
            policyContext: strictPolicyContext,
            authorizedContext: strictAuthorizedContext,
            runtimeConfig,
            conversationHistory,
        });

        // v8.5 (BLOODHOUND): Ensamblado de Prompt de Fase 3 usando módulo externo
        // Usamos el sistema estándar pero reforzamos la regla de ejecución
        systemPrompt += `\n\n${Prompts.buildTemplateEnforcement()}`;


        // 7. Inyectar el Contexto Determinista de la Fase 2 (RAG)
        if (deterministicRagContext) {
            systemPrompt += `\n\n${Prompts.buildRagContextPrompt(deterministicRagContext)}`;
        }

        console.log(`[AsistentesLocal] 📜 SYSTEM PROMPT DEBUG:`);
        console.log(`----------------------------------------`);
        console.log(systemPrompt);
        console.log(`----------------------------------------`);

        // 7. Decide which tools to offer (Intersect ceiling with authorized tools)
        const effectiveTools = ASISTENTES_LOCAL_CAPABILITY_CEILING.filter(name =>
            (runtimeConfig.authorizedTools ?? ASISTENTES_LOCAL_CAPABILITY_CEILING).includes(name)
        );

        const tools = capabilityLocalRuntimeToolsService.listTools({
            runtimeConfig,
            authorizedContext,
            allowedToolNames: effectiveTools,
        });

        const capabilityExecutionDeps = createCapabilityDeps({
            enableTemplateSend: false,
        });

        console.log(`[AsistentesLocal] → ${provider}/${model} | Tools:${tools.length} | account:${authorizedContext.accountId}`);

        // 5. Tool call loop (max MAX_TOOL_ROUNDS rounds)
        let currentMessages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            ...messages,
        ];
        const queuedTemplateActions: SendTemplateAction[] = [];

        // ── FASE 3: MODO RESOLUTIVO ───────────────────────────────────────────
        try {
            for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            // Mitigación de Rate Limit por inmediatez:
            if (round > 0) {
                const delayMs = 3000;
                console.log(`[AsistentesLocal] 🕒 Esperando ${delayMs}ms para mitigar Rate Limit antes del round ${round}...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            console.log(`\n======================================================`);
            console.log(`🧠 [FASE 3] LLM MODO RESOLUTIVO - INPUT COMPLETO (ROUND ${round})`);
            console.log(`======================================================`);
            console.log(`[System Prompt Principal (Abreviado)]:\n... ${systemPrompt.substring(0, 300)} ...`);
            console.log(`\n[Contexto RAG Injectado en este turno]:\n${deterministicRagContext ? deterministicRagContext.substring(0, 300) + '...' : '(Vacío - No hay RAG)'}\n`);

            const result = await trackCognitiveStep(
                'FASE_3_RESOLUTIVE_CALL',
                { 
                    'account.id': authorizedContext.accountId,
                    'round': String(round),
                    'model': model
                },
                { systemPrompt, messages: currentMessages, tools: tools.map(t => t.function.name) },
                async () => {
                    return await llmClient.complete({
                        provider,
                        model,
                        messages: currentMessages,
                        maxTokens,
                        temperature,
                        tools: tools.length > 0 ? tools : undefined,
                        toolChoice: tools.length > 0 ? 'auto' : undefined,
                    });
                },
                input.executionId // 🎯 VÍNCULO DETERMINISTA (v10.0)
            );
            logLLMCompletion({ phase: 'main', round, result });

            // No tool calls — final text response
            if (!result.toolCalls || result.toolCalls.length === 0) {
                const responseText = result.content?.trim();
                if (!responseText) {
                    return queuedTemplateActions.length > 0
                        ? dedupeTemplateActions(queuedTemplateActions)
                        : [{ type: 'no_action', reason: 'LLM returned empty response' }];
                }

                const parsedTemplateResponse = parseTemplateResponse({
                    responseText,
                    conversationId: policyContext.conversationId,
                    authorizedTemplateIds: authorizedContext.authorizedTemplates,
                    templateDefinitions: templateDefinitions,
                });

                // Si hay errores de validación (ej. faltan variables), retroalimentar a la IA
                if (parsedTemplateResponse.errors && parsedTemplateResponse.errors.length > 0) {
                    if (round >= MAX_TOOL_ROUNDS) {
                        console.warn(`[AsistentesLocal] ⚠️ Se alcanzó el máximo de rondas y la plantilla sigue fallando: ${parsedTemplateResponse.errors[0]}`);
                        return [{
                            type: 'send_message',
                            conversationId: policyContext.conversationId,
                            content: `Lo siento, me faltan algunos detalles para poder darte la respuesta exacta. ¿Podrías comentarme un poco más sobre tu consulta?`
                        }];
                    }

                    console.warn(`[AsistentesLocal] ⚠️ Template validation failed: ${parsedTemplateResponse.errors.join(', ')}`);
                    currentMessages = [
                        ...currentMessages,
                        { role: 'assistant', content: responseText },
                        { 
                            role: 'system', 
                            content: `Error interno de validación. Las variables correctas para esta plantilla son: ${parsedTemplateResponse.errors.join('. ')}. Reintentá la invocación usando exactamente esos nombres de variables según el esquema definido. No menciones este error al usuario ni pidas disculpas por él, simplemente corregí la llamada.` 
                        }
                    ];
                    continue; // Continuar el bucle para que la IA se autocorrija
                }

                const templateActions = dedupeTemplateActions([
                    ...queuedTemplateActions,
                    ...parsedTemplateResponse.templateActions,
                ]);

                if (templateActions.length > 0) {
                    const residualText = parsedTemplateResponse.foundTemplateMarker
                        ? parsedTemplateResponse.residualText
                        : normalizeResidualText(responseText);

                    if (!residualText) {
                        console.log(`[AsistentesLocal] ✅ Template-only response (${result.usage?.totalTokens ?? '?'} tokens)`);
                        return templateActions;
                    }

                    const templateFollowUpContext = buildTemplateFollowUpContext(templateActions, authorizedContext);
                    if (templateFollowUpContext.length === 0) {
                        console.warn(`[AsistentesLocal] ⚠️ No template context available, proceeding with direct execution`);
                    }

                    const followUpText = await this.generateTemplateAwareFollowUp({
                        provider,
                        model,
                        maxTokens,
                        temperature,
                        systemPrompt,
                        messages,
                        lastUserMessage: lastMessage.content,
                        residualText,
                        templateFollowUpContext,
                    });

                    if (!followUpText) {
                        console.log(`[AsistentesLocal] ✅ Template response without safe follow-up (${result.usage?.totalTokens ?? '?'} tokens)`);
                        return templateActions;
                    }

                    console.log(`[AsistentesLocal] ✅ Hybrid template response (${result.usage?.totalTokens ?? '?'} tokens)`);
                    return [
                        ...templateActions,
                        {
                            type: 'send_message',
                            conversationId: policyContext.conversationId,
                            content: followUpText,
                        },
                    ];
                }

                console.log(`[AsistentesLocal] ✅ Response (${result.usage?.totalTokens ?? '?'} tokens)`);
                return [{
                    type: 'send_message',
                    conversationId: policyContext.conversationId,
                    content: responseText,
                }];
            }

                if (round >= MAX_TOOL_ROUNDS) {
                    console.warn(`[AsistentesLocal] Max tool rounds reached, suppressing remaining tool calls`);
                    break;
                }

                // Append assistant message with tool_calls
                currentMessages = [
                    ...currentMessages,
                    { role: 'assistant', content: null, tool_calls: result.toolCalls },
                ];

                // Execute each tool call
                for (const toolCall of result.toolCalls) {
                    const toolResult = await capabilityLocalRuntimeToolsService.executeTool({
                        toolCall,
                        runtimeConfig,
                        authorizedContext,
                        allowedToolNames: effectiveTools,
                        deps: capabilityExecutionDeps,
                        executionContext: {
                            accountId: authorizedContext.accountId,
                            conversationId: authorizedContext.conversationId,
                            vectorStoreIds: runtimeConfig.vectorStoreIds,
                            authorizedTemplates: authorizedContext.authorizedTemplates,
                            userMessage: lastMessage.content,
                        },
                    });

                    // If send_template was called → return immediately as action
                    if (toolCall.function.name === 'send_template' && toolResult.templateAction) {
                        console.log(`[AsistentesLocal] ✅ Template queued: ${toolResult.templateAction.templateId}`);
                        queuedTemplateActions.push(toolResult.templateAction as SendTemplateAction);

                        // Terminar ejecución inmediatamente para evitar la bifurcación (enviar texto en el round posterior)
                        // y prevenir el error 400 bad request en Groq por turnos iterativos innecesarios.
                        return dedupeTemplateActions(queuedTemplateActions);
                    }

                    currentMessages = [
                        ...currentMessages,
                        {
                            role: 'tool',
                            content: toolResult.content,
                            tool_call_id: toolCall.id,
                        },
                    ];
                }
            }

            return queuedTemplateActions.length > 0
                ? dedupeTemplateActions(queuedTemplateActions)
                : [{
                    type: 'send_message',
                    conversationId: policyContext.conversationId,
                    content: 'Tengo algo de confusión con la información hasta ahora. ¿Podrías ser un poco más específico?'
                }];

        } catch (error: any) {
            console.error(`[AsistentesLocal] ❌ LLM call failed:`, error.message);
            return [{ type: 'no_action', reason: `LLM error: ${error.message}` }];
        }
    }

    private async evaluateTemplateIntents(params: {
        provider: 'groq' | 'openai';
        model: string;
        conversationContext: string;
        templates: AuthorizedTemplateDefinition[];
    }): Promise<{ matchedTemplateIds: string[], extractedIntent: string | null }> {
        const { provider, model, conversationContext, templates } = params;

        // Map templates to short aliases (T1, T2, etc.) to prevent LLM hallucination and save tokens
        const aliasToIdMap = new Map<string, string>();

        const templatesText = templates.map((t, index) => {
            const alias = `T${index + 1}`;
            aliasToIdMap.set(alias, t.templateId);
            return `- ID: ${alias}\n  Nombre: ${t.name}\n  Cuándo usarla: ${t.instructions ?? 'Coincidencia con intención'}`;
        }).join('\n\n');

        const systemPrompt = Prompts.buildRouterSystemPrompt(templatesText);

        console.log(`[AsistentesLocal] 📜 FASE 1 - PROMPT DE ENRUTAMIENTO (INTENT ROUTER):`);
        console.log(`----------------------------------------`);
        console.log(systemPrompt);
        console.log(`----------------------------------------`);
        console.log(`[AsistentesLocal] 📜 FASE 1 - CONTEXTO DEL USUARIO:\n${conversationContext}`);
        console.log(`----------------------------------------`);

        try {
            const capabilities = getModelCapabilities(model);

            const result = await llmClient.complete({
                provider,
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `HISTORIAL RECIENTE:\n${conversationContext}` }
                ],
                maxTokens: 150,
                temperature: 0.0,
                responseFormat: capabilities.supportsResponseFormat
                    ? { type: 'json_object' }
                    : undefined,
            });

            logLLMCompletion({ phase: 'intent_router', result, round: 0 });

            const text = result.content?.trim() ?? '{}';
            let parsed: any = { plantillas: [], intencion_busqueda: null };

            try {
                parsed = JSON.parse(text);
            } catch (e) {
                console.warn(`[IntentRouter] ⚠️ LlM returned invalid JSON: ${text}`);
            }

            const rawTemplates = Array.isArray(parsed.plantillas) ? parsed.plantillas : [];
            const intent = typeof parsed.intencion_busqueda === 'string' && parsed.intencion_busqueda.trim() !== ''
                ? parsed.intencion_busqueda.trim()
                : null;

            // Map short aliases back to true UUIDs
            const ids = rawTemplates
                .map(id => String(id).trim().toUpperCase())
                .filter(alias => aliasToIdMap.has(alias))
                .map(alias => aliasToIdMap.get(alias)!);

            return {
                matchedTemplateIds: ids,
                extractedIntent: intent
            };
        } catch (error: any) {
            console.error(`[IntentRouter] ⚠️ Fallo en el enrutamiento previo: ${error.message}`);
            return { matchedTemplateIds: [], extractedIntent: null };
        }
    }

    private async generateTemplateAwareFollowUp(params: {
        provider: 'groq' | 'openai';
        model: string;
        maxTokens: number;
        temperature: number;
        systemPrompt: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        lastUserMessage: string;
        residualText: string;
        templateFollowUpContext: TemplateFollowUpContext[];
    }): Promise<string | null> {
        const { provider, model, maxTokens, temperature, systemPrompt, messages, lastUserMessage, residualText, templateFollowUpContext } = params;

        if (templateFollowUpContext.some(template => template.renderedContent.includes('{{'))) {
            return null;
        }

        const templateContextText = templateFollowUpContext
            .map((template, index) => {
                return [
                    `Plantilla ${index + 1}: ${template.name} (ID: ${template.templateId})`,
                    `Contenido exacto enviado:`,
                    template.renderedContent,
                ].join('\n');
            })
            .join('\n\n');

        const residualFacts = summarizeResidualFacts(residualText);

        try {
            const followUpResult = await llmClient.complete({
                provider,
                model,
                messages: [
                    {
                        role: 'system',
                        content: [systemPrompt, Prompts.FOLLOW_UP_SYSTEM_DIRECTIVES].join('\n\n'),
                    },
                    ...messages,
                    {
                        role: 'assistant',
                        content: `En este turno ya se enviaron estas plantillas:\n\n${templateContextText}`,
                    },
                    {
                        role: 'user',
                        content: [
                            `Último mensaje del usuario:\n${lastUserMessage}`,
                            `Borrador residual interno a depurar:\n${residualText}`,
                            residualFacts ? `Datos estructurados detectados:\n${residualFacts}` : null,
                            'Genera solo un mensaje de seguimiento si aporta información útil que no esté ya cubierta por las plantillas. Si no hace falta enviar nada más, responde exactamente: NO_FOLLOW_UP.',
                        ].filter((section): section is string => !!section).join('\n\n'),
                    },
                ],
                maxTokens: Math.min(maxTokens, 256),
                temperature: Math.min(temperature, 0.2),
            });
            logLLMCompletion({ phase: 'template_follow_up', result: followUpResult });

            const followUpText = sanitizeFollowUpText(followUpResult.content);
            if (!followUpText) {
                return null;
            }

            const normalizedFollowUpText = followUpText.replace(/\s+/g, ' ').trim().toLowerCase();
            const duplicatesTemplateContent = templateFollowUpContext.some(template => {
                return template.renderedContent.replace(/\s+/g, ' ').trim().toLowerCase() === normalizedFollowUpText;
            });

            return duplicatesTemplateContent ? null : followUpText;
        } catch (error: any) {
            console.warn(`[AsistentesLocal] ⚠️ Follow-up generation skipped: ${error.message}`);
            return null;
        }
    }
}

export const asistentesLocalRuntime = new AsistentesLocalRuntime();

