import type { MessageContent } from '@fluxcore/db';
import type { FluxPolicyContext } from '@fluxcore/db';
import type { MessageEnvelope } from '../core/types';
import { runtimeConfigService } from './runtime-config.service';

// Adapters
import { FluxCoreRuntimeAdapter } from './runtimes/fluxcore-runtime.adapter';
// H7: AgentRuntimeAdapter removed — dead code. v8.2 pipeline uses fluxcore/runtime-gateway.service.ts
// import { AgentRuntimeAdapter } from './runtimes/agent-runtime.adapter';

type TemplateResource = FluxPolicyContext['resources']['templates'][number];

const HUMAN_GREETING_PATTERNS = [
    'hola',
    'buen dia',
    'buenos dias',
    'buenas',
    'buenas tardes',
    'buenas noches',
    'hello',
    'hi',
    'hey',
    'que tal',
    'saludos',
];

const TEMPLATE_GREETING_KEYWORDS = ['saludo', 'bienvenida', 'bienvenido', 'bienvenidos', 'presentación', 'primera respuesta'];

export type ExecutionAction =
    | {
          type: 'send_message';
          payload: {
              conversationId: string;
              senderAccountId: string;
              targetAccountId?: string;
              content: MessageContent;
              generatedBy: 'ai' | 'system';
          };
      }
    | {
          type: 'broadcast_event';
          payload: {
              conversationId: string;
              event: {
                  type: string;
                  data?: Record<string, any>;
              };
          };
      }
    | {
          type: 'propose_work';
          payload: {
              accountId: string;
              conversationId: string;
              proposal: {
                  workDefinitionId: string;
                  intent: string;
                  candidateSlots: Array<{ path: string; value: any; evidence: string }>;
                  confidence: number;
                  traceId: string;
                  modelInfo?: { model?: string; provider?: string };
              };
              openWork?: boolean;
          };
      }
    | {
          type: 'send_template';
          payload: {
              accountId: string;
              conversationId: string;
              templateId: string;
              variables?: Record<string, string>;
          };
      }
    | { type: 'no_action' };

export interface ExecutionResult {
    actions: ExecutionAction[];
}

export interface RuntimeHandleInput {
    envelope: MessageEnvelope;
    policyContext: FluxPolicyContext;
}

export interface RuntimeAdapter {
    handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult>;
}

const NO_ACTION_RESULT: ExecutionResult = { actions: [{ type: 'no_action' }] };

class EchoRuntime implements RuntimeAdapter {
    async handleMessage({ envelope, policyContext }: RuntimeHandleInput): Promise<ExecutionResult> {
        // Prevent loops: never respond to AI/system generated messages.
        if (envelope.generatedBy && envelope.generatedBy !== 'human') {
            return NO_ACTION_RESULT;
        }

        const responderAccountId = envelope.targetAccountId;
        if (!responderAccountId) {
            // Sin cuenta receptora no podemos responder.
            return NO_ACTION_RESULT;
        }

        const textContent = this.extractTextContent(envelope);
        if (textContent && this.isGreeting(textContent)) {
            const templateAction = this.buildGreetingTemplateAction({
                accountId: responderAccountId,
                policyContext,
                conversationId: envelope.conversationId,
            });

            if (templateAction) {
                return { actions: [templateAction] };
            }
        }

        return this.buildEchoAction({ envelope, policyContext, responderAccountId });
    }

    private extractTextContent(envelope: MessageEnvelope): string {
        const text = envelope.content?.text;
        return typeof text === 'string' ? text : '';
    }

    private isGreeting(text: string): boolean {
        const normalized = text
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^\p{L}\s]/gu, '')
            .normalize('NFC');

        if (!normalized) {
            return false;
        }

        return HUMAN_GREETING_PATTERNS.some(pattern => normalized.startsWith(pattern));
    }

    private buildGreetingTemplateAction(params: {
        accountId: string;
        policyContext: FluxPolicyContext;
        conversationId: string;
    }): ExecutionAction | null {
        const templates = this.getUsableTemplates(params.policyContext);
        if (templates.length === 0) {
            return null;
        }

        const preferred = this.selectGreetingTemplate(templates);
        if (!preferred) {
            return null;
        }

        return {
            type: 'send_template',
            payload: {
                accountId: params.accountId,
                conversationId: params.conversationId,
                templateId: preferred.templateId,
            },
        };
    }

    private getUsableTemplates(policyContext: FluxPolicyContext): TemplateResource[] {
        const resources = policyContext.resources ?? {
            kind: 'resources',
            templates: policyContext.knowledge.templates,
            appointmentServices: policyContext.knowledge.appointmentServices,
            handoffs: [],
        };

        return (resources.templates || []).filter(template =>
            Array.isArray(template.variables)
                ? template.variables.every(variable => !variable?.required)
                : true,
        );
    }

    private selectGreetingTemplate(templates: TemplateResource[]): TemplateResource | null {
        if (templates.length === 0) {
            return null;
        }

        const candidates = templates.filter(template => this.templateMatchesGreetingIntent(template));
        return candidates[0] || templates[0];
    }

    private templateMatchesGreetingIntent(template: TemplateResource): boolean {
        const haystack = `${template.name ?? ''} ${template.instructions ?? ''}`.toLowerCase();
        return TEMPLATE_GREETING_KEYWORDS.some(keyword => haystack.includes(keyword));
    }

    private buildEchoAction(params: {
        envelope: MessageEnvelope;
        policyContext: FluxPolicyContext;
        responderAccountId: string;
    }): ExecutionResult {
        const { envelope, policyContext, responderAccountId } = params;
        const businessName = policyContext.business.displayName || 'FluxCore';
        const textContent = this.extractTextContent(envelope);
        const reply = textContent
            ? `Hola, habla ${businessName}. Recibí tu mensaje: "${textContent}"`
            : `Hola, habla ${businessName}. Estoy listo para ayudarte.`;

        return {
            actions: [
                {
                    type: 'send_message',
                    payload: {
                        conversationId: envelope.conversationId,
                        senderAccountId: responderAccountId,
                        targetAccountId: envelope.senderAccountId,
                        generatedBy: 'ai',
                        content: {
                            text: reply,
                        },
                    },
                },
            ],
        };
    }
}

class RuntimeGatewayService {
    private registry: Map<string, RuntimeAdapter> = new Map();

    constructor() {
        // Register default/fallback runtime
        this.registerRuntime('echo', new EchoRuntime());
        
        // Register Core Runtimes
        this.registerRuntime('@fluxcore/asistentes', new FluxCoreRuntimeAdapter());
        // H7: @fluxcore/agents removed — AgentRuntimeAdapter is dead code.
        // The v8.2 FluxiRuntime (fluxi-runtime) replaces it via fluxcore/runtime-gateway.service.ts
    }

    registerRuntime(id: string, adapter: RuntimeAdapter): void {
        this.registry.set(id, adapter);
        console.log(`[RuntimeGateway] Registered runtime: ${id}`);
    }

    async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult> {
        const { envelope } = input;
        const targetAccountId = envelope.targetAccountId;

        if (!targetAccountId) {
            console.warn('[RuntimeGateway] No targetAccountId, cannot resolve runtime.');
            return NO_ACTION_RESULT;
        }

        // 1. Determine active runtime for this account
        const { activeRuntimeId } = await runtimeConfigService.getRuntime(targetAccountId);

        // 2. Resolve adapter
        let adapter = this.registry.get(activeRuntimeId);
        console.log(`[Diag][RuntimeGateway] message=${envelope.id} runtime=${activeRuntimeId} decision=resolve stage=runtime_select target=${targetAccountId}`);

        // Fallback to echo if configured runtime is missing (or not yet implemented)
        if (!adapter) {
            console.warn(`[RuntimeGateway] Runtime '${activeRuntimeId}' not found in registry. Falling back to 'echo'.`);
            adapter = this.registry.get('echo');
            console.log(`[Diag][RuntimeGateway] message=${envelope.id} runtime=echo decision=fallback stage=runtime_select target=${targetAccountId}`);
        }

        if (!adapter) {
             console.error('[RuntimeGateway] CRITICAL: No runtimes available (even echo is missing).');
             return NO_ACTION_RESULT;
        }

        try {
            console.log(`[RuntimeGateway] Delegating message ${envelope.id} to runtime '${activeRuntimeId}' (Adapter: ${adapter.constructor.name})`);
            console.log(`[Diag][RuntimeInvoke] message=${envelope.id} runtime=${activeRuntimeId} decision=respond stage=runtime_invoke target=${targetAccountId}`);
            const result = await adapter.handleMessage(input);
            if (!result || !Array.isArray(result.actions)) {
                return NO_ACTION_RESULT;
            }
            console.log(`[Diag][RuntimeInvoke] message=${envelope.id} runtime=${activeRuntimeId} decision=respond stage=runtime_complete actions=${result.actions.length}`);
            return result;
        } catch (error) {
            console.error(`[RuntimeGateway] Runtime execution failed (Runtime: ${activeRuntimeId}):`, error);
            console.log(`[Diag][RuntimeInvoke] message=${envelope.id} runtime=${activeRuntimeId} decision=error stage=runtime_complete error=${(error as Error)?.message}`);
            return NO_ACTION_RESULT;
        }
    }
}

export const runtimeGateway = new RuntimeGatewayService();
