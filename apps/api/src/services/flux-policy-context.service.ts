/**
 * FluxPolicyContextService — Canon v8.3
 *
 * Resolves the flat FluxPolicyContext BEFORE any runtime is invoked.
 * Returns ONLY business governance — no LLM config, no technical runtime details.
 *
 * Canon §4.3: "PolicyContext contains the business governance decisions."
 * Canon §4.4: "PolicyContext = HOW and WHEN. RuntimeConfig = WHAT the runtime uses."
 *
 * Data sources:
 *   - ChatCore: account profile, relationship notes (exist without AI)
 *   - FluxCore config: tone, mode, windows, contact rules (AI-specific governance)
 */

import { coreEventBus } from '../core/events';
import { 
    db, 
    relationships, 
    accounts, 
    templates, 
    fluxcoreToolDefinitions, 
    fluxcoreToolConnections,
    accountLocations
} from '@fluxcore/db';
import { sql, eq, and, inArray, desc } from 'drizzle-orm';
import type { FluxPolicyContext, RuntimeConfig } from '@fluxcore/db';
import { assetPolicyService } from './asset-policy.service';
import { automationController } from './automation-controller.service';
import { templateService } from './template.service';


class FluxPolicyContextService {
    private cache: Map<string, FluxPolicyContext> = new Map();

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('account.profile.updated', ({ accountId }: any) => this.clearAccountCache(accountId));
        coreEventBus.on('template.authorization.changed', ({ accountId }: any) => this.clearAccountCache(accountId));
        coreEventBus.on('knowledge.authorized', ({ accountId }: any) => this.clearAccountCache(accountId));
        coreEventBus.on('relationship.context.updated', ({ accountId, relationshipId }: any) => {
            if (accountId && relationshipId) {
                this.cache.delete(`${accountId}:${relationshipId}`);
            } else if (accountId) {
                this.clearAccountCache(accountId);
            }
        });
        coreEventBus.on('assistant.config.updated', ({ accountId }: any) => {
            this.clearAccountCache(accountId);
            console.log(`[PolicyContextCache] ♻️  Invalidated for account=${accountId.slice(0, 7)} (assistant config changed)`);
        });
        coreEventBus.on('policy.config.updated', ({ accountId }: any) => {
            this.clearAccountCache(accountId);
            console.log(`[PolicyContextCache] ♻️  Invalidated for account=${accountId.slice(0, 7)} (policy config changed)`);
        });
    }

    private clearAccountCache(accountId: string) {
        const prefix = `${accountId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) this.cache.delete(key);
        }
    }

    async resolveContext(
        accountId: string,
        contactId: string,
        channel: string,
    ): Promise<{ policyContext: FluxPolicyContext; runtimeConfig: RuntimeConfig }> {

        console.log(`[FluxPolicyContext] 🔍 RESOLVIENDO REALIDAD PARA CUENTA:`);
        console.log(`📋 ACCOUNT ID: ${accountId}`);
        console.log(`📋 CONTACT ID: ${contactId}`);
        console.log(`📋 CHANNEL: ${channel}`);
        
        const policyContext = await this.resolvePolicyOnly(accountId, contactId, channel);

        // 2. Asistente activo (fuente: fluxcore_assistants + relaciones)
        const assistantResult = await db.execute(sql`
            SELECT id, name, account_id, runtime, status, model_config, 
                   external_id
            FROM fluxcore_assistants
            WHERE account_id = ${accountId} AND status = 'active'
            LIMIT 1
        `) as any;
        const assistant = assistantResult[0] ? {
            id: assistantResult[0].id,
            name: assistantResult[0].name,
            accountId: assistantResult[0].account_id,
            runtime: assistantResult[0].runtime,
            status: assistantResult[0].status,
            modelConfig: assistantResult[0].model_config,
            externalId: assistantResult[0].external_id,
        } : null;

        // Fetch instructions separately
        const assistantInstructions = assistant
            ? await (async () => {
                const result = await db.execute(sql`
                    SELECT ai.order, iv.content
                    FROM fluxcore_assistant_instructions ai
                    INNER JOIN fluxcore_instructions i ON i.id = ai.instruction_id
                    INNER JOIN fluxcore_instruction_versions iv ON iv.id = i.current_version_id
                    WHERE ai.assistant_id = ${assistant.id} AND ai.is_enabled = true
                    ORDER BY ai.order ASC
                `) as any;
                return result.map((r: any) => ({
                    order: r.order,
                    content: r.content,
                }));
            })()
            : [];

        // 🛠️ FIX: Fetch authorized tools for the assistant (via connections)
        const assistantTools = assistant
            ? await (async () => {
                const result = await db.execute(sql`
                    SELECT d.slug
                    FROM fluxcore_assistant_tools at
                    INNER JOIN fluxcore_tool_connections c ON c.id = at.tool_connection_id
                    INNER JOIN fluxcore_tool_definitions d ON d.id = c.tool_definition_id
                    WHERE at.assistant_id = ${assistant.id} AND at.is_enabled = true
                `) as any;
                return result.map((r: any) => r.slug);
            })()
            : [];

        console.log(`[FluxPolicyContext] ✅ REALIDAD DEFINIDA PARA CUENTA ${accountId}:`);
        console.log(`  - Modo: ${policyContext.mode}`);
        console.log(`  - Channel: ${policyContext.channel}`);
        console.log(`  - Contact Rules: ${policyContext.contactRules.length} reglas`);
        console.log(`  - Authorized Templates: ${policyContext.authorizedTemplates.length} templates`);
        console.log(`  - Authorized Tools: ${assistantTools.length} tools`);
        
        // 🎭 LOG DETALLADO DEL POLICY CONTEXT COMPLETO
        console.log(`[FluxPolicyContext] 📋 POLICY CONTEXT COMPLETO:`);
        console.log(`📋 accountId: ${policyContext.accountId}`);
        console.log(`📋 contactId: ${policyContext.contactId}`);
        console.log(`📋 conversationId: ${policyContext.conversationId}`);
        console.log(`📋 channel: ${policyContext.channel}`);
        console.log(`📋 mode: ${policyContext.mode}`);
        console.log(`📋 responseDelayMs: ${policyContext.responseDelayMs}`);
        console.log(`📋 turnWindowMs: ${policyContext.turnWindowMs}`);
        console.log(`📋 turnWindowTypingMs: ${policyContext.turnWindowTypingMs}`);
        console.log(`📋 turnWindowMaxMs: ${policyContext.turnWindowMaxMs}`);
        console.log(`📋 offHoursPolicy:`, JSON.stringify(policyContext.offHoursPolicy, null, 2));
        console.log(`📋 contactRules:`, JSON.stringify(policyContext.contactRules, null, 2));
        console.log(`📋 authorizedTemplates:`, JSON.stringify(policyContext.authorizedTemplates, null, 2));
        console.log(`📋 resolvedBusinessProfile:`, JSON.stringify(policyContext.resolvedBusinessProfile, null, 2));
        console.log(`📋 workDefinitions:`, JSON.stringify(policyContext.workDefinitions, null, 2));
        console.log(`[FluxPolicyContext] 📋 FIN POLICY CONTEXT DETALLADO`);

        const runtimeConfig: RuntimeConfig = assistant
            ? {
                runtimeId: this.mapRuntimeId(assistant.runtime),
                accountId,
                assistantId: assistant.id,
                assistantName: assistant.name,
                instructions: await this.compileInstructions(assistantInstructions),
                provider: (assistant.modelConfig as any)?.provider,
                model: (assistant.modelConfig as any)?.model,
                temperature: (assistant.modelConfig as any)?.temperature,
                vectorStoreId: (assistant as any).vectorStores?.[0]?.vectorStoreId,
                externalAssistantId: assistant.externalId ?? undefined,
                authorizedTools: assistantTools,
            }
            : { runtimeId: 'asistentes-local', accountId, authorizedTools: [] };

        return { policyContext, runtimeConfig };
    }

    /**
     * Resolve the flat FluxPolicyContext for a turn.
     * Legacy method maintained for compatibility but uses resolveContext internally.
     */
    async resolve(params: {
        accountId: string;
        conversationId: string;
        contactId?: string;
        relationshipId?: string;
        channel?: string;
    }): Promise<FluxPolicyContext> {
        // 🔑 MEJORA: Usar channel proporcionado con fallback inteligente
        const { accountId, conversationId, contactId, relationshipId, channel } = params;
        const resolvedChannel = channel || await this.inferChannelFromContext(params);
        const policyContext = await this.resolvePolicyOnly(accountId, contactId || relationshipId || '', resolvedChannel);
        policyContext.conversationId = conversationId;
        return policyContext;
    }

    async resolvePolicyContext(params: {
        accountId: string;
        conversationId: string;
        contactId?: string;
        relationshipId?: string;
        channel?: string;
    }): Promise<FluxPolicyContext> {
        return this.resolve(params);
    }

    /**
     * 🔑 MÉTODO AUXILIAR: Inferir channel desde WorldDefiner
     */
    private async inferChannelFromContext(params: {
        accountId: string;
        conversationId?: string;
        contactId?: string;
        relationshipId?: string;
        channel?: string;
    }): Promise<string> {
        // Si hay channel explícito, usarlo
        if (params.channel) return params.channel;
        
        // 🔑 INTEGRACIÓN CON WORLDEFINER: Obtener channel desde WorldDefiner
        if (params.conversationId) {
            try {
                const { conversationService } = await import('./conversation.service');
                const conversation = await conversationService.getConversationById(params.conversationId);
                
                // 🔑 USAR WORLDEFINER DIRECTAMENTE
                const { ChatCoreWorldDefiner } = await import('../core/chatcore-world-definer');
                
                // Construir contexto para WorldDefiner
                const worldContext = ChatCoreWorldDefiner.defineWorld({
                    headers: {},
                    meta: {
                        conversationId: params.conversationId,
                        channel: conversation?.channel,
                        // Otros metadatos relevantes
                    },
                    userAgent: undefined,
                    origin: 'fluxcore-policy-context',
                    requestId: `policy-${params.conversationId}`,
                    accountId: params.accountId,
                    userId: params.contactId || params.relationshipId
                });
                
                console.log(`[FluxPolicyContext] 🌍 Using WorldDefiner channel: ${worldContext.channel}`);
                return worldContext.channel;
                
            } catch (error) {
                console.warn('[FluxPolicyContext] ⚠️ Error using WorldDefiner:', error);
                // Fallback al channel de la conversación
                const { conversationService } = await import('./conversation.service');
                const conversation = await conversationService.getConversationById(params.conversationId);
                if (conversation?.channel) {
                    console.log(`[FluxPolicyContext] 🔍 Fallback to conversation channel: ${conversation.channel}`);
                    return conversation.channel;
                }
            }
        }
        
        // Último fallback
        console.warn('[FluxPolicyContext] ⚠️ Could not infer channel - using unknown');
        return 'unknown';
    }

    private async resolvePolicyOnly(
        accountId: string,
        contactId: string,
        channel: string,
    ): Promise<FluxPolicyContext> {
        this.clearAccountCache(accountId);

        const policyResult = await db.execute(sql`
            SELECT account_id, mode, response_delay_ms, turn_window_ms,
                   turn_window_typing_ms, turn_window_max_ms, off_hours_policy
            FROM fluxcore_account_policies
            WHERE account_id = ${accountId}
            LIMIT 1
        `) as any;

        const policy = policyResult[0] ? {
            accountId: policyResult[0].account_id,
            mode: policyResult[0].mode,
            responseDelayMs: policyResult[0].response_delay_ms,
            turnWindowMs: policyResult[0].turn_window_ms,
            turnWindowTypingMs: policyResult[0].turn_window_typing_ms,
            turnWindowMaxMs: policyResult[0].turn_window_max_ms,
            offHoursPolicy: policyResult[0].off_hours_policy,
        } : null;

        console.log(`[FluxPolicyContext] 📋 POLÍTICA ENCONTRADA:`);
        console.log(`  - Modo: ${policy?.mode || 'default'}`);
        console.log(`  - Response Delay: ${policy?.responseDelayMs || 'default'}ms`);

        let policyData = policy;
        if (!policyData) {
            policyData = await this.createDefaultPolicy(accountId);
        }

        let resolvedMode = policyData.mode;
        if (contactId) {
            const isVisitorToken = !contactId.includes('-') ||
                (contactId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId));

            if (isVisitorToken) {
                console.log(`[FluxPolicyContext] 🎯 VISITOR DETECTED: ${contactId} - buscando regla global`);
                const globalRule = await automationController.getGlobalRule(accountId);
                if (globalRule) {
                    console.log(`[FluxPolicyContext] 🎯 REGLA GLOBAL ENCONTRADA: Usando modo '${globalRule.mode}' para visitor ${contactId}`);
                    resolvedMode = globalRule.mode;
                } else {
                    console.log(`[FluxPolicyContext] 🎯 SIN REGLA GLOBAL: Usando modo de cuenta '${policyData.mode}'`);
                }
            } else {
                const relationshipMode = await automationController.getRelationshipMode(accountId, contactId);
                if (relationshipMode) {
                    console.log(`[FluxPolicyContext] 🎯 EXCEPCIÓN ENCONTRADA: Usando modo '${relationshipMode}' para la relación ${contactId}`);
                    resolvedMode = relationshipMode;
                }
            }
        }

        const resolvedBusinessProfile = await this.resolveBusinessProfile(accountId);
        const contactRules = await this.resolveContactRules(contactId);
        const authorizedTemplates = await this.resolveAuthorizedTemplates(accountId);
        const fluxiContext = await this.resolveFluxiContext(accountId);

        return {
            accountId,
            contactId,
            conversationId: '',
            channel,
            mode: resolvedMode as any,
            responseDelayMs: policyData.responseDelayMs,
            turnWindowMs: policyData.turnWindowMs,
            turnWindowTypingMs: policyData.turnWindowTypingMs,
            turnWindowMaxMs: policyData.turnWindowMaxMs,
            offHoursPolicy: policyData.offHoursPolicy,
            contactRules,
            authorizedTemplates: authorizedTemplates.map(t => t.templateId),
            resolvedBusinessProfile: {
                ...resolvedBusinessProfile,
                templates: authorizedTemplates
            },
            ...fluxiContext,
        };
    }

    private async resolveContactRules(relationshipId?: string): Promise<import('@fluxcore/db').ContactRule[]> {
        if (!relationshipId) return [];
        try {
            const [rel] = await db
                .select({ context: relationships.context })
                .from(relationships)
                .where(eq(relationships.id, relationshipId))
                .limit(1);

            if (!rel || !(rel.context as any)?.entries) return [];

            const entries = (rel.context as any).entries as Array<{
                type?: string;
                contextType?: string;
                content: string;
                allow_automated_use?: boolean;
            }>;

            return entries
                .filter(e => e.allow_automated_use === true)
                .map(e => ({
                    type: (e.type || e.contextType || 'note') as 'note' | 'preference' | 'rule',
                    content: e.content,
                }));
        } catch {
            return [];
        }
    }

    /**
     * Visibilidad controlada por ai_include_* en la tabla accounts.
     * Control granular por asistente (authorized_data_scopes) removido 
     * como simplificación consciente — reimplementar si se requiere 
     * multi-asistente con permisos distintos por asistente.
     */
    private async resolveBusinessProfile(
        accountId: string,
    ): Promise<FluxPolicyContext['resolvedBusinessProfile']> {
        const [account] = await db
            .select({
                id: accounts.id,
                username: accounts.username,
                displayName: accounts.displayName,
                profile: accounts.profile,
                privateContext: accounts.privateContext,
                avatarAssetId: accounts.avatarAssetId,
                aiIncludeName: accounts.aiIncludeName,
                aiIncludeBio: accounts.aiIncludeBio,
                aiIncludePrivateContext: accounts.aiIncludePrivateContext,
                aiIncludeTimestamp: accounts.aiIncludeTimestamp,
                aiIncludeSocialLinks: accounts.aiIncludeSocialLinks,
                aiIncludeLocations: accounts.aiIncludeLocations,
                socialLinks: accounts.socialLinks,
                brandColors: accounts.brandColors,
                country: accounts.country,
                timezone: accounts.timezone,
            })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);
        if (!account) return {};

        const profile: Record<string, unknown> = {
            aiIncludeTimestamp: account.aiIncludeTimestamp ?? true,
            country: account.country,
            timezone: account.timezone,
        };
        const accountProfile = (account.profile || {}) as any;

        if (account.aiIncludeName) {
            profile.displayName = account.displayName || account.username;
        }
        if (account.aiIncludeBio) {
            profile.bio = accountProfile.bio || undefined;
        }
        if (account.aiIncludePrivateContext) {
            profile.privateContext = account.privateContext || undefined;
        }

        // Social links — gated by aiIncludeSocialLinks toggle and granular aiEnabled flags
        if (account.aiIncludeSocialLinks && account.socialLinks) {
            const links = account.socialLinks as Record<string, { value: string; aiEnabled: boolean }>;
            const authorizedLinks: Record<string, string> = {};
            
            Object.entries(links || {}).forEach(([key, data]) => {
                // Support both old string format (migration fallback) and new object format
                if (typeof data === 'string') {
                    authorizedLinks[key] = data;
                } else if (data && typeof data === 'object' && data.aiEnabled !== false) {
                    authorizedLinks[key] = data.value;
                }
            });

            if (Object.keys(authorizedLinks).length > 0) {
                profile.socialLinks = authorizedLinks;
            }
        }

        // Brand colors — always projected (visual identity, not sensitive)
        const colors = account.brandColors as any;
        if (colors && Object.keys(colors).length > 0) {
            profile.brandColors = colors;
        }

        if (account.avatarAssetId) {
            const signed = await assetPolicyService.signAsset({
                assetId: account.avatarAssetId,
                actorId: accountId,
                actorType: 'system',
                context: {
                    action: 'preview',
                    channel: 'kernel' as any,
                },
            });

            if (signed?.url) {
                profile.avatarUrl = signed.url;
            }
        }

        // Locations — gated by aiIncludeLocations toggle
        if (account.aiIncludeLocations) {
            const { accountLocations } = await import('@fluxcore/db');
            const rawLocations = await db
                .select({
                    id: accountLocations.id,
                    name: accountLocations.name,
                    address: accountLocations.address,
                    isDefault: accountLocations.isDefault,
                })
                .from(accountLocations)
                .where(and(
                    eq(accountLocations.accountId, accountId),
                    eq(accountLocations.status, 'active')
                ))
                .orderBy(desc(accountLocations.isDefault), accountLocations.name);

            if (rawLocations.length > 0) {
                profile.locations = rawLocations.map(loc => ({
                    id: loc.id,
                    name: loc.name,
                    address: loc.address,
                    isDefault: loc.isDefault,
                    // Nota: El estado operativo y horarios se consultan vía Herramientas (is_business_open)
                }));
            }
        }

        return profile as any;
    }


    private async createDefaultPolicy(accountId: string) {
        const result = await db.execute(sql`
            INSERT INTO fluxcore_account_policies (
                account_id, mode, response_delay_ms, turn_window_ms,
                turn_window_typing_ms, turn_window_max_ms, off_hours_policy
            ) VALUES (
                ${accountId}, 'off', 3000, 3000, 5000, 60000, '{"action":"ignore"}'::jsonb
            )
            ON CONFLICT (account_id) DO UPDATE SET
                mode = EXCLUDED.mode
            RETURNING account_id, mode, response_delay_ms, turn_window_ms,
                      turn_window_typing_ms, turn_window_max_ms, off_hours_policy
        `) as any;
        
        const row = result[0];
        return {
            accountId: row.account_id,
            mode: row.mode,
            responseDelayMs: row.response_delay_ms,
            turnWindowMs: row.turn_window_ms,
            turnWindowTypingMs: row.turn_window_typing_ms,
            turnWindowMaxMs: row.turn_window_max_ms,
            offHoursPolicy: row.off_hours_policy,
        };
    }

    private async resolveFluxiContext(
        accountId: string,
    ): Promise<Pick<FluxPolicyContext, 'activeWork' | 'workDefinitions'>> {
        const [activeWorkResult, workDefinitionsResult] = await Promise.all([
            db.execute(sql`
                SELECT id, account_id, relationship_id, state, 
                       work_definition_id, work_definition_version
                FROM fluxcore_works
                WHERE account_id = ${accountId}
                  AND state NOT IN ('COMPLETED', 'FAILED', 'EXPIRED')
                LIMIT 1
            `) as any,
            db.execute(sql`
                SELECT id, type_id, version, definition_json
                FROM fluxcore_work_definitions
                WHERE account_id = ${accountId}
            `) as any,
        ]);

        const activeWork = activeWorkResult[0] ? {
            id: activeWorkResult[0].id,
            accountId: activeWorkResult[0].account_id,
            relationshipId: activeWorkResult[0].relationship_id,
            state: activeWorkResult[0].state,
            workDefinitionId: activeWorkResult[0].work_definition_id,
            workDefinitionVersion: activeWorkResult[0].work_definition_version,
        } : null;

        const workDefinitions = workDefinitionsResult.map((row: any) => ({
            id: row.id,
            typeId: row.type_id,
            version: row.version,
            definitionJson: row.definition_json,
        }));

        return {
            activeWork: activeWork ? this.mapActiveWork(activeWork) : undefined,
            workDefinitions: workDefinitions.map((d: any) => this.mapWorkDefinition(d)),
        };
    }

    private mapActiveWork(work: any) {
        return {
            workId: work.id,
            state: work.state,
            typeId: (work as any).typeId || '',
        };
    }

    private mapWorkDefinition(wd: any) {
        return {
            id: wd.id,
            typeId: wd.typeId,
            version: wd.version,
            definitionJson: wd.definitionJson,
        };
    }

    private mapRuntimeId(runtime: string): string {
        const map: Record<string, string> = {
            'local': 'asistentes-local',
            'openai': 'asistentes-openai',
            'fluxi': 'fluxi',
        };
        return map[runtime] ?? runtime;
    }

    private async compileInstructions(instructions: Array<{ content: string | null }>): Promise<string> {
        return instructions
            .map(i => i.content || '')
            .filter(c => c.length > 0)
            .join('\n\n');
    }

    private async resolveAuthorizedToolIds(accountId: string, assistantId?: string | null): Promise<string[]> {
        const authorizedIds = new Set<string>();

        // 1. Herramientas del Asistente (Legacy/Specific)
        if (assistantId) {
            const { assistantsService } = await import('./fluxcore/assistants.service');
            const assistant = await assistantsService.getAssistantById(assistantId, accountId);
            if (assistant?.toolIds) {
                assistant.toolIds.forEach(id => authorizedIds.add(id));
            }
        }

        // 2. 🚀 SOBERANÍA DE CUENTA: Herramientas conectadas globalmente (Switch UI)
        const connectedTools = await db
            .select({ slug: fluxcoreToolDefinitions.slug })
            .from(fluxcoreToolConnections)
            .innerJoin(fluxcoreToolDefinitions, eq(fluxcoreToolConnections.toolDefinitionId, fluxcoreToolDefinitions.id))
            .where(and(
                eq(fluxcoreToolConnections.accountId, accountId),
                eq(fluxcoreToolConnections.status, 'connected')
            ));

        // Mapear slugs de herramientas de sistema a sus nombres canónicos si es necesario, 
        // o simplemente incluirlos si el CapabilityOfferService los reconoce.
        connectedTools.forEach(t => {
            if (t.slug) authorizedIds.add(t.slug);
        });

        return Array.from(authorizedIds);
    }

    private async resolveAuthorizedTemplates(accountId: string): Promise<any[]> {
        // Load authorized templates from fluxcore_template_settings
        const { fluxCoreTemplateSettingsService } = await import('./fluxcore/template-settings.service');
        const authorizedSettings = await fluxCoreTemplateSettingsService.listAuthorizedTemplates(accountId);
        
        // 🛠️ MEJORA: Si la cuenta tiene plantillas activas pero no están en settings, 
        // incluirlas si tienen allowAutomatedUse = true (Soberanía de Cuenta)
        const [allActiveTemplates] = await Promise.all([
            db.select().from(templates).where(and(eq(templates.accountId, accountId), eq(templates.isActive, true)))
        ]);

        const authorizedIds = new Set(authorizedSettings.map(t => t.id));
        const combined = [...authorizedSettings];

        for (const tpl of allActiveTemplates) {
            if (!authorizedIds.has(tpl.id) && tpl.allowAutomatedUse) {
                combined.push({
                    ...tpl,
                    aiUsageInstructions: null,
                    aiIncludeName: true,
                    aiIncludeContent: true,
                    aiIncludeInstructions: true
                });
            }
        }

        // Return rich objects for PromptBuilder knowledge section
        return Promise.all(combined.map(async t => ({
            templateId: t.id,
            name: t.name,
            instructions: (t as any).aiUsageInstructions,
            variables: t.variables || [],
            content: await templateService.resolveSystemVariables(t.content, accountId)
        })));
    }
}

export const fluxPolicyContextService = new FluxPolicyContextService();
