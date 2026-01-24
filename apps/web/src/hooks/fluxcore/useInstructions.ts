import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { Instruction, InstructionCreate, InstructionUpdate } from '../../types/fluxcore';

/**
 * useInstructions Hook
 * 
 * Gestiona el estado y operaciones CRUD de las instrucciones del sistema.
 */
export function useInstructions(accountId: string) {
    const { token } = useAuthStore();
    const [instructions, setInstructions] = useState<Instruction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Cargar lista de instrucciones
     */
    const loadInstructions = useCallback(async () => {
        if (!accountId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/instructions?accountId=${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setInstructions(data.data || []);
            } else {
                setError(data.message || 'Error al cargar instrucciones');
            }
        } catch (err) {
            console.error('Error loading instructions:', err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [accountId, token]);

    /**
     * Crear nueva instrucción
     */
    const createInstruction = useCallback(async (data: InstructionCreate) => {
        if (!token) return null;
        try {
            const res = await fetch('/api/fluxcore/instructions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success && result.data) {
                setInstructions(prev => [...prev, result.data]);
                return result.data as Instruction;
            }
            return null;
        } catch (err) {
            console.error('Error creating instruction:', err);
            return null;
        }
    }, [token]);

    /**
     * Actualizar instrucción
     */
    const updateInstruction = useCallback(async (id: string, updates: Partial<InstructionUpdate>) => {
        if (!token) return null;
        try {
            const res = await fetch(`/api/fluxcore/instructions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...updates, accountId })
            });
            const result = await res.json();
            if (result.success) {
                // No sobreescribimos con result.data para evitar parpadeos si faltan campos
                return result.data as Instruction;
            } else {
                setError(result.message || 'Error al guardar cambios');
                // Revertir optimismo si falla
                await loadInstructions();
                return null;
            }
        } catch (err) {
            console.error('Error updating instruction:', err);
            return null;
        }
    }, [token, accountId]);

    /**
     * Eliminar instrucción
     */
    const deleteInstruction = useCallback(async (id: string) => {
        if (!token) return false;
        try {
            const res = await fetch(`/api/fluxcore/instructions/${id}?accountId=${accountId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setInstructions(prev => prev.filter(i => i.id !== id));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error deleting instruction:', err);
            return false;
        }
    }, [token, accountId]);

    // Carga inicial
    useEffect(() => {
        loadInstructions();
    }, [loadInstructions]);

    /**
     * Actualizar instrucción localmente (Solo UI)
     */
    const updateLocalInstruction = useCallback((id: string, updates: Partial<Instruction>) => {
        setInstructions(prev => prev.map(i => i.id === id ? { ...i, ...updates } as Instruction : i));
    }, []);

    return {
        instructions,
        loading,
        error,
        createInstruction,
        updateInstruction,
        updateLocalInstruction,
        deleteInstruction,
        refresh: loadInstructions
    };
}

export default useInstructions;
