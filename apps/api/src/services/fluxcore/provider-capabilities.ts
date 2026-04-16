/**
 * Provider Capabilities Registry — FluxCore v8.6
 *
 * Registro agnóstico de especificaciones técnicas por modelo.
 * El runtime consulta este registro para decidir qué features
 * enviar al proveedor, sin acoplar lógica de negocio a ningún proveedor.
 *
 * Para agregar un modelo nuevo: añadir una línea a MODEL_CAPABILITIES.
 * Para agregar un proveedor nuevo: solo asegurar que su base URL
 * esté en llm-client.service.ts — aquí no cambia nada.
 */

export interface ModelCapabilities {
    /** Soporta response_format: { type: 'json_object' } */
    supportsResponseFormat: boolean;
    /** Soporta tool calling (function calling) */
    supportsTools: boolean;
    /** Soporta el rol 'system' en mensajes */
    supportsSystemRole: boolean;
    /** Ventana de contexto máxima en tokens */
    maxContextTokens: number;
}

/**
 * Registro de capacidades por modelo.
 * Fuente: documentación oficial de cada proveedor.
 */
const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
    // ── OpenAI ────────────────────────────────────────────────────────────
    'gpt-4o':                    { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 128000 },
    'gpt-4o-mini':               { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 128000 },
    'gpt-4o-mini-2024-07-18':    { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 128000 },
    'gpt-4-turbo':               { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 128000 },
    'gpt-4':                     { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 8192 },
    'gpt-3.5-turbo':             { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 16385 },

    // ── Groq ─────────────────────────────────────────────────────────────
    'llama-3.1-8b-instant':      { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 131072 },
    'llama-3.1-70b-versatile':   { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 131072 },
    'llama-3.3-70b-versatile':   { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 131072 },
    'mixtral-8x7b-32768':        { supportsResponseFormat: true, supportsTools: true, supportsSystemRole: true, maxContextTokens: 32768 },

    // ── Anthropic (futuro) ───────────────────────────────────────────────
    'claude-3-5-sonnet-latest':  { supportsResponseFormat: false, supportsTools: true, supportsSystemRole: true, maxContextTokens: 200000 },
    'claude-3-5-haiku-latest':   { supportsResponseFormat: false, supportsTools: true, supportsSystemRole: true, maxContextTokens: 200000 },
};

/**
 * Fallback conservador para modelos no registrados.
 * Asume mínimas capacidades para evitar errores de API.
 */
const DEFAULT_CAPABILITIES: ModelCapabilities = {
    supportsResponseFormat: false,
    supportsTools: false,
    supportsSystemRole: true,
    maxContextTokens: 8192,
};

/**
 * Obtiene las capacidades técnicas de un modelo.
 * Si el modelo no está registrado, retorna defaults conservadores.
 */
export function getModelCapabilities(model: string): ModelCapabilities {
    return MODEL_CAPABILITIES[model] ?? DEFAULT_CAPABILITIES;
}
