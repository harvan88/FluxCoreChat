import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { Assistant, AssistantCreate, AssistantUpdate } from '../../types/fluxcore';
import { emitAssistantUpdateEvent } from './events';

/**
 * useAssistants Hook
 * 
 * Gestiona el estado y operaciones CRUD de los asistentes.
 * Centraliza la lógica de AssistantsView.tsx.
 */
export function useAssistants(accountId: string) {
    const { token } = useAuthStore();
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Cargar lista de asistentes
     */
    const loadAssistants = useCallback(async () => {
        if (!accountId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/assistants?accountId=${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAssistants(data.data || []);
            } else {
                setError(data.message || 'Error al cargar asistentes');
            }
        } catch (err) {
            console.error('Error loading assistants:', err);
            setError('Error de conexión al cargar asistentes');
        } finally {
            setLoading(false);
        }
    }, [accountId, token]);

    /**
     * Crear nuevo asistente
     */
    const createAssistant = useCallback(async (data: AssistantCreate) => {
        if (!token) return null;
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/assistants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success && result.data) {
                setAssistants(prev => [...prev, result.data]);
                emitAssistantUpdateEvent({ accountId, assistantId: result.data.id, action: 'create' });
                return result.data as Assistant;
            } else {
                setError(result.message || 'Error al crear asistente');
                return null;
            }
        } catch (err) {
            console.error('Error creating assistant:', err);
            setError('Error de conexión');
            return null;
        }
    }, [token]);

    /**
     * Actualizar asistente (Optimista)
     */
    const updateAssistant = useCallback(async (id: string, updates: Partial<AssistantUpdate>) => {
        if (!token) return null;

        // Actualización local inmediata
        setAssistants(prev => prev.map(a => a.id === id ? { ...a, ...updates } as Assistant : a));

        setIsSaving(true);
        setError(null);
        try {
            const bodyPayload = { ...updates, accountId };
            const res = await fetch(`/api/fluxcore/assistants/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyPayload)
            });
            const result = await res.json();
            if (result.success) {
                emitAssistantUpdateEvent({ accountId, assistantId: id, action: 'update' });
                return result.data as Assistant;
            } else {
                setError(result.message || 'Error al guardar cambios');
                // Revertir optimismo si falla
                await loadAssistants();
                return null;
            }
        } catch (err) {
            console.error('Error updating assistant:', err);
            setError('Error de conexión');
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [token, accountId]);

    /**
     * Eliminar asistente
     */
    const deleteAssistant = useCallback(async (id: string) => {
        if (!token) return false;
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/assistants/${id}?accountId=${accountId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setAssistants(prev => prev.filter(a => a.id !== id));
                emitAssistantUpdateEvent({ accountId, assistantId: id, action: 'delete' });
                return true;
            } else {
                setError(result.message || 'Error al eliminar asistente');
                return false;
            }
        } catch (err) {
            console.error('Error deleting assistant:', err);
            setError('Error de conexión');
            return false;
        }
    }, [token, accountId]);

    /**
     * Activar asistente (fija este como activo para la cuenta)
     */
    const activateAssistant = useCallback(async (id: string) => {
        if (!token) return false;
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/assistants/${id}/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ accountId })
            });
            const result = await res.json();
            if (result.success) {
                emitAssistantUpdateEvent({ accountId, assistantId: id, action: 'activate' });
                // Al activar uno, otros podrían haber cambiado de estado en el backend
                // Mejor recargar la lista completa para sincronizar estados de 'active' -> 'disabled'
                await loadAssistants();
                return true;
            } else {
                setError(result.message || 'Error al activar asistente');
                return false;
            }
        } catch (err) {
            console.error('Error activating assistant:', err);
            setError('Error de conexión');
            return false;
        }
    }, [token, accountId, loadAssistants]);

    /**
     * Obtener configuración activa (runtime)
     */
    const getActiveConfig = useCallback(async () => {
        if (!accountId || !token) return null;
        try {
            const res = await fetch(`/api/fluxcore/runtime/active-assistant?accountId=${encodeURIComponent(accountId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (err) {
            console.error('Error getting active config:', err);
            return null;
        }
    }, [accountId, token]);

    /**
     * Obtener estado raw de un asistente desde la DB (para verificación de persistencia)
     */
    const getAssistantFromDB = useCallback(async (assistantId: string) => {
        if (!accountId || !token || !assistantId) return null;
        try {
            const res = await fetch(`/api/fluxcore/assistants/${assistantId}?accountId=${encodeURIComponent(accountId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (err) {
            console.error('Error getting assistant from DB:', err);
            return null;
        }
    }, [accountId, token]);

    // Ordenar asistentes: activos primero, luego por fecha de modificación
    const sortedAssistants = useMemo(() => {
        return [...assistants].sort((a, b) => {
            const aActive = a.status === 'active' ? 1 : 0;
            const bActive = b.status === 'active' ? 1 : 0;
            if (aActive !== bActive) return bActive - aActive;

            const aTs = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTs = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTs - aTs;
        });
    }, [assistants]);

    // Carga inicial
    useEffect(() => {
        loadAssistants();
    }, [loadAssistants]);

    /**
     * Actualizar asistente localmente (Solo UI)
     */
    const updateLocalAssistant = useCallback((id: string, updates: Partial<Assistant>) => {
        setAssistants(prev => prev.map(a => a.id === id ? { ...a, ...updates } as Assistant : a));
    }, []);

    return {
        assistants: sortedAssistants,
        loading,
        error,
        isSaving,
        createAssistant,
        updateAssistant,
        updateLocalAssistant,
        deleteAssistant,
        activateAssistant,
        getActiveConfig,
        getAssistantFromDB,
        refresh: loadAssistants,
        setError
    };
}

export default useAssistants;
