/**
 * AsistentesLocalRuntime — FluxCore v8.3
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

const MAX_TOOL_ROUNDS = 2;
const ASISTENTES_LOCAL_TOOL_NAMES = ['search_knowledge'];

type AuthorizedTemplateDefinition = {
    templateId: string;
    name: string;
    content?: string;
};

type ParsedTemplateResponse = {
    foundTemplateMarker: boolean;
    templateActions: SendTemplateAction[];
    residualText: string | null;
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
}): ParsedTemplateResponse {
    const { responseText, conversationId, authorizedTemplateIds } = params;
    const markerRegex = /CALL_TEMPLATE:\s*([a-f\d-]+)/ig;
    const authorizedTemplateSet = new Set(authorizedTemplateIds);
    const templateActions: SendTemplateAction[] = [];
    const rangesToRemove: Array<{ start: number; end: number }> = [];
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
            continue;
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
    };
}

function getAuthorizedTemplateDefinitions(authorizedContext: RuntimeInput['authorizedContext']): AuthorizedTemplateDefinition[] {
    const templates = (authorizedContext.businessProfile as { templates?: unknown }).templates;
    if (!Array.isArray(templates)) {
        return [];
    }

    return templates
        .filter((template): template is AuthorizedTemplateDefinition => {
            return !!template && typeof template === 'object' && typeof (template as AuthorizedTemplateDefinition).templateId === 'string';
        })
        .map(template => ({
            templateId: template.templateId,
            name: typeof template.name === 'string' && template.name.trim().length > 0 ? template.name : template.templateId,
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
    phase: 'main' | 'template_follow_up';
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
    readonly displayName = 'Asistentes Local (v8.3)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, authorizedContext, runtimeConfig, conversationHistory } = input;

        // 1. Guard: mode gate
        if (policyContext.mode === 'off') {
            return [{ type: 'no_action', reason: 'Automation mode is off' }];
        }

        // 2. Guard: loop prevention
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastMessage) return [{ type: 'no_action', reason: 'No messages in conversation' }];
        if (lastMessage.role === 'assistant' || lastMessage.role === 'system') {
            return [{ type: 'no_action', reason: 'Loop prevention: last message is not from user' }];
        }

        const provider = (runtimeConfig.provider ?? 'groq') as 'groq' | 'openai';
        const model = runtimeConfig.model ?? 'llama-3.1-8b-instant';
        const maxTokens = runtimeConfig.maxTokens ?? 1024;
        const temperature = runtimeConfig.temperature ?? 0.7;

        // 3. Build prompt
        const { systemPrompt, messages } = promptBuilder.build({
            policyContext,
            authorizedContext,
            runtimeConfig,
            conversationHistory,
        });

        console.log(`[AsistentesLocal] 📜 SYSTEM PROMPT DEBUG:`);
        console.log(`----------------------------------------`);
        console.log(systemPrompt);
        console.log(`----------------------------------------`);

        // 4. Decide which tools to offer
        const tools = capabilityLocalRuntimeToolsService.listTools({
            runtimeConfig,
            authorizedContext,
            allowedToolNames: ASISTENTES_LOCAL_TOOL_NAMES,
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

        try {
            for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
                const result = await llmClient.complete({
                    provider,
                    model,
                    messages: currentMessages,
                    maxTokens,
                    temperature,
                    tools: tools.length > 0 ? tools : undefined,
                    toolChoice: tools.length > 0 ? 'auto' : undefined,
                });
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
                    });

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
                        if (templateFollowUpContext.length !== templateActions.length) {
                            console.warn(`[AsistentesLocal] ⚠️ Skipping follow-up generation because exact template content is unavailable`);
                            return templateActions;
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

                    if (parsedTemplateResponse.foundTemplateMarker) {
                        const safeResidualText = sanitizeFollowUpText(parsedTemplateResponse.residualText);
                        if (!safeResidualText) {
                            return [{ type: 'no_action', reason: 'Template marker response produced no safe user-facing text' }];
                        }

                        console.log(`[AsistentesLocal] ✅ Cleaned marker response (${result.usage?.totalTokens ?? '?'} tokens)`);
                        return [{
                            type: 'send_message',
                            conversationId: policyContext.conversationId,
                            content: safeResidualText,
                        }];
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
                        allowedToolNames: ASISTENTES_LOCAL_TOOL_NAMES,
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
                : [{ type: 'no_action', reason: 'Tool loop exhausted without final response' }];

        } catch (error: any) {
            console.error(`[AsistentesLocal] ❌ LLM call failed:`, error.message);
            return [{ type: 'no_action', reason: `LLM error: ${error.message}` }];
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
                        content: [
                            systemPrompt,
                            '## Directiva de Seguimiento Post-Plantilla',
                            '- En este turno ya se enviaron una o más plantillas al usuario.',
                            '- Usa como fuente de verdad el contenido exacto de las plantillas ya enviadas.',
                            '- Genera como máximo un único mensaje breve de seguimiento.',
                            '- Nunca repitas, contradigas o reformules información ya cubierta por las plantillas.',
                            '- Nunca menciones IDs, JSON, marcadores técnicos ni procesos internos.',
                            '- Si no existe información adicional segura y útil para enviar, responde exactamente: NO_FOLLOW_UP.',
                        ].join('\n'),
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

