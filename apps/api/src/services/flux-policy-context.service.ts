/**
 * FluxPolicyContextService
 * 
 * Canon v7.0, Section 3: La Capa de Políticas (Pre-Ejecución)
 * 
 * Resolves the complete FluxPolicyContext BEFORE any runtime is invoked.
 * This is the single place where all pre-runtime data is gathered.
 * 
 * Data sources:
 * - ChatCore: account profile, relationship notes/preferences (exist without AI)
 * - FluxCore config: attention preferences, automation mode, contact rules (AI-specific)
 * - RuntimeConfig: which runtime is active
 * 
 * The resolved FluxPolicyContext is immutable for the lifetime of a message processing.
 */

import { db } from '@fluxcore/db';
import { accounts, relationships, accountRuntimeConfig, extensionInstallations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import type {
    FluxPolicyContext,
    FluxAttentionPreferences,
    FluxAutomationPolicies,
    FluxContactContext,
    FluxBusinessIdentity,
} from '@fluxcore/db';
import { FLUX_DEFAULT_ATTENTION } from '@fluxcore/db';

/**
 * FluxCore extension config shape (from extension_installations.config).
 * These fields are persisted as FluxCore's Configuration Slots.
 */
interface FluxCoreExtensionConfig {
    // Attention preferences (Canon v7.0: belong to FluxCore)
    tone?: 'formal' | 'casual' | 'friendly';
    formality?: 'usted' | 'tú' | 'vos';
    useEmojis?: boolean;
    language?: string;

    // Automation (some overlap with automation_rules table)
    mode?: 'suggest' | 'auto' | 'off';
    responseDelay?: number;

    // Legacy fields from @fluxcore/asistentes config
    enabled?: boolean;
    provider?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

class FluxPolicyContextService {

    /**
     * Resolve the complete policy context for a message.
     * Called once per message, before any runtime is invoked.
     */
    async resolve(params: {
        accountId: string;
        relationshipId?: string;
        automationMode?: 'automatic' | 'supervised' | 'disabled';
    }): Promise<FluxPolicyContext> {
        const { accountId, relationshipId } = params;

        // Parallel: fetch all data sources at once
        const [business, contact, fluxConfig, runtimeConfig, automationMode] = await Promise.all([
            this.resolveBusinessIdentity(accountId),
            this.resolveContactContext(relationshipId),
            this.resolveFluxCoreConfig(accountId),
            this.resolveActiveRuntime(accountId),
            Promise.resolve(params.automationMode || 'supervised'),
        ]);

        // Build attention preferences from FluxCore config
        const attention: FluxAttentionPreferences = {
            tone: fluxConfig.tone || FLUX_DEFAULT_ATTENTION.tone,
            formality: fluxConfig.formality || FLUX_DEFAULT_ATTENTION.formality,
            useEmojis: fluxConfig.useEmojis ?? FLUX_DEFAULT_ATTENTION.useEmojis,
            language: fluxConfig.language || FLUX_DEFAULT_ATTENTION.language,
        };

        // Build automation policies
        const automation: FluxAutomationPolicies = {
            mode: automationMode,
            responseDelaySeconds: fluxConfig.responseDelay ?? 2,
        };

        return {
            attention,
            automation,
            contact,
            business,
            activeRuntimeId: runtimeConfig,
            resolvedAt: new Date(),
        };
    }

    /**
     * Read business identity from ChatCore's account profile.
     * This data belongs to ChatCore (exists without AI).
     */
    private async resolveBusinessIdentity(accountId: string): Promise<FluxBusinessIdentity> {
        try {
            const [account] = await db
                .select({
                    username: accounts.username,
                    displayName: accounts.displayName,
                    profile: accounts.profile,
                })
                .from(accounts)
                .where(eq(accounts.id, accountId))
                .limit(1);

            if (!account) {
                return { displayName: 'Unknown', username: 'unknown' };
            }

            return {
                displayName: account.displayName || account.username,
                username: account.username,
                bio: (account.profile as any)?.bio || undefined,
            };
        } catch (error) {
            console.warn('[FluxPolicyContext] Failed to resolve business identity:', error);
            return { displayName: 'Unknown', username: 'unknown' };
        }
    }

    /**
     * Read contact context from ChatCore's relationship data.
     * Notes and preferences are ChatCore data (CRM).
     * Rules are FluxCore data (AI behavior) — for now both live in relationship.context.
     */
    private async resolveContactContext(relationshipId?: string): Promise<FluxContactContext> {
        const empty: FluxContactContext = { notes: [], preferences: [], rules: [] };

        if (!relationshipId) return empty;

        try {
            const [rel] = await db
                .select({ context: relationships.context })
                .from(relationships)
                .where(eq(relationships.id, relationshipId))
                .limit(1);

            if (!rel || !(rel.context as any)?.entries) return empty;

            const entries = (rel.context as any).entries as Array<{
                type?: string;
                contextType?: string;
                content: string;
            }>;

            const notes: string[] = [];
            const preferences: string[] = [];
            const rules: string[] = [];

            for (const entry of entries) {
                const type = entry.type || entry.contextType || 'note';
                switch (type) {
                    case 'note':
                        notes.push(entry.content);
                        break;
                    case 'preference':
                        preferences.push(entry.content);
                        break;
                    case 'rule':
                        rules.push(entry.content);
                        break;
                    default:
                        notes.push(entry.content);
                }
            }

            return { notes, preferences, rules };
        } catch (error) {
            console.warn('[FluxPolicyContext] Failed to resolve contact context:', error);
            return empty;
        }
    }

    /**
     * Read FluxCore's own configuration from extension_installations.config.
     * This is where attention preferences (tone, emojis) live.
     */
    private async resolveFluxCoreConfig(accountId: string): Promise<FluxCoreExtensionConfig> {
        try {
            const [installation] = await db
                .select({ config: extensionInstallations.config })
                .from(extensionInstallations)
                .where(
                    and(
                        eq(extensionInstallations.accountId, accountId),
                        eq(extensionInstallations.extensionId, '@fluxcore/asistentes'),
                    ),
                )
                .limit(1);

            return (installation?.config || {}) as FluxCoreExtensionConfig;
        } catch (error) {
            console.warn('[FluxPolicyContext] Failed to resolve FluxCore config:', error);
            return {};
        }
    }

    /**
     * Read which runtime is active for this account.
     */
    private async resolveActiveRuntime(accountId: string): Promise<string> {
        try {
            const [config] = await db
                .select({ activeRuntimeId: accountRuntimeConfig.activeRuntimeId })
                .from(accountRuntimeConfig)
                .where(eq(accountRuntimeConfig.accountId, accountId))
                .limit(1);

            return config?.activeRuntimeId || '@fluxcore/asistentes';
        } catch (error) {
            console.warn('[FluxPolicyContext] Failed to resolve active runtime:', error);
            return '@fluxcore/asistentes';
        }
    }
}

export const fluxPolicyContextService = new FluxPolicyContextService();
