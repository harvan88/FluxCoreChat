/**
 * Asset Policy Service
 * 
 * Motor de políticas de acceso para assets.
 * Evalúa permisos y genera URLs firmadas con TTL según contexto.
 */

import { db } from '@fluxcore/db';
import { 
    assetPolicies, 
    assets,
    type AssetPolicy,
    type PolicyContext,
    type EvaluatePolicyParams,
    type PolicyEvaluationResult
} from '@fluxcore/db';
import { eq, and, isNull, or } from 'drizzle-orm';
import { getStorageAdapter } from './storage';
import { assetRegistryService } from './asset-registry.service';

const DEBUG_PREFIX = '[AssetPolicy]';

// Políticas por defecto del sistema
const DEFAULT_POLICIES: Record<string, { ttlSeconds: number; contexts: string[] }> = {
    message_attachment: {
        ttlSeconds: 3600, // 1 hora
        contexts: ['download:web', 'preview:web', 'preview:assistant'],
    },
    template_asset: {
        ttlSeconds: 7200, // 2 horas
        contexts: ['download:web', 'preview:web', 'internal:compliance'],
    },
    execution_plan: {
        ttlSeconds: 1800, // 30 minutos
        contexts: ['download:api', 'internal:compliance'],
    },
    shared_internal: {
        ttlSeconds: 86400, // 24 horas
        contexts: ['download:web', 'download:api', 'preview:web', 'preview:assistant', 'internal:compliance'],
    },
    profile_avatar: {
        ttlSeconds: 86400, // 24 horas
        contexts: ['preview:web', 'download:web'],
    },
    workspace_asset: {
        ttlSeconds: 3600,
        contexts: ['download:web', 'preview:web', 'download:api'],
    },
};

export interface SignAssetParams {
    assetId: string;
    actorId: string;
    actorType: 'user' | 'assistant' | 'system';
    context: PolicyContext;
    disposition?: 'inline' | 'attachment';
}

export interface SignedAssetResult {
    url: string;
    expiresAt: Date;
    ttlSeconds: number;
}

export class AssetPolicyService {
    /**
     * Evaluar si un actor puede acceder a un asset en un contexto dado
     */
    async evaluateAccess(params: EvaluatePolicyParams): Promise<PolicyEvaluationResult> {
        const { assetId, actorId, actorType, context } = params;
        const contextString = `${context.action}:${context.channel}`;

        console.log(`${DEBUG_PREFIX} Access evaluated: assetId=${assetId}, actor=${actorId}, context=${contextString}`);

        // Obtener asset
        const asset = await assetRegistryService.getById(assetId);
        if (!asset) {
            console.log(`${DEBUG_PREFIX} Access denied: asset not found`);
            return { allowed: false, ttlSeconds: 0, reason: 'Asset not found' };
        }

        // Verificar estado del asset
        if (asset.status !== 'ready') {
            console.log(`${DEBUG_PREFIX} Access denied: asset status=${asset.status}`);
            return { allowed: false, ttlSeconds: 0, reason: `Asset status is ${asset.status}` };
        }

        // Buscar política específica para la cuenta
        const accountPolicy = await this.findPolicy(asset.scope || 'message_attachment', asset.accountId);
        
        // Usar política de cuenta o default
        const policy = accountPolicy || this.getDefaultPolicy(asset.scope || 'message_attachment');

        // Verificar contexto permitido
        const allowedContexts = policy.contexts;
        if (!allowedContexts.includes(contextString) && !allowedContexts.includes('*')) {
            console.log(`${DEBUG_PREFIX} Access denied: context ${contextString} not allowed`);
            return { 
                allowed: false, 
                ttlSeconds: 0, 
                reason: `Context ${contextString} not allowed for scope ${asset.scope}` 
            };
        }

        // Verificar ownership (usuario debe pertenecer a la cuenta del asset)
        // En producción, esto verificaría membresía de cuenta/workspace
        // Por ahora, permitimos si el actor es system o assistant
        if (actorType === 'user') {
            // TODO: Verificar que el usuario pertenece a la cuenta del asset
            // Por ahora, asumimos que la verificación se hace en el endpoint
        }

        console.log(`${DEBUG_PREFIX} Access allowed: ttl=${policy.ttlSeconds}s`);

        return {
            allowed: true,
            ttlSeconds: policy.ttlSeconds,
            policyId: accountPolicy?.id,
        };
    }

    /**
     * Generar URL firmada para un asset
     */
    async signAsset(params: SignAssetParams): Promise<SignedAssetResult | null> {
        const { assetId, actorId, actorType, context, disposition } = params;

        // Evaluar acceso
        const evaluation = await this.evaluateAccess({
            assetId,
            actorId,
            actorType,
            context,
        });

        if (!evaluation.allowed) {
            console.log(`${DEBUG_PREFIX} Sign denied: ${evaluation.reason}`);
            return null;
        }

        // Obtener asset
        const asset = await assetRegistryService.getById(assetId);
        if (!asset) return null;

        // Generar URL firmada
        const storage = getStorageAdapter();
        const url = await storage.getSignedUrl(asset.storageKey, {
            expiresInSeconds: evaluation.ttlSeconds,
            contentType: asset.mimeType || undefined,
            disposition: disposition || 'inline',
            filename: asset.originalName || asset.name,
        });

        const expiresAt = new Date(Date.now() + evaluation.ttlSeconds * 1000);

        console.log(`${DEBUG_PREFIX} URL signed: assetId=${assetId}, ttl=${evaluation.ttlSeconds}s, context=${context.action}:${context.channel}`);

        return {
            url,
            expiresAt,
            ttlSeconds: evaluation.ttlSeconds,
        };
    }

    /**
     * Buscar política para un scope y cuenta
     */
    async findPolicy(scope: string, accountId?: string): Promise<AssetPolicy | null> {
        // Primero buscar política específica de la cuenta
        if (accountId) {
            const [accountPolicy] = await db.select()
                .from(assetPolicies)
                .where(and(
                    eq(assetPolicies.scope, scope),
                    eq(assetPolicies.accountId, accountId),
                    eq(assetPolicies.isActive, true)
                ))
                .limit(1);

            if (accountPolicy) {
                return accountPolicy;
            }
        }

        // Buscar política global (sin accountId)
        const [globalPolicy] = await db.select()
            .from(assetPolicies)
            .where(and(
                eq(assetPolicies.scope, scope),
                isNull(assetPolicies.accountId),
                eq(assetPolicies.isActive, true)
            ))
            .limit(1);

        return globalPolicy || null;
    }

    /**
     * Obtener política por defecto para un scope
     */
    getDefaultPolicy(scope: string): { ttlSeconds: number; contexts: string[] } {
        return DEFAULT_POLICIES[scope] || DEFAULT_POLICIES.message_attachment;
    }

    /**
     * Crear política personalizada
     */
    async createPolicy(params: {
        name: string;
        scope: string;
        contexts: string[];
        ttlSeconds: number;
        accountId?: string;
        maxFileSizeBytes?: number;
        allowedMimeTypes?: string[];
        requireEncryption?: boolean;
        auditAllAccess?: boolean;
    }): Promise<AssetPolicy> {
        const [policy] = await db.insert(assetPolicies).values({
            name: params.name,
            scope: params.scope,
            allowedContexts: JSON.stringify(params.contexts),
            defaultTtlSeconds: params.ttlSeconds,
            maxTtlSeconds: params.ttlSeconds * 2,
            accountId: params.accountId,
            maxFileSizeBytes: params.maxFileSizeBytes,
            allowedMimeTypes: params.allowedMimeTypes ? JSON.stringify(params.allowedMimeTypes) : null,
            requireEncryption: params.requireEncryption || false,
            auditAllAccess: params.auditAllAccess ?? true,
            isActive: true,
        }).returning();

        console.log(`${DEBUG_PREFIX} Policy created: ${policy.id}, scope=${params.scope}`);

        return policy;
    }

    /**
     * Actualizar política
     */
    async updatePolicy(policyId: string, updates: Partial<{
        name: string;
        contexts: string[];
        ttlSeconds: number;
        isActive: boolean;
    }>): Promise<AssetPolicy | null> {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (updates.name) updateData.name = updates.name;
        if (updates.contexts) updateData.allowedContexts = JSON.stringify(updates.contexts);
        if (updates.ttlSeconds) {
            updateData.defaultTtlSeconds = updates.ttlSeconds;
            updateData.maxTtlSeconds = updates.ttlSeconds * 2;
        }
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

        const [updated] = await db.update(assetPolicies)
            .set(updateData)
            .where(eq(assetPolicies.id, policyId))
            .returning();

        if (updated) {
            console.log(`${DEBUG_PREFIX} Policy updated: ${policyId}`);
        }

        return updated || null;
    }

    /**
     * Eliminar política
     */
    async deletePolicy(policyId: string): Promise<void> {
        await db.delete(assetPolicies).where(eq(assetPolicies.id, policyId));
        console.log(`${DEBUG_PREFIX} Policy deleted: ${policyId}`);
    }

    /**
     * Listar políticas de una cuenta
     */
    async listPolicies(accountId?: string): Promise<AssetPolicy[]> {
        if (accountId) {
            return db.select()
                .from(assetPolicies)
                .where(or(
                    eq(assetPolicies.accountId, accountId),
                    isNull(assetPolicies.accountId)
                ));
        }

        return db.select()
            .from(assetPolicies)
            .where(isNull(assetPolicies.accountId));
    }

    /**
     * Verificar si FluxCore puede acceder a un asset
     * FluxCore usa las mismas APIs que usuarios humanos
     */
    async canFluxCoreAccess(assetId: string, action: 'preview' | 'download'): Promise<boolean> {
        const result = await this.evaluateAccess({
            assetId,
            actorId: 'fluxcore',
            actorType: 'assistant',
            context: { action, channel: 'assistant' },
        });

        return result.allowed;
    }
}

// Singleton
export const assetPolicyService = new AssetPolicyService();
