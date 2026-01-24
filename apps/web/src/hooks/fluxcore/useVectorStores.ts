import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { VectorStore, VectorStoreCreate } from '../../types/fluxcore';

/**
 * useVectorStores Hook
 * 
 * Gestiona el estado y operaciones CRUD de las bases de conocimiento (Vector Stores).
 */
export function useVectorStores(accountId: string) {
    const { token } = useAuthStore();
    const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Cargar lista de vector stores
     */
    const loadStores = useCallback(async () => {
        if (!accountId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/vector-stores?accountId=${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setVectorStores(data.data || []);
            } else {
                setError(data.message || 'Error al cargar bases de conocimiento');
            }
        } catch (err) {
            console.error('[useVectorStores] Error loading stores:', err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [accountId, token]);

    /**
     * Crear nuevo vector store
     */
    const createVectorStore = useCallback(async (data: VectorStoreCreate) => {
        if (!token) return null;
        try {
            const res = await fetch('/api/fluxcore/vector-stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...data, accountId })
            });
            const result = await res.json();
            if (result.success && result.data) {
                setVectorStores(prev => [...prev, result.data]);
                return result.data as VectorStore;
            }
            return null;
        } catch (err) {
            console.error('[useVectorStores] Error creating store:', err);
            return null;
        }
    }, [token, accountId]);

    /**
     * Actualizar vector store
     */
    const updateVectorStore = useCallback(async (id: string, updates: Partial<VectorStore>) => {
        if (!token) return null;
        setIsSaving(true);
        try {
            const payload: any = { ...updates, accountId };
            // ZOD FIX: Ensure description/name is never null, always use undefined or string
            if (payload.description === null) delete payload.description;
            if (payload.name === null) delete payload.name;

            const res = await fetch(`/api/fluxcore/vector-stores/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                // Actualización optimista se maneja en la vista
                return result.data as VectorStore;
            } else {
                setError(result.message || 'Error al guardar cambios');
                return null;
            }
        } catch (err) {
            console.error('[useVectorStores] Error updating store:', err);
            setError('Error de conexión');
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [token, accountId]);

    /**
     * Eliminar vector store
     */
    const deleteVectorStore = useCallback(async (id: string) => {
        if (!token) return false;
        try {
            const res = await fetch(`/api/fluxcore/vector-stores/${id}?accountId=${accountId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setVectorStores(prev => prev.filter(s => s.id !== id));
                return true;
            }
            return false;
        } catch (err) {
            console.error('[useVectorStores] Error deleting store:', err);
            return false;
        }
    }, [token, accountId]);

    /**
     * Actualización Local (Solo UI)
     */
    const updateLocalStore = useCallback((id: string, updates: Partial<VectorStore>) => {
        setVectorStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } as VectorStore : s));
    }, []);

    // Carga inicial
    useEffect(() => {
        loadStores();
    }, [loadStores]);

    return {
        vectorStores,
        loading,
        error,
        isSaving,
        createVectorStore,
        updateVectorStore,
        updateLocalStore,
        deleteVectorStore,
        refresh: loadStores,
        setError
    };
}

export default useVectorStores;
