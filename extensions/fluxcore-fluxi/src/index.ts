import { workResolver } from '../../../apps/api/src/core/WorkResolver';
import { workEngineService } from '../../../apps/api/src/services/work-engine.service';
import { wesInterpreter } from './interpreter';

/**
 * Fluxi (WES) Extension
 * FC-CANON: Motor determinista de trabajos.
 */
export class FluxiExtension {
    public readonly id = '@fluxcore/fluxi';

    /**
     * WES-180: Bridge to call interpreter from extension context
     */
    async getInterpreter() {
        return wesInterpreter;
    }

    async onMessage(params: any): Promise<any> {
        const { accountId, conversationId, relationshipId, message } = params;
        const messageText = typeof message.content?.text === 'string' ? message.content.text : '';

        // 1. WES-155: Check for Deterministic Semantic Confirmation (Step 0)
        const semanticMatch = await workEngineService.resolveSemanticMatch(
            accountId,
            conversationId,
            messageText
        );

        if (semanticMatch) {
            console.log(`[FluxiExtension] ✅ Semantic Commitment detected for context ${semanticMatch.id}`);
            await workEngineService.commitSemanticConfirmation(
                semanticMatch.id,
                message.id
            );

            return {
                handled: true,
                stopPropagation: true,
                actions: [{ type: 'wes:semantic_commit', contextId: semanticMatch.id }]
            };
        }

        // 2. WOS-100: Canonical Routing Logic (Check for Active Work)
        const resolution = await workResolver.resolve({
            accountId: accountId,
            relationshipId: relationshipId,
            conversationId: conversationId,
        });

        if (resolution.type === 'RESUME_WORK') {
            const workId = 'workId' in resolution ? resolution.workId : 'unknown';
            console.log(`[FluxiExtension] 🚦 Resuming Work ${workId} for conversation ${conversationId}`);

            // WES-150: Ingest message into WorkEngine (WIP)
            // await workEngineService.ingestMessage(workId, message);

            return {
                handled: true,
                stopPropagation: true, // Active Work takes precedence over other extensions/IA
                actions: [{ type: 'wes:resume_work', workId }]
            };
        }

        // Si no hay Work activo ni confirmación semántica, permitimos que el pipeline continúe
        return {
            handled: false,
            stopPropagation: false
        };
    }
}

export const fluxiExtension = new FluxiExtension();
export const getFluxCore = () => fluxiExtension;
