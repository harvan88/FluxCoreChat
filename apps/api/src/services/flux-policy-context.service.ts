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
import { db } from '@fluxcore/db';
import { accounts, relationships, extensionInstallations, templates, appointmentServices, fluxcoreTemplateSettings, fluxcoreWorks, fluxcoreAssistants, accountRuntimeConfig } from '@fluxcore/db';
import { eq, and, desc, or } from 'drizzle-orm';
import type { FluxPolicyContext } from '@fluxcore/db';

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
            console.log(`[PolicyContextCache] ♻️  Invalidated for account=${accountId.slice(0,7)} (assistant config changed)`);
        });
    }

    private clearAccountCache(accountId: string) {
        const prefix = `${accountId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) this.cache.delete(key);
        }
    }

    /**
     * Resolve the flat FluxPolicyContext for a turn.
     * Canon Â§4.3: returns business governance only â€” no LLM config.
     */
    async resolve(params: {
        accountId: string;
        conversationId: string;
        relationshipId?: string;
        channel?: string;
    }): Promise<FluxPolicyContext> {
        const { accountId, conversationId, relationshipId, channel = 'web' } = params;
        const cacheKey = `${accountId}:${relationshipId || 'global'}:${conversationId}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const [account] = await db
            .select()
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);

        if (!account) {
            throw new Error(`Account ${accountId} not found during PolicyContext resolution`);
        }

        const [fluxConfig, contactRules, resolvedBusinessProfile, activeWork] = await Promise.all([
            this.resolveFluxCoreConfig(accountId),
            this.resolveContactRules(relationshipId),
            this.resolveBusinessProfile(account, accountId),
            conversationId ? this.resolveActiveWork(accountId, conversationId) : Promise.resolve(undefined),
        ]);

        // activeRuntimeId: read from assistant config, default to asistentes-local
        const activeRuntimeId = await this.resolveActiveRuntimeId(accountId);

        // Governance fields: prefer assistant timingConfig over extension installation config
        const assistantTimingConfig = await this.resolveAssistantTimingConfig(accountId);

        // authorizedTemplates: from fluxcore_template_settings
        const authorizedTemplates = resolvedBusinessProfile.templates
            ?.map((t: any) => t.templateId) ?? [];

        const context: FluxPolicyContext = {
            accountId,
            contactId: relationshipId ?? '',
            conversationId,
            channel,
            tone: assistantTimingConfig.tone ?? fluxConfig.tone ?? 'neutral',
            useEmojis: assistantTimingConfig.useEmojis ?? fluxConfig.useEmojis ?? false,
            language: assistantTimingConfig.language ?? fluxConfig.language ?? 'es',
            mode: assistantTimingConfig.mode ?? fluxConfig.mode ?? 'auto',
            responseDelayMs: (assistantTimingConfig as any).responseDelaySeconds != null
                ? (assistantTimingConfig as any).responseDelaySeconds * 1000
                : (fluxConfig.responseDelay ?? 0),
            turnWindowMs: 3000,
            turnWindowTypingMs: 5000,
            turnWindowMaxMs: 60000,
            offHoursPolicy: { action: 'ignore' },
            contactRules,
            activeRuntimeId,
            authorizedTemplates,
            resolvedBusinessProfile,
            activeWork,
        };

        this.cache.set(cacheKey, context);
        return context;
    }

    private async resolveAssistantTimingConfig(accountId: string): Promise<{
        mode?: 'auto' | 'suggest' | 'off';
        tone?: 'formal' | 'casual' | 'neutral';
        useEmojis?: boolean;
        language?: string;
    }> {
        try {
            const [row] = await db
                .select({ timingConfig: fluxcoreAssistants.timingConfig })
                .from(fluxcoreAssistants)
                .where(and(
                    eq(fluxcoreAssistants.accountId, accountId),
                    or(eq(fluxcoreAssistants.status, 'active'), eq(fluxcoreAssistants.status, 'production'))
                ))
                .orderBy(desc(fluxcoreAssistants.updatedAt))
                .limit(1);
            return (row?.timingConfig ?? {}) as any;
        } catch {
            return {};
        }
    }

    private async resolveFluxCoreConfig(accountId: string): Promise<FluxCoreExtensionConfig> {
        try {
            const [installation] = await db
                .select({ config: extensionInstallations.config })
                .from(extensionInstallations)
                .where(and(
                    eq(extensionInstallations.accountId, accountId),
                    eq(extensionInstallations.extensionId, '@fluxcore/asistentes'),
                ))
                .limit(1);
            return (installation?.config || {}) as FluxCoreExtensionConfig;
        } catch {
            return {};
        }
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
        account: typeof accounts.$inferSelect,
        accountId: string
    ): Promise<import('@fluxcore/db').ResolvedBusinessProfile> {
        const profile: import('@fluxcore/db').ResolvedBusinessProfile = {};

        if (!account.allowAutomatedUse) {
            profile.displayName = account.displayName || account.username;
            return profile;
        }

        if (account.aiIncludeName ?? true) {
            profile.displayName = account.displayName || account.username;
        }
        if (account.aiIncludeBio ?? true) {
            profile.bio = (account.profile as any)?.bio || undefined;
        }
        if (account.aiIncludePrivateContext ?? true) {
            profile.privateContext = account.privateContext || undefined;
        }

        const accountProfile = account.profile as any;
        if (accountProfile?.timezone) profile.timezone = accountProfile.timezone;
        if (accountProfile?.address) profile.location = accountProfile.address;

        try {
            const [authorizedTemplates, authorizedServices] = await Promise.all([
                db.select({
                    templateId: templates.id,
                    name: templates.name,
                    content: templates.content,
                    variables: templates.variables,
                    settings: fluxcoreTemplateSettings,
                })
                    .from(templates)
                    .innerJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
                    .where(and(
                        eq(templates.accountId, accountId),
                        eq(fluxcoreTemplateSettings.authorizeForAI, true)
                    )),

                db.select({ name: appointmentServices.name, description: appointmentServices.description, price: appointmentServices.price, currency: appointmentServices.currency })
                    .from(appointmentServices)
                    .where(and(
                        eq(appointmentServices.accountId, accountId),
                        eq(appointmentServices.allowAutomatedUse, true)
                    )),
            ]);

            profile.templates = authorizedTemplates.map(t => ({
                templateId: t.templateId,
                name: t.settings.aiIncludeName ? t.name : 'Plantilla',
                instructions: t.settings.aiIncludeInstructions ? t.settings.aiUsageInstructions || undefined : undefined,
                variables: Array.isArray(t.variables)
                    ? (t.variables as any[]).filter((v: any) => typeof v?.name === 'string').map((v: any) => ({ name: v.name, required: v.required }))
                    : [],
                content: t.settings.aiIncludeContent ? t.content : undefined,
            }));

            profile.appointmentServices = authorizedServices.map(s => ({
                name: s.name,
                description: s.description || undefined,
                price: s.price ? `${s.price} ${s.currency}` : undefined,
            }));
        } catch {
            // Non-fatal â€” return profile without templates/services
        }

        return profile;
    }

    private async resolveActiveWork(accountId: string, conversationId: string): Promise<import('@fluxcore/db').ActiveWorkContext | undefined> {
        try {
            const terminalStates = ['COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'];
            const [work] = await db
                .select({ id: fluxcoreWorks.id, state: fluxcoreWorks.state, typeId: (fluxcoreWorks as any).typeId })
                .from(fluxcoreWorks)
                .where(and(
                    eq(fluxcoreWorks.accountId, accountId),
                    eq(fluxcoreWorks.conversationId, conversationId),
                ))
                .orderBy(desc(fluxcoreWorks.createdAt))
                .limit(1);

            if (!work || terminalStates.includes(work.state)) return undefined;
            return { workId: work.id, state: work.state, typeId: work.typeId || '' };
        } catch {
            return undefined;
        }
    }

    private async resolveActiveRuntimeId(accountId: string): Promise<string> {
        try {
            const [runtimeCfg] = await db
                .select()
                .from(accountRuntimeConfig)
                .where(eq(accountRuntimeConfig.accountId, accountId))
                .limit(1);

            const preferredId = (runtimeCfg?.config as any)?.preferredAssistantId as string | undefined;
            const assistantId = preferredId || await this.findProductionAssistantId(accountId);
            if (!assistantId) return 'asistentes-local';

            const [assistant] = await db
                .select({ runtime: fluxcoreAssistants.runtime })
                .from(fluxcoreAssistants)
                .where(eq(fluxcoreAssistants.id, assistantId))
                .limit(1);

            return this.mapRuntimeToId(assistant?.runtime);
        } catch {
            return 'asistentes-local';
        }
    }

    private async findProductionAssistantId(accountId: string): Promise<string | null> {
        const [a] = await db
            .select({ id: fluxcoreAssistants.id })
            .from(fluxcoreAssistants)
            .where(and(
                eq(fluxcoreAssistants.accountId, accountId),
                or(eq(fluxcoreAssistants.status, 'production'), eq(fluxcoreAssistants.status, 'active'))
            ))
            .orderBy(desc(fluxcoreAssistants.updatedAt))
            .limit(1);
        return a?.id || null;
    }

    private mapRuntimeToId(runtime?: string): string {
        if (runtime === 'openai') return 'asistentes-openai';
        if (runtime === 'fluxi') return 'fluxi-runtime';
        return 'asistentes-local';
    }

}

export const fluxPolicyContextService = new FluxPolicyContextService();
