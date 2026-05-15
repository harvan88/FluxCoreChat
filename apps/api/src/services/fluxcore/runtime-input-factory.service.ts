import type { ConversationMessage, FluxPolicyContext, RuntimeConfig } from '@fluxcore/db';
import type { AuthorizedRuntimeContext, RuntimeInput } from '../../core/fluxcore-types';
import { capabilityArgumentNormalizerService } from '../capability-argument-normalizer.service';
import { createCapabilityDeps } from '../capability-deps-factory.service';
import { createCapabilityExecutionService } from '../capability-execution.service';
import { capabilityOfferService } from '../capability-offer.service';

interface BuildRuntimeInputParams {
    accountId: string;
    conversationId: string;
    runtimeId: string;
    policyContext: FluxPolicyContext;
    runtimeConfig: RuntimeConfig;
    conversationHistory: ConversationMessage[];
    lastUserMessage?: string;
}

class RuntimeInputFactoryService {
    async build(params: BuildRuntimeInputParams): Promise<RuntimeInput> {
        const { accountId, conversationId, runtimeId, policyContext, runtimeConfig, conversationHistory, lastUserMessage } = params;

        // Proyección de la Realidad Física: Hora Actual según Zona Horaria de la Cuenta
        const now = new Date();
        let currentSystemTime: string;
        try {
            // Obtenemos la zona horaria de la cuenta, con fallback a UTC si no está configurada
            const accountTimezone = (policyContext.resolvedBusinessProfile as any).timezone || 'UTC';
            
            const dateStr = new Intl.DateTimeFormat('es-AR', {
                timeZone: accountTimezone,
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(now);

            const timeStr = new Intl.DateTimeFormat('es-AR', {
                timeZone: accountTimezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);
            
            const weekday = new Intl.DateTimeFormat('es-AR', {
                timeZone: accountTimezone,
                weekday: 'long'
            }).format(now);
            
            currentSystemTime = `Hoy es ${weekday}, ${dateStr}. La hora local actual en la zona de la cuenta es ${timeStr}.`;
        } catch (_err) {
            currentSystemTime = now.toISOString();
        }

        // 🎯 HIDRATACIÓN DETERMINISTA (v22.0)
        // Resolvemos variables {{system:*}} antes de que lleguen al cerebro cognitivo.
        // Esto permite que el Fast-Path detecte plantillas "estáticas" aunque tengan proyecciones dinámicas.
        const { templateService } = await import('../template.service');
        const resolvedBusinessProfile = JSON.parse(JSON.stringify(policyContext.resolvedBusinessProfile));
        
        if (resolvedBusinessProfile?.templates && Array.isArray(resolvedBusinessProfile.templates)) {
            for (const template of resolvedBusinessProfile.templates) {
                if (template.content) {
                    template.content = await templateService.resolveSystemVariables(template.content, accountId);
                }
                if (template.instructions) {
                    template.instructions = await templateService.resolveSystemVariables(template.instructions, accountId);
                }
            }
        }

        const authorizedContext: AuthorizedRuntimeContext = {
            accountId,
            conversationId,
            channel: policyContext.channel,
            businessProfile: resolvedBusinessProfile,
            contactRules: policyContext.contactRules,
            authorizedTemplates: policyContext.authorizedTemplates,
            instructions: runtimeConfig.instructions,
            systemClock: policyContext.resolvedBusinessProfile.aiIncludeTimestamp !== false ? currentSystemTime : undefined,
            responder: {
                runtimeId,
                assistantId: runtimeConfig.assistantId,
                assistantName: runtimeConfig.assistantName,
            },
            activeWork: policyContext.activeWork,
            workDefinitions: runtimeConfig.workDefinitions ?? policyContext.workDefinitions,
        };

        const capabilityOfferParams = {
            runtimeConfig,
            authorizedContext,
        };

        const capabilityExecution = createCapabilityExecutionService(createCapabilityDeps({
            enableTemplateSend: false,
        }));

        return {
            policyContext,
            authorizedContext,
            runtimeConfig,
            conversationHistory,
            services: {
                getAvailableTools: async () => capabilityOfferService.getToolIdsForExecution(capabilityOfferParams),
                executeTool: async (toolId: string, toolParams: any) => {
                    const capabilityOffer = capabilityOfferService.getOfferForExecution(toolId, capabilityOfferParams);

                    if (!capabilityOffer) {
                        return {
                            outcome: 'error',
                            message: `Tool ${toolId} is not authorized`,
                        };
                    }

                    if (capabilityOffer.executionMode === 'declarative_action') {
                        const normalizedToolParams = capabilityArgumentNormalizerService.normalizeToolArguments(toolId, toolParams);
                        const templateId = normalizedToolParams?.templateId;
                        if (typeof templateId !== 'string' || templateId.trim().length === 0) {
                            return {
                                outcome: 'error',
                                message: 'templateId is required',
                            };
                        }

                        if (!authorizedContext.authorizedTemplates.includes(templateId)) {
                            return {
                                outcome: 'error',
                                message: `Template ${templateId} is not authorized`,
                            };
                        }

                        return {
                            outcome: 'success',
                            data: {
                                action: {
                                    type: 'send_template',
                                    templateId,
                                    conversationId,
                                    variables: normalizedToolParams?.variables ?? {},
                                },
                            },
                        };
                    }

                    return capabilityExecution.executeTool(
                        toolId,
                        capabilityArgumentNormalizerService.normalizeToolArguments(toolId, toolParams, {
                            fallbackQuery: lastUserMessage ?? '',
                        }),
                        {
                        accountId,
                        conversationId,
                        userMessage: lastUserMessage ?? '',
                        vectorStoreIds: runtimeConfig.vectorStoreIds,
                        authorizedTemplates: authorizedContext.authorizedTemplates,
                        }
                    );
                },
                getToolDefinition: async (toolId: string) => capabilityOfferService.getToolDefinitionForExecution(toolId, capabilityOfferParams),
                isAuthorized: async (toolId: string) => capabilityOfferService.isAuthorizedForExecution(toolId, capabilityOfferParams),
            },
        };
    }
}

export const runtimeInputFactoryService = new RuntimeInputFactoryService();
