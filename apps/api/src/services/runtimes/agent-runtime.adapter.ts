/**
 * @deprecated H7 — AgentRuntimeAdapter is dead code.
 * Replaced by FluxiRuntime (apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts)
 * in the v8.2 pipeline. Safe to delete once legacy runtime-gateway.service.ts is decommissioned.
 */
import { flowRegistryService } from '../agent-runtime/flow-registry';
import { executeFlow } from '../agent-runtime/engine';
import type { ExecutorDependencies } from '../agent-runtime/agent-types';
import type { RuntimeAdapter, RuntimeHandleInput, ExecutionResult, ExecutionAction } from '../runtime-gateway.service';
import { aiService } from '../ai.service';
import { retrievalService } from '../retrieval.service';
import { aiToolService } from '../ai-tools.service';
import { runtimeConfigService } from '../runtime-config.service';

export class AgentRuntimeAdapter implements RuntimeAdapter {
    async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult> {
        const { envelope } = input;
        const targetAccountId = envelope.targetAccountId;

        if (!targetAccountId) {
            return { actions: [{ type: 'no_action' }] };
        }

        // Prevent loops
        if (envelope.generatedBy && envelope.generatedBy !== 'human') {
            return { actions: [{ type: 'no_action' }] };
        }

        // 1. Resolve Agent
        // Try to get agentId from runtime config
        const runtimeConfig = await runtimeConfigService.getRuntime(targetAccountId);
        let agentId = (runtimeConfig.config as any)?.agentId;

        // Fallback: look for any active agent
        if (!agentId) {
            const activeAgents = await flowRegistryService.getActiveAgents(targetAccountId);
            if (activeAgents.length > 0) {
                agentId = activeAgents[0].id;
            }
        }

        if (!agentId) {
            console.warn(`[AgentRuntime] No active agent found for account ${targetAccountId}`);
            return { actions: [{ type: 'no_action' }] };
        }

        const agent = await flowRegistryService.getAgent(targetAccountId, agentId);
        if (!agent || !agent.flow) {
             console.warn(`[AgentRuntime] Agent ${agentId} not found or has no flow`);
             return { actions: [{ type: 'no_action' }] };
        }

        // 2. Build Dependencies
        const accountConfig = await aiService.getAccountConfig(targetAccountId);

        const deps: ExecutorDependencies = {
            accountId: targetAccountId,
            providerOrder: accountConfig.providerOrder || [],
            
            callLLM: async (params) => {
                return await aiService.complete(params);
            },

            searchKnowledge: async (params) => {
                // Map params to retrieval service
                const result = await retrievalService.search(
                    params.query,
                    params.vectorStoreIds,
                    params.accountId,
                    {
                        topK: params.topK,
                        minScore: params.minScore
                    }
                );
                return {
                    chunks: result.chunks.map(c => ({
                        content: c.content,
                        score: c.similarity,
                        source: c.metadata?.documentTitle
                    })),
                    totalTokens: result.totalTokens
                };
            },

            executeTool: async (params) => {
                 // Adapt to aiToolService signature
                 // ToolCall expectations in aiToolService are specific (OpenAI style)
                 const output = await aiToolService.executeTool(
                     {
                         id: 'agent-call-' + Date.now(),
                         type: 'function',
                         function: {
                             name: params.toolName,
                             arguments: JSON.stringify(params.input)
                         }
                     },
                     {
                         accountId: params.accountId,
                         conversationId: envelope.conversationId
                     }
                 );
                 
                 // aiToolService returns a JSON string, usually.
                 try {
                     return { output: JSON.parse(output) };
                 } catch {
                     return { output };
                 }
            }
        };

        // 3. Prepare Trigger Data
        const trigger = {
            type: 'message_received' as const,
            content: typeof envelope.content?.text === 'string' ? envelope.content.text : '',
            messageId: envelope.id,
            conversationId: envelope.conversationId,
            senderAccountId: envelope.senderAccountId,
            recipientAccountId: targetAccountId,
            metadata: {
                timestamp: envelope.timestamp
            }
        };

        // 4. Execute Flow
        try {
            const result = await executeFlow(
                agent.flow,
                agent.scopes || { allowedModels: [], allowedTools: [], maxTotalTokens: 5000, maxExecutionTimeMs: 30000, canCreateSubAgents: false },
                trigger,
                deps,
                {
                    agentId: agent.id,
                    flowName: agent.name
                }
            );

            if (!result.success) {
                console.error(`[AgentRuntime] Flow execution failed: ${result.error}`);
                return { actions: [{ type: 'no_action' }] };
            }

            // 5. Map Output to Actions
            const actions: ExecutionAction[] = [];

            if (result.output) {
                if (typeof result.output === 'string') {
                    actions.push({
                        type: 'send_message',
                        payload: {
                             conversationId: envelope.conversationId,
                             senderAccountId: targetAccountId,
                             targetAccountId: envelope.senderAccountId,
                             content: { text: result.output },
                             generatedBy: 'ai'
                        }
                    });
                } else if (typeof result.output === 'object') {
                    // Check if it looks like an action
                    if (result.output.type === 'send_message' || result.output.type === 'send_template') {
                        actions.push(result.output as ExecutionAction);
                    } else if (result.output.content) {
                        // Fallback: object has content field
                         actions.push({
                            type: 'send_message',
                            payload: {
                                 conversationId: envelope.conversationId,
                                 senderAccountId: targetAccountId,
                                 targetAccountId: envelope.senderAccountId,
                                 content: { text: result.output.content },
                                 generatedBy: 'ai'
                            }
                        });
                    }
                }
            }

            if (actions.length === 0) {
                 return { actions: [{ type: 'no_action' }] };
            }

            return { actions };

        } catch (error) {
            console.error('[AgentRuntime] Unexpected error:', error);
            return { actions: [{ type: 'no_action' }] };
        }
    }
}
