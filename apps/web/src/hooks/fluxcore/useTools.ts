import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { Tool, ToolDefinition, ToolConnection } from '../../types/fluxcore';

/**
 * useTools Hook
 * 
 * Gestiona el estado y operaciones de las herramientas (Tools).
 * Realiza el join entre conexiones y definiciones.
 */
export function useTools(accountId: string) {
    const { token } = useAuthStore();
    const [connections, setConnections] = useState<ToolConnection[]>([]);
    const [definitions, setDefinitions] = useState<ToolDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Cargar herramientas (conexiones + definiciones)
     */
    const loadTools = useCallback(async () => {
        if (!accountId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [connectionsRes, definitionsRes] = await Promise.all([
                fetch(`/api/fluxcore/tools/connections?accountId=${accountId}`, { headers }),
                fetch(`/api/fluxcore/tools/definitions`, { headers }),
            ]);

            const [connectionsData, definitionsData] = await Promise.all([
                connectionsRes.json(),
                definitionsRes.json(),
            ]);

            if (connectionsData.success && definitionsData.success) {
                setConnections(connectionsData.data || []);
                setDefinitions(definitionsData.data || []);
            } else {
                setError('Error al cargar herramientas');
            }
        } catch (err) {
            console.error('Error loading tools:', err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [accountId, token]);

    /**
     * Herramientas "join" (para mostrar en selectores y listas)
     */
    const joinedTools = useMemo((): Tool[] => {
        return connections.map(conn => {
            const def = definitions.find(d => d.id === conn.toolDefinitionId);
            return {
                id: conn.id,
                name: def?.name || 'Herramienta desconocida',
                type: def?.type || 'unknown',
                enabled: conn.enabled,
                config: conn.config,
            };
        });
    }, [connections, definitions]);

    // Carga inicial
    useEffect(() => {
        loadTools();
    }, [loadTools]);

    return {
        tools: joinedTools,
        definitions,
        connections,
        loading,
        error,
        refresh: loadTools
    };
}

export default useTools;
