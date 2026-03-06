/**
 * FluxPolicyContextService â€” Canon v8.3
 *
 * Resolves the flat FluxPolicyContext BEFORE any runtime is invoked.
 * Returns ONLY business governance â€” no LLM config, no technical runtime details.
 *
 * Canon Â§4.3: "PolicyContext contains the business governance decisions."
 * Canon Â§4.4: "PolicyContext = HOW and WHEN. RuntimeConfig = WHAT the runtime uses."
 *
 * Data sources:
 *   - ChatCore: account profile, relationship notes (exist without AI)
 *   - FluxCore config: tone, mode, windows, contact rules (AI-specific governance)
 */

import { coreEventBus } from '../core/events';
import { db, relationships, accounts, fluxcoreWorks, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { sql, eq, and, notInArray } from 'drizzle-orm';
import type { FluxPolicyContext, RuntimeConfig, OffHoursPolicy } from '@fluxcore/db';
import { assetPolicyService } from './asset-policy.service';

interface FluxCoreExtensionConfig {
    tone?: 'formal' | 'casual' | 'neutral';
    useEmojis?: boolean;
    language?: string;
    mode?: 'suggest' | 'auto' | 'off';
    responseDelay?: number;
}

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
        
        // CACHE DISABLED: Always reload from DB
        this.clearAccountCache(accountId);

        // 1. Política de la cuenta (fuente: fluxcore_account_policies)
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

        // 2. Asistente activo (fuente: fluxcore_assistants + relaciones)
        const assistantResult = await db.execute(sql`
            SELECT id, name, account_id, runtime, status, model_config, 
                   external_id, authorized_data_scopes
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
            authorizedDataScopes: assistantResult[0].authorized_data_scopes,
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

        // 3. Perfil del negocio â€” SOLO campos en authorized_data_scopes
        const resolvedBusinessProfile = assistant
            ? await this.resolveBusinessProfile(accountId, (assistant as any).authorizedDataScopes ?? [])
            : {};

        // 4. Reglas del contacto (solo notas con allow_automated_use)
        const contactRules = await this.resolveContactRules(contactId);

        // 5. Plantillas autorizadas
        const authorizedTemplates = await this.resolveAuthorizedTemplates(accountId);

        // 6. Contexto Fluxi si está activo
        const fluxiContext = await this.resolveFluxiContext(accountId);

        const policyContext: FluxPolicyContext = {
            accountId,
            contactId,
            conversationId: '', // Added if required by FluxPolicyContext type
            channel,
            mode: policyData.mode,
            responseDelayMs: policyData.responseDelayMs,
            turnWindowMs: policyData.turnWindowMs,
            turnWindowTypingMs: policyData.turnWindowTypingMs,
            turnWindowMaxMs: policyData.turnWindowMaxMs,
            offHoursPolicy: policyData.offHoursPolicy,
            contactRules,
            authorizedTemplates,
            resolvedBusinessProfile,
            workDefinitions: [],
            activeRuntimeId: assistant ? this.mapRuntimeId(assistant.runtime) : null,
        };

        console.log(`[FluxPolicyContext] ✅ REALIDAD DEFINIDA PARA CUENTA ${accountId}:`);
        console.log(`  - Modo: ${policyContext.mode}`);
        console.log(`  - Channel: ${policyContext.channel}`);
        console.log(`  - Active Runtime: ${policyContext.activeRuntimeId}`);
        console.log(`  - Contact Rules: ${policyContext.contactRules.length} reglas`);
        console.log(`  - Authorized Templates: ${policyContext.authorizedTemplates.length} templates`);

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
                authorizedTools: (assistant as any).tools?.map((t: any) => t.toolId) ?? [],
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
        const { policyContext } = await this.resolveContext(accountId, contactId || relationshipId || '', resolvedChannel);
        policyContext.conversationId = conversationId;
        return policyContext;
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

    private async resolveBusinessProfile(
        accountId: string,
        authorizedScopes: string[],
    ): Promise<FluxPolicyContext['resolvedBusinessProfile']> {
        if (authorizedScopes.length === 0) return {};

        const [account] = await db
            .select({
                id: accounts.id,
                username: accounts.username,
                displayName: accounts.displayName,
                profile: accounts.profile,
                avatarAssetId: accounts.avatarAssetId,
            })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);
        if (!account) return {};

        const profile: Record<string, unknown> = {};
        const accountProfile = (account.profile || {}) as any;

        if (authorizedScopes.includes('displayName')) {
            profile.displayName = account.displayName || account.username;
        }
        if (authorizedScopes.includes('bio')) {
            profile.bio = accountProfile.bio || undefined;
        }
        if (authorizedScopes.includes('website')) {
            profile.website = accountProfile.website || undefined;
        }
        if (authorizedScopes.includes('location')) {
            profile.location = accountProfile.address || accountProfile.location || undefined;
        }
        if (authorizedScopes.includes('businessHours')) {
            profile.businessHours = accountProfile.businessHours || [];
        }

        if (authorizedScopes.includes('avatar') && account.avatarAssetId) {
            const signed = await assetPolicyService.signAsset({
                assetId: account.avatarAssetId,
                actorId: accountId,
                actorType: 'system',
                context: {
                    action: 'preview',
                    channel: 'kernel',
                },
            });

            if (signed?.url) {
                profile.avatarUrl = signed.url;
            }
        }

        return profile as any;
    }

    private async resolveBusinessHours(accountId: string): Promise<any> {
        // Placeholder or implement based on existing logic if any
        return [];
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

    private async resolveAuthorizedTemplates(accountId: string): Promise<string[]> {
        // Implementation based on fluxcore_template_settings if needed
        return [];
    }
}

export const fluxPolicyContextService = new FluxPolicyContextService();
