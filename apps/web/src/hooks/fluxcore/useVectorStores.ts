import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { VectorStore, VectorStoreCreate, VectorStoreUpdate } from '../../types/fluxcore';

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

    /**
     * Cargar lista de vector stores
     */
    const loadVectorStores = useCallback(async () => {
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
                setError(data.message || 'Error al cargar vector stores');
            }
        } catch (err) {
            console.error('Error loading vector stores:', err);
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
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success && result.data) {
                setVectorStores(prev => [...prev, result.data]);
                return result.data as VectorStore;
            }
            return null;
        } catch (err) {
            console.error('Error creating vector store:', err);
            return null;
        }
    }, [token]);

    /**
     * Actualizar vector store
     */
    const updateVectorStore = useCallback(async (id: string, updates: Partial<VectorStoreUpdate>) => {
        if (!token) return null;
        try {
            const res = await fetch(`/api/fluxcore/vector-stores/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...updates, accountId })
            });
            const result = await res.json();
            if (result.success && result.data) {
                setVectorStores(prev => prev.map(vs => vs.id === id ? result.data : vs));
                return result.data as VectorStore;
            }
            return null;
        } catch (err) {
            console.error('Error updating vector store:', err);
            return null;
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
                setVectorStores(prev => prev.filter(vs => vs.id !== id));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error deleting vector store:', err);
            return false;
        }
    }, [token, accountId]);

    // Carga inicial
    useEffect(() => {
        loadVectorStores();
    }, [loadVectorStores]);

    return {
        vectorStores,
        loading,
        error,
        createVectorStore,
        updateVectorStore,
        deleteVectorStore,
        refresh: loadVectorStores
    };
}

export default useVectorStores;
