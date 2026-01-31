/**
 * Asset Relations Service
 * 
 * Servicio para gestionar las relaciones entre assets y entidades:
 * - Mensajes (message_assets)
 * - Templates (template_assets) 
 * - Execution Plans (plan_assets)
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { db } from '@fluxcore/db';
import { 
    messageAssets, 
    templateAssets, 
    planAssets,
    assets,
    type MessageAsset,
    type TemplateAsset,
    type PlanAsset,
    type LinkAssetToMessageParams,
    type LinkAssetToTemplateParams,
    type LinkAssetToPlanParams,
    type PlanAssetStatus,
    type DependencyType,
} from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { AssetAuditService } from './asset-audit.service';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

export interface AssetWithMetadata {
    assetId: string;
    version: number;
    position?: number;
    slot?: string;
    dependencyType?: DependencyType;
    isReady?: boolean;
    linkedAt: Date | null;
    // Metadata del asset
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
    status: string;
}

export interface LinkResult {
    success: boolean;
    entityType: 'message' | 'template' | 'plan';
    entityId: string;
    assetId: string;
    error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Servicio
// ════════════════════════════════════════════════════════════════════════════

export class AssetRelationsService {
    private auditService: AssetAuditService;

    constructor() {
        this.auditService = new AssetAuditService();
    }

    // ════════════════════════════════════════════════════════════════════════
    // MESSAGE ASSETS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Vincular asset a mensaje
     */
    async linkAssetToMessage(params: LinkAssetToMessageParams & { accountId: string; actorId?: string }): Promise<LinkResult> {
        const { messageId, assetId, version = 1, position = 0, accountId, actorId } = params;

        try {
            console.log(`[AssetRelations] Linking asset ${assetId} to message ${messageId}`);

            // Verificar que el asset existe y pertenece a la cuenta
            const asset = await this.verifyAssetOwnership(assetId, accountId);
            if (!asset) {
                return {
                    success: false,
                    entityType: 'message',
                    entityId: messageId,
                    assetId,
                    error: 'Asset not found or access denied',
                };
            }

            // Insertar relación
            await db.insert(messageAssets).values({
                messageId,
                assetId,
                version,
                position,
            }).onConflictDoUpdate({
                target: [messageAssets.messageId, messageAssets.assetId],
                set: {
                    version,
                    position,
                    linkedAt: new Date(),
                },
            });

            // Registrar en audit log
            await this.auditService.logLinked({
                assetId,
                entityType: 'message',
                entityId: messageId,
                accountId,
                actorId,
            });

            console.log(`[AssetRelations] Asset ${assetId} linked to message ${messageId}`);

            return {
                success: true,
                entityType: 'message',
                entityId: messageId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error linking asset to message:`, error);
            return {
                success: false,
                entityType: 'message',
                entityId: messageId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Obtener assets de un mensaje
     */
    async getMessageAssets(messageId: string): Promise<AssetWithMetadata[]> {
        const results = await db
            .select({
                assetId: messageAssets.assetId,
                version: messageAssets.version,
                position: messageAssets.position,
                linkedAt: messageAssets.linkedAt,
                name: assets.name,
                mimeType: assets.mimeType,
                sizeBytes: assets.sizeBytes,
                status: assets.status,
            })
            .from(messageAssets)
            .innerJoin(assets, eq(messageAssets.assetId, assets.id))
            .where(eq(messageAssets.messageId, messageId))
            .orderBy(messageAssets.position);

        return results.map(r => ({
            assetId: r.assetId,
            version: r.version,
            position: r.position,
            linkedAt: r.linkedAt,
            name: r.name,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes ? Number(r.sizeBytes) : null,
            status: r.status,
        }));
    }

    /**
     * Desvincular asset de mensaje
     */
    async unlinkAssetFromMessage(messageId: string, assetId: string, accountId: string, actorId?: string): Promise<LinkResult> {
        try {
            console.log(`[AssetRelations] Unlinking asset ${assetId} from message ${messageId}`);

            await db.delete(messageAssets).where(
                and(
                    eq(messageAssets.messageId, messageId),
                    eq(messageAssets.assetId, assetId)
                )
            );

            // Registrar en audit log
            await this.auditService.logUnlinked({
                assetId,
                entityType: 'message',
                entityId: messageId,
                accountId,
                actorId,
            });

            return {
                success: true,
                entityType: 'message',
                entityId: messageId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error unlinking asset from message:`, error);
            return {
                success: false,
                entityType: 'message',
                entityId: messageId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEMPLATE ASSETS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Vincular asset a template
     */
    async linkAssetToTemplate(params: LinkAssetToTemplateParams & { accountId: string; actorId?: string }): Promise<LinkResult> {
        const { templateId, assetId, version = 1, slot = 'default', accountId, actorId } = params;

        try {
            console.log(`[AssetRelations] Linking asset ${assetId} to template ${templateId} (slot: ${slot})`);

            // Verificar que el asset existe y pertenece a la cuenta
            const asset = await this.verifyAssetOwnership(assetId, accountId);
            if (!asset) {
                return {
                    success: false,
                    entityType: 'template',
                    entityId: templateId,
                    assetId,
                    error: 'Asset not found or access denied',
                };
            }

            // Insertar relación
            await db.insert(templateAssets).values({
                templateId,
                assetId,
                version,
                slot,
            }).onConflictDoUpdate({
                target: [templateAssets.templateId, templateAssets.assetId, templateAssets.slot],
                set: {
                    version,
                    linkedAt: new Date(),
                },
            });

            // Registrar en audit log
            await this.auditService.logLinked({
                assetId,
                entityType: 'template',
                entityId: templateId,
                accountId,
                actorId,
            });

            console.log(`[AssetRelations] Asset ${assetId} linked to template ${templateId}`);

            return {
                success: true,
                entityType: 'template',
                entityId: templateId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error linking asset to template:`, error);
            return {
                success: false,
                entityType: 'template',
                entityId: templateId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Obtener assets de un template
     */
    async getTemplateAssets(templateId: string): Promise<AssetWithMetadata[]> {
        const results = await db
            .select({
                assetId: templateAssets.assetId,
                version: templateAssets.version,
                slot: templateAssets.slot,
                linkedAt: templateAssets.linkedAt,
                name: assets.name,
                mimeType: assets.mimeType,
                sizeBytes: assets.sizeBytes,
                status: assets.status,
            })
            .from(templateAssets)
            .innerJoin(assets, eq(templateAssets.assetId, assets.id))
            .where(eq(templateAssets.templateId, templateId))
            .orderBy(templateAssets.slot);

        return results.map(r => ({
            assetId: r.assetId,
            version: r.version,
            slot: r.slot,
            linkedAt: r.linkedAt,
            name: r.name,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes ? Number(r.sizeBytes) : null,
            status: r.status,
        }));
    }

    /**
     * Desvincular asset de template
     */
    async unlinkAssetFromTemplate(templateId: string, assetId: string, slot: string, accountId: string, actorId?: string): Promise<LinkResult> {
        try {
            console.log(`[AssetRelations] Unlinking asset ${assetId} from template ${templateId} (slot: ${slot})`);

            await db.delete(templateAssets).where(
                and(
                    eq(templateAssets.templateId, templateId),
                    eq(templateAssets.assetId, assetId),
                    eq(templateAssets.slot, slot)
                )
            );

            // Registrar en audit log
            await this.auditService.logUnlinked({
                assetId,
                entityType: 'template',
                entityId: templateId,
                accountId,
                actorId,
            });

            return {
                success: true,
                entityType: 'template',
                entityId: templateId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error unlinking asset from template:`, error);
            return {
                success: false,
                entityType: 'template',
                entityId: templateId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PLAN ASSETS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Vincular asset a execution plan
     */
    async linkAssetToPlan(params: LinkAssetToPlanParams & { accountId: string; actorId?: string }): Promise<LinkResult> {
        const { planId, stepId, assetId, version = 1, dependencyType = 'required', accountId, actorId } = params;

        try {
            console.log(`[AssetRelations] Linking asset ${assetId} to plan ${planId} (step: ${stepId || 'all'}, type: ${dependencyType})`);

            // Verificar que el asset existe y pertenece a la cuenta
            const asset = await this.verifyAssetOwnership(assetId, accountId);
            if (!asset) {
                return {
                    success: false,
                    entityType: 'plan',
                    entityId: planId,
                    assetId,
                    error: 'Asset not found or access denied',
                };
            }

            // Determinar si el asset está ready
            const isReady = asset.status === 'ready';

            // Insertar relación
            await db.insert(planAssets).values({
                planId,
                stepId,
                assetId,
                version,
                dependencyType,
                isReady,
                readyAt: isReady ? new Date() : null,
            }).onConflictDoUpdate({
                target: [planAssets.planId, planAssets.assetId],
                set: {
                    stepId,
                    version,
                    dependencyType,
                    isReady,
                    readyAt: isReady ? new Date() : null,
                    linkedAt: new Date(),
                },
            });

            // Registrar en audit log
            await this.auditService.logLinked({
                assetId,
                entityType: 'plan',
                entityId: planId,
                accountId,
                actorId,
            });

            console.log(`[AssetRelations] Asset ${assetId} linked to plan ${planId}`);

            return {
                success: true,
                entityType: 'plan',
                entityId: planId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error linking asset to plan:`, error);
            return {
                success: false,
                entityType: 'plan',
                entityId: planId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Obtener assets de un plan
     */
    async getPlanAssets(planId: string, stepId?: string): Promise<AssetWithMetadata[]> {
        let query = db
            .select({
                assetId: planAssets.assetId,
                version: planAssets.version,
                dependencyType: planAssets.dependencyType,
                isReady: planAssets.isReady,
                linkedAt: planAssets.linkedAt,
                name: assets.name,
                mimeType: assets.mimeType,
                sizeBytes: assets.sizeBytes,
                status: assets.status,
            })
            .from(planAssets)
            .innerJoin(assets, eq(planAssets.assetId, assets.id))
            .where(eq(planAssets.planId, planId));

        if (stepId) {
            query = query.where(eq(planAssets.stepId, stepId)) as typeof query;
        }

        const results = await query;

        return results.map(r => ({
            assetId: r.assetId,
            version: r.version,
            dependencyType: r.dependencyType as DependencyType,
            isReady: r.isReady ?? false,
            linkedAt: r.linkedAt,
            name: r.name,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes ? Number(r.sizeBytes) : null,
            status: r.status,
        }));
    }

    /**
     * Obtener estado de assets de un plan
     */
    async getPlanAssetStatus(planId: string): Promise<PlanAssetStatus> {
        const results = await db
            .select({
                total: sql<number>`count(*)`,
                ready: sql<number>`count(*) filter (where ${planAssets.isReady} = true)`,
                required: sql<number>`count(*) filter (where ${planAssets.dependencyType} = 'required' and ${planAssets.isReady} = false)`,
            })
            .from(planAssets)
            .where(eq(planAssets.planId, planId));

        const stats = results[0] || { total: 0, ready: 0, required: 0 };

        return {
            planId,
            totalAssets: Number(stats.total),
            readyAssets: Number(stats.ready),
            pendingAssets: Number(stats.total) - Number(stats.ready),
            canProceed: Number(stats.required) === 0,
        };
    }

    /**
     * Marcar asset como ready en un plan
     */
    async markPlanAssetReady(planId: string, assetId: string): Promise<boolean> {
        try {
            await db.update(planAssets)
                .set({
                    isReady: true,
                    readyAt: new Date(),
                })
                .where(
                    and(
                        eq(planAssets.planId, planId),
                        eq(planAssets.assetId, assetId)
                    )
                );

            console.log(`[AssetRelations] Asset ${assetId} marked as ready in plan ${planId}`);
            return true;
        } catch (error) {
            console.error(`[AssetRelations] Error marking asset as ready:`, error);
            return false;
        }
    }

    /**
     * Desvincular asset de plan
     */
    async unlinkAssetFromPlan(planId: string, assetId: string, accountId: string, actorId?: string): Promise<LinkResult> {
        try {
            console.log(`[AssetRelations] Unlinking asset ${assetId} from plan ${planId}`);

            await db.delete(planAssets).where(
                and(
                    eq(planAssets.planId, planId),
                    eq(planAssets.assetId, assetId)
                )
            );

            // Registrar en audit log
            await this.auditService.logUnlinked({
                assetId,
                entityType: 'plan',
                entityId: planId,
                accountId,
                actorId,
            });

            return {
                success: true,
                entityType: 'plan',
                entityId: planId,
                assetId,
            };
        } catch (error) {
            console.error(`[AssetRelations] Error unlinking asset from plan:`, error);
            return {
                success: false,
                entityType: 'plan',
                entityId: planId,
                assetId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Verificar que el asset existe y pertenece a la cuenta
     */
    private async verifyAssetOwnership(assetId: string, accountId: string): Promise<{ id: string; status: string } | null> {
        const result = await db
            .select({ id: assets.id, status: assets.status })
            .from(assets)
            .where(
                and(
                    eq(assets.id, assetId),
                    eq(assets.accountId, accountId)
                )
            )
            .limit(1);

        return result[0] || null;
    }

    /**
     * Obtener todas las entidades vinculadas a un asset
     */
    async getAssetLinks(assetId: string): Promise<{
        messages: { messageId: string; version: number; position: number }[];
        templates: { templateId: string; version: number; slot: string }[];
        plans: { planId: string; stepId: string | null; version: number; dependencyType: string }[];
    }> {
        const [messages, templates, plans] = await Promise.all([
            db.select({
                messageId: messageAssets.messageId,
                version: messageAssets.version,
                position: messageAssets.position,
            }).from(messageAssets).where(eq(messageAssets.assetId, assetId)),

            db.select({
                templateId: templateAssets.templateId,
                version: templateAssets.version,
                slot: templateAssets.slot,
            }).from(templateAssets).where(eq(templateAssets.assetId, assetId)),

            db.select({
                planId: planAssets.planId,
                stepId: planAssets.stepId,
                version: planAssets.version,
                dependencyType: planAssets.dependencyType,
            }).from(planAssets).where(eq(planAssets.assetId, assetId)),
        ]);

        return { messages, templates, plans };
    }
}

// Singleton
let instance: AssetRelationsService | null = null;

export function getAssetRelationsService(): AssetRelationsService {
    if (!instance) {
        instance = new AssetRelationsService();
    }
    return instance;
}
