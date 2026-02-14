/**
 * @fluxcore/asistentes-openai
 * 
 * Cognitive Runtime delegated to OpenAI Assistants API.
 * Canon v7.0: Section 4.3 - Runtimes Paralelos
 */

import { runAssistantWithMessages } from '../../../apps/api/src/services/openai-sync.service';
import { buildExtraInstructions } from '../../fluxcore-asistentes/src/prompt-utils';
import type { FluxPolicyContext } from '@fluxcore/db';

export interface MessageEvent {
    messageId: string;
    conversationId: string;
    senderAccountId: string;
    recipientAccountId: string;
    content: string;
    messageType: string;
    createdAt: Date;
}

export class OpenAIAssistantsRuntime {
    public readonly id = '@fluxcore/asistentes-openai';

    /**
     * Hook: Recibir mensaje
     * Delegate to generation if conditions are met.
     */
    async onMessage(params: any): Promise<any> {
        const { accountId, conversationId, message, policyContext } = params;

        // Only process if this runtime is active
        if (policyContext?.activeRuntimeId !== this.id) {
            return { handled: false };
        }

        // Logic for auto-reply would go here, but for now we primarily 
        // export the execution capability for AIOrchestrator to call via ExtensionHost.
        return { handled: false };
    }

    /**
     * Execute the OpenAI Assistants path.
     * Moved from ai.service.ts
     */
    async generateResponse(params: {
        plan: any;
        context: any;
        event: MessageEvent;
        lastMessageContent: string;
        options: { traceId?: string; mode?: string; policyContext?: FluxPolicyContext };
    }): Promise<any> {
        const { plan, context, event, lastMessageContent, options } = params;
        const { composition } = plan;
        const externalId = plan.externalId!;

        // Build thread messages from context
        const threadMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        if (Array.isArray((context as any)?.messages)) {
            for (const msg of (context as any).messages) {
                const role = msg.senderAccountId === plan.accountId ? 'assistant' : 'user';
                const ts = msg.createdAt instanceof Date
                    ? msg.createdAt.toISOString()
                    : new Date(msg.createdAt as any).toISOString();
                const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
                const alreadyPrefixed = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(content);
                threadMessages.push({
                    role,
                    content: alreadyPrefixed ? content : `[${ts}] ${content}`,
                });
            }
        }

        // Append current message if not in history
        const currentTs = event.createdAt instanceof Date
            ? event.createdAt.toISOString()
            : new Date(event.createdAt as any).toISOString();
        const currentContent = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(lastMessageContent)
            ? lastMessageContent
            : `[${currentTs}] ${lastMessageContent}`;

        const currentMsgInHistory = threadMessages.some((m) =>
            m.content.includes(lastMessageContent) || lastMessageContent.includes(m.content)
        );
        if (!currentMsgInHistory) {
            threadMessages.push({ role: 'user', content: currentContent });
        }

        // Build consolidated system prompt (instructions + knowledge/tool directives)
        const hasKnowledgeBase = Array.isArray(composition.vectorStores) && composition.vectorStores.length > 0;
        const extraInstructions = buildExtraInstructions({
            instructions: composition.instructions,
            includeSearchKnowledge: hasKnowledgeBase,
        });

        const systemPromptSections: string[] = [];
        if (extraInstructions.length > 0) {
            systemPromptSections.push(extraInstructions.join('\n\n'));
        } else {
            systemPromptSections.push('Instrucciones gestionadas en OpenAI Assistants.');
        }

        // Canon v7.0: Style policies
        if (options.policyContext) {
            const { attention } = options.policyContext;
            systemPromptSections.push('\n### Guías de Estilo (Políticas):');
            systemPromptSections.push(`- Tono de voz: ${attention.tone}`);
            systemPromptSections.push(`- Tratamiento al usuario: ${attention.formality}`);
            systemPromptSections.push(`- Uso de emojis: ${attention.useEmojis ? 'Permitido' : 'Prohibido'}`);
            systemPromptSections.push(`- Idioma: ${attention.language}`);
        }

        systemPromptSections.push(`assistantExternalId: ${externalId}`);
        const systemPromptText = systemPromptSections.join('\n\n');

        // Load tools from Host (via dynamic import for now, eventually via registry)
        const { aiToolService: toolService } = await import('../../../apps/api/src/services/ai-tools.service');
        const runtimeTools = toolService.getTools();

        // Execute
        const result = await runAssistantWithMessages({
            assistantExternalId: externalId,
            messages: threadMessages,
            instructions: systemPromptText,
            tools: runtimeTools,
            traceId: options.traceId,
            accountId: plan.accountId,
            conversationId: plan.conversationId,
        });

        if (!result.success) {
            throw new Error(result.error || 'OpenAI Assistant run failed');
        }

        return {
            id: crypto.randomUUID(),
            conversationId: plan.conversationId,
            content: result.content,
            generatedAt: new Date(),
            model: plan.model,
            provider: 'openai',
            usage: result.usage,
            status: 'pending',
            traceId: options.traceId,
        };
    }
}

export const asistentesOpenAIRuntime = new OpenAIAssistantsRuntime();
export const getFluxCore = () => asistentesOpenAIRuntime;
