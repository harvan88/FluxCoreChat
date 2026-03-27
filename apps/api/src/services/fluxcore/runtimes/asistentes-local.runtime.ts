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

import type { RuntimeAdapter, RuntimeInput, ExecutionAction } from '../../../core/fluxcore-types';
import type { LLMMessage } from '../llm-client.service';
import { createCapabilityDeps } from '../../capability-deps-factory.service';
import { capabilityLocalRuntimeToolsService } from '../../capability-local-runtime-tools.service';
import { promptBuilder } from '../prompt-builder.service';
import { llmClient } from '../llm-client.service';

const MAX_TOOL_ROUNDS = 2;
const ASISTENTES_LOCAL_TOOL_NAMES = ['search_knowledge', 'send_template'];

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

                // No tool calls — final text response
                if (!result.toolCalls || result.toolCalls.length === 0) {
                    const responseText = result.content?.trim();
                    if (!responseText) {
                        return [{ type: 'no_action', reason: 'LLM returned empty response' }];
                    }

                    // 🔍 COGNITIVE BRIDGE: Detect automatic template call marker
                    // Pattern: CALL_TEMPLATE:<templateId> [JSON_PARAMS]
                    const templateMatch = responseText.match(/CALL_TEMPLATE:([a-f\d-]+)(?:\s+({.*}))?/i);
                    if (templateMatch) {
                        const templateId = templateMatch[1];
                        const rawParams = templateMatch[2];
                        let variables = {};

                        if (rawParams) {
                            try { variables = JSON.parse(rawParams); } catch (e) {}
                        }

                        // Security: Only allow if authorized in this turn
                        if (authorizedContext.authorizedTemplates.includes(templateId)) {
                            console.log(`[AsistentesLocal] 🪄 Transmuted marker to action: send_template(${templateId})`);
                            return [{
                                type: 'send_template',
                                templateId,
                                conversationId: policyContext.conversationId,
                                variables,
                            } as ExecutionAction];
                        } else {
                            console.warn(`[AsistentesLocal] ⚠️ IA tried to call unauthorized template: ${templateId}`);
                        }
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
                        console.log(`[AsistentesLocal] ✅ Template sent: ${toolResult.templateAction.templateId}`);
                        return [toolResult.templateAction as ExecutionAction];
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

            return [{ type: 'no_action', reason: 'Tool loop exhausted without final response' }];

        } catch (error: any) {
            console.error(`[AsistentesLocal] ❌ LLM call failed:`, error.message);
            return [{ type: 'no_action', reason: `LLM error: ${error.message}` }];
        }
    }
}

export const asistentesLocalRuntime = new AsistentesLocalRuntime();

