import { FluxCoreCapability } from './index';
import { retrievalService } from '../../services/retrieval.service';
import { permissionService } from '../../services/permission.service';

/**
 * Knowledge Capability
 * Centraliza el acceso al RAG (Retrieval Augmented Generation) como una herramienta del sistema.
 */
export const SYSTEM_SEARCH_KNOWLEDGE: FluxCoreCapability = {
    id: 'fluxcore.search_knowledge',
    slug: 'search_knowledge',
    version: '1.0.0',
    domain: 'fluxcore',
    kind: 'query',
    translationStrategy: 'tool_and_instruction',
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
    outputSchema: {
        type: 'object',
        properties: {
            found: { type: 'boolean' },
            context: { type: 'string' },
            sources: { type: 'array', items: { type: 'string' } },
            chunksUsed: { type: 'number' },
            totalTokens: { type: 'number' },
        },
    },
    usageHints: [
        'Usar cuando falten datos específicos del negocio en el contexto conversacional.',
        'No usar para información ya presente en el historial o en instrucciones autorizadas.',
    ],
    instructionBlock: `### Herramienta de Base de Conocimiento

Tienes acceso a la herramienta \`search_knowledge\` que busca en la base de conocimiento del negocio.

**CUÁNDO USARLA:**
- Cuando el usuario pregunte por información específica: precios, horarios, políticas, procedimientos, requisitos, especificaciones, servicios, productos, ubicaciones.
- Cuando necesites datos concretos que no están en la conversación ni en tus instrucciones.
- Cuando el usuario haga una pregunta que probablemente tenga respuesta en documentos del negocio.

**CUÁNDO NO USARLA:**
- Saludos: "hola", "buenas", "qué tal"
- Confirmaciones: "dale", "ok", "sí", "perfecto", "listo"
- Despedidas: "chau", "gracias", "nos vemos"
- Conversación casual que no requiere datos específicos
- Si ya tienes la información en la conversación actual

**CÓMO FORMULAR LA QUERY:**
- La query debe ser autosuficiente: incluir todo el contexto necesario para encontrar la información.
- Desambiguar referencias: si el usuario dice "eso", "lo otro", reemplazar por el término concreto de la conversación.
- Usar términos específicos del dominio, no lenguaje coloquial.
- Ejemplos:
  - Usuario: "¿cuánto sale?" (hablando del plan premium) → query: "precio plan premium"
  - Usuario: "¿y los horarios?" → query: "horarios de atención"
  - Usuario: "¿qué incluye?" (hablando del servicio de mantenimiento) → query: "qué incluye servicio de mantenimiento"

**IMPORTANTE:** Responde SIEMPRE en el idioma del usuario. Si la búsqueda no encuentra resultados relevantes, indícalo honestamente.`,
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
