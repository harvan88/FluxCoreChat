/**
 * Asset Relations Routes
 * 
 * Endpoints REST para gestionar relaciones entre assets y entidades:
 * - /messages/:id/assets - Assets de mensajes
 * - /templates/:id/assets - Assets de templates
 * - /plans/:id/assets - Assets de execution plans
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { Elysia, t } from 'elysia';
import { getAssetRelationsService } from '../services/asset-relations.service';

// ════════════════════════════════════════════════════════════════════════════
// Schemas de validación
// ════════════════════════════════════════════════════════════════════════════

const linkAssetToMessageSchema = t.Object({
    assetId: t.String({ minLength: 1 }),
    version: t.Optional(t.Number({ minimum: 1 })),
    position: t.Optional(t.Number({ minimum: 0 })),
});

const linkAssetToTemplateSchema = t.Object({
    assetId: t.String({ minLength: 1 }),
    version: t.Optional(t.Number({ minimum: 1 })),
    slot: t.Optional(t.String({ minLength: 1 })),
});

const linkAssetToPlanSchema = t.Object({
    assetId: t.String({ minLength: 1 }),
    stepId: t.Optional(t.String()),
    version: t.Optional(t.Number({ minimum: 1 })),
    dependencyType: t.Optional(t.Union([
        t.Literal('required'),
        t.Literal('optional'),
        t.Literal('output'),
    ])),
});

// ════════════════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════════════════

export const assetRelationsRoutes = new Elysia({ prefix: '/api' })

    // ════════════════════════════════════════════════════════════════════════
    // MESSAGE ASSETS
    // ════════════════════════════════════════════════════════════════════════

    .post('/messages/:messageId/assets', async ({ params, body, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.linkAssetToMessage({
            messageId: params.messageId,
            assetId: body.assetId,
            version: body.version,
            position: body.position,
            accountId,
        });

        return {
            success: result.success,
            data: result.success ? {
                messageId: result.entityId,
                assetId: result.assetId,
            } : undefined,
            error: result.error,
        };
    }, {
        params: t.Object({ messageId: t.String() }),
        body: linkAssetToMessageSchema,
        query: t.Object({ accountId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Link asset to message',
            description: 'Vincula un asset a un mensaje',
        },
    })

    .get('/messages/:messageId/assets', async ({ params }) => {
        const service = getAssetRelationsService();
        const assets = await service.getMessageAssets(params.messageId);

        return {
            success: true,
            data: assets,
        };
    }, {
        params: t.Object({ messageId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Get message assets',
            description: 'Obtiene los assets vinculados a un mensaje',
        },
    })

    .delete('/messages/:messageId/assets/:assetId', async ({ params, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.unlinkAssetFromMessage(
            params.messageId,
            params.assetId,
            accountId
        );

        return {
            success: result.success,
            error: result.error,
        };
    }, {
        params: t.Object({ messageId: t.String(), assetId: t.String() }),
        query: t.Object({ accountId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Unlink asset from message',
            description: 'Desvincula un asset de un mensaje',
        },
    })

    // ════════════════════════════════════════════════════════════════════════
    // TEMPLATE ASSETS
    // ════════════════════════════════════════════════════════════════════════

    .post('/templates/:templateId/assets', async ({ params, body, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.linkAssetToTemplate({
            templateId: params.templateId,
            assetId: body.assetId,
            version: body.version,
            slot: body.slot,
            accountId,
        });

        return {
            success: result.success,
            data: result.success ? {
                templateId: result.entityId,
                assetId: result.assetId,
            } : undefined,
            error: result.error,
        };
    }, {
        params: t.Object({ templateId: t.String() }),
        body: linkAssetToTemplateSchema,
        query: t.Object({ accountId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Link asset to template',
            description: 'Vincula un asset a una plantilla',
        },
    })

    .get('/templates/:templateId/assets', async ({ params }) => {
        const service = getAssetRelationsService();
        const assets = await service.getTemplateAssets(params.templateId);

        return {
            success: true,
            data: assets,
        };
    }, {
        params: t.Object({ templateId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Get template assets',
            description: 'Obtiene los assets vinculados a una plantilla',
        },
    })

    .delete('/templates/:templateId/assets/:assetId', async ({ params, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;
        const slot = query.slot || 'default';

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.unlinkAssetFromTemplate(
            params.templateId,
            params.assetId,
            slot,
            accountId
        );

        return {
            success: result.success,
            error: result.error,
        };
    }, {
        params: t.Object({ templateId: t.String(), assetId: t.String() }),
        query: t.Object({ accountId: t.String(), slot: t.Optional(t.String()) }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Unlink asset from template',
            description: 'Desvincula un asset de una plantilla',
        },
    })

    // ════════════════════════════════════════════════════════════════════════
    // PLAN ASSETS
    // ════════════════════════════════════════════════════════════════════════

    .post('/plans/:planId/assets', async ({ params, body, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.linkAssetToPlan({
            planId: params.planId,
            assetId: body.assetId,
            stepId: body.stepId,
            version: body.version,
            dependencyType: body.dependencyType,
            accountId,
        });

        return {
            success: result.success,
            data: result.success ? {
                planId: result.entityId,
                assetId: result.assetId,
            } : undefined,
            error: result.error,
        };
    }, {
        params: t.Object({ planId: t.String() }),
        body: linkAssetToPlanSchema,
        query: t.Object({ accountId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Link asset to plan',
            description: 'Vincula un asset a un execution plan',
        },
    })

    .get('/plans/:planId/assets', async ({ params, query }) => {
        const service = getAssetRelationsService();
        const assets = await service.getPlanAssets(params.planId, query.stepId);

        return {
            success: true,
            data: assets,
        };
    }, {
        params: t.Object({ planId: t.String() }),
        query: t.Object({ stepId: t.Optional(t.String()) }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Get plan assets',
            description: 'Obtiene los assets vinculados a un execution plan',
        },
    })

    .get('/plans/:planId/assets/status', async ({ params }) => {
        const service = getAssetRelationsService();
        const status = await service.getPlanAssetStatus(params.planId);

        return {
            success: true,
            data: status,
        };
    }, {
        params: t.Object({ planId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Get plan asset status',
            description: 'Obtiene el estado de disponibilidad de assets de un plan',
        },
    })

    .post('/plans/:planId/assets/:assetId/ready', async ({ params }) => {
        const service = getAssetRelationsService();
        const success = await service.markPlanAssetReady(params.planId, params.assetId);

        return {
            success,
            error: success ? undefined : 'Failed to mark asset as ready',
        };
    }, {
        params: t.Object({ planId: t.String(), assetId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Mark plan asset as ready',
            description: 'Marca un asset como listo en un execution plan',
        },
    })

    .delete('/plans/:planId/assets/:assetId', async ({ params, query }) => {
        const service = getAssetRelationsService();
        const accountId = query.accountId;

        if (!accountId) {
            return {
                success: false,
                error: 'accountId is required',
            };
        }

        const result = await service.unlinkAssetFromPlan(
            params.planId,
            params.assetId,
            accountId
        );

        return {
            success: result.success,
            error: result.error,
        };
    }, {
        params: t.Object({ planId: t.String(), assetId: t.String() }),
        query: t.Object({ accountId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Unlink asset from plan',
            description: 'Desvincula un asset de un execution plan',
        },
    })

    // ════════════════════════════════════════════════════════════════════════
    // ASSET LINKS (reverse lookup)
    // ════════════════════════════════════════════════════════════════════════

    .get('/assets/:assetId/links', async ({ params }) => {
        const service = getAssetRelationsService();
        const links = await service.getAssetLinks(params.assetId);

        return {
            success: true,
            data: links,
        };
    }, {
        params: t.Object({ assetId: t.String() }),
        detail: {
            tags: ['Asset Relations'],
            summary: 'Get asset links',
            description: 'Obtiene todas las entidades vinculadas a un asset',
        },
    });
