import { FluxCoreCapability } from './index';
import { retrievalService } from '../../services/retrieval.service';
import { permissionService } from '../../services/permission.service';

/**
 * Knowledge Capability
 * Centraliza el acceso al RAG (Retrieval Augmented Generation) como una herramienta del sistema.
 */
export const SYSTEM_SEARCH_KNOWLEDGE: FluxCoreCapability = {
    name: 'search_knowledge',
    description: 'Busca información relevante en la base de conocimiento del negocio (precios, políticas, procesos, etc).',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'search_knowledge',
            description:
                'Busca información relevante en la base de conocimiento del asistente. ' +
                'Usa esta herramienta SOLO cuando necesites datos específicos que no están en la conversación, ' +
                'como precios, políticas, procedimientos, especificaciones técnicas, horarios, requisitos, etc.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Consulta de búsqueda autosuficiente en lenguaje natural. ' +
                            'Debe contener toda la información necesaria para encontrar documentos relevantes.',
                    },
                },
                required: ['query'],
                additionalProperties: false,
            },
        },
    },
    execute: async (context: { accountId: string }, args: any) => {
        const { query } = args;
        if (!query) throw new Error('query is required');

        // Buscar todos los vector stores accesibles para esta cuenta
        const accessible = await permissionService.listAccessibleAssets({
            accountId: context.accountId,
            assetType: 'vector_store',
        });

        const vsIds = accessible.map(a => a.assetId);

        if (vsIds.length === 0) {
            return {
                found: false,
                context: '',
                sources: [],
                chunksUsed: 0,
                totalTokens: 0
            };
        }

        const ragContext = await retrievalService.buildContext(query, vsIds, context.accountId);

        return {
            found: ragContext.chunksUsed > 0,
            context: ragContext.context,
            sources: ragContext.sources?.map(s => s.source) || [],
            chunksUsed: ragContext.chunksUsed,
            totalTokens: ragContext.totalTokens
        };
    }
};
