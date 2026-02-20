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
import type { LLMMessage, LLMTool, LLMToolCall } from '../llm-client.service';
import { promptBuilder } from '../prompt-builder.service';
import { llmClient } from '../llm-client.service';

const MAX_TOOL_ROUNDS = 2;
const API_PORT = process.env.PORT || 3000;

// ─── Tool definitions ───────────────────────────────────────────────────────

const SEARCH_KNOWLEDGE_TOOL: LLMTool = {
    type: 'function',
    function: {
        name: 'search_knowledge',
        description: 'Search the knowledge base for relevant information to answer the user\'s question. Use this when the user asks something that may be in the business\'s documentation, catalog, or FAQs.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query, formulated as a question or topic based on the user\'s message.',
                },
            },
            required: ['query'],
        },
    },
};

const SEND_TEMPLATE_TOOL: LLMTool = {
    type: 'function',
    function: {
        name: 'send_template',
        description: 'Send a predefined message template to the user instead of a free-text response. Use this when a greeting, promotional, or procedural template is more appropriate than a custom response.',
        parameters: {
            type: 'object',
            properties: {
                templateId: {
                    type: 'string',
                    description: 'The ID of the template to send.',
                },
                variables: {
                    type: 'object',
                    description: 'Optional variable values for the template placeholders.',
                    additionalProperties: { type: 'string' },
                },
            },
            required: ['templateId'],
        },
    },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TemplateAction {
    type: 'send_template';
    templateId: string;
    conversationId: string;
    variables: Record<string, string>;
}

// ─── Runtime ────────────────────────────────────────────────────────────────

export class AsistentesLocalRuntime implements RuntimeAdapter {
    readonly runtimeId = 'asistentes-local';
    readonly displayName = 'Asistentes Local (v8.3)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;

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
        const hasRAG = (runtimeConfig.vectorStoreIds?.length ?? 0) > 0;
        const hasTemplates = policyContext.authorizedTemplates.length > 0;

        // 3. Build prompt
        const { systemPrompt, messages } = promptBuilder.build({
            policyContext,
            runtimeConfig,
            conversationHistory,
        });

        // 4. Decide which tools to offer
        const tools: LLMTool[] = [];
        if (hasRAG) tools.push(SEARCH_KNOWLEDGE_TOOL);
        if (hasTemplates) tools.push(SEND_TEMPLATE_TOOL);

        console.log(`[AsistentesLocal] → ${provider}/${model} | RAG:${hasRAG} Templates:${hasTemplates} | account:${policyContext.accountId}`);

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
                    const toolResult = await this.executeTool(toolCall, {
                        accountId: policyContext.accountId,
                        conversationId: policyContext.conversationId,
                        vectorStoreIds: runtimeConfig.vectorStoreIds,
                        authorizedTemplates: policyContext.authorizedTemplates,
                        userMessage: lastMessage.content,
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

    // ─── Tool executors ──────────────────────────────────────────────────────

    private async executeTool(
        toolCall: LLMToolCall,
        ctx: {
            accountId: string;
            conversationId: string;
            vectorStoreIds?: string[];
            authorizedTemplates: string[];
            userMessage: string;
        }
    ): Promise<{ content: string; templateAction?: TemplateAction }> {
        const name = toolCall.function.name;
        let args: Record<string, any> = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { /* ignored */ }

        if (name === 'search_knowledge') {
            return this.executeSearchKnowledge(args.query ?? ctx.userMessage, ctx.accountId, ctx.vectorStoreIds);
        }

        if (name === 'send_template') {
            return this.executeSendTemplate(args, ctx);
        }

        return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }

    private async executeSearchKnowledge(
        query: string,
        accountId: string,
        vectorStoreIds?: string[]
    ): Promise<{ content: string }> {
        try {
            const response = await fetch(`http://localhost:${API_PORT}/fluxcore/runtime/rag-context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, query, vectorStoreIds, options: { topK: 5, maxTokens: 2000 } }),
            });

            if (!response.ok) {
                return { content: JSON.stringify({ error: 'Knowledge base unavailable' }) };
            }

            const data = await response.json() as any;
            if (data.success && data.data?.context) {
                console.log(`[AsistentesLocal] RAG: ${data.data.chunksUsed ?? '?'} chunks for query: "${query}"`);
                return { content: data.data.context };
            }
            return { content: JSON.stringify({ message: 'No relevant information found' }) };
        } catch (err: any) {
            console.warn(`[AsistentesLocal] RAG fetch failed:`, err.message);
            return { content: JSON.stringify({ error: 'Knowledge base error' }) };
        }
    }

    private async executeSendTemplate(
        args: { templateId?: string; variables?: Record<string, string> },
        ctx: { conversationId: string; authorizedTemplates: string[] }
    ): Promise<{ content: string; templateAction?: TemplateAction }> {
        const templateId = args.templateId;
        if (!templateId) {
            return { content: JSON.stringify({ error: 'templateId is required' }) };
        }

        if (!ctx.authorizedTemplates.includes(templateId)) {
            return { content: JSON.stringify({ error: `Template ${templateId} is not authorized` }) };
        }

        return {
            content: JSON.stringify({ status: 'queued', templateId }),
            templateAction: {
                type: 'send_template',
                templateId,
                conversationId: ctx.conversationId,
                variables: args.variables ?? {},
            },
        };
    }
}

export const asistentesLocalRuntime = new AsistentesLocalRuntime();

