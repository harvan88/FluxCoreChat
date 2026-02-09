import type { OpenAIToolDef } from '../openai-compatible-client';

/**
 * search_knowledge — Tool definition for RAG-as-tool pattern.
 *
 * The LLM decides when to search the knowledge base and formulates
 * the optimal query based on the full conversational context.
 */
export const SEARCH_KNOWLEDGE_TOOL_DEF: OpenAIToolDef = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description:
      'Busca información relevante en la base de conocimiento del asistente. ' +
      'Usa esta herramienta SOLO cuando necesites datos específicos que no están en la conversación, ' +
      'como precios, políticas, procedimientos, especificaciones técnicas, horarios, requisitos, etc. ' +
      'NO la uses para saludos, confirmaciones ("dale", "ok", "sí"), despedidas, agradecimientos ' +
      'ni acciones que no requieren información adicional.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Consulta de búsqueda autosuficiente en lenguaje natural. ' +
            'Debe contener toda la información necesaria para encontrar documentos relevantes, ' +
            'sin depender del contexto de la conversación. ' +
            'Ejemplo: en vez de "¿cuánto cuesta eso?", usar "precio plan empresarial mensual".',
        },
      },
      required: ['query'],
    },
  },
};

export interface SearchKnowledgeArgs {
  query: string;
}

/**
 * System prompt instruction block injected when vector stores are available.
 * Teaches the model when/how to use search_knowledge and how to formulate queries.
 */
export const SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION = `
### Herramienta de Base de Conocimiento

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

**IMPORTANTE:** Responde SIEMPRE en el idioma del usuario. Si la búsqueda no encuentra resultados relevantes, indícalo honestamente.
`.trim();

/**
 * Parses and validates search_knowledge arguments from the model's tool call.
 * Returns a valid SearchKnowledgeArgs or null if parsing/validation fails.
 */
export function parseSearchKnowledgeArgs(
  rawArguments: string,
  fallbackQuery: string
): SearchKnowledgeArgs {
  try {
    const parsed = JSON.parse(rawArguments);
    if (
      parsed &&
      typeof parsed.query === 'string' &&
      parsed.query.trim().length > 0 &&
      parsed.query.trim().length <= 500
    ) {
      return { query: parsed.query.trim() };
    }
  } catch {
    // JSON parse failed
  }

  // Fallback: use the original user message as query
  console.warn('[fluxcore] search_knowledge args invalid or empty, falling back to user message');
  return { query: fallbackQuery };
}
