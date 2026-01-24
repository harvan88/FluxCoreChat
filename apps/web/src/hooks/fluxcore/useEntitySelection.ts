/**
 * useEntitySelection Hook
 * 
 * Hook genérico para manejo de selección de entidades con sincronización de URL.
 * Extraído del patrón común en AssistantsView, InstructionsView, VectorStoresView.
 * 
 * @example
 * const {
 *   selectedEntity,
 *   selectEntity,
 *   clearSelection,
 * } = useEntitySelection<Assistant>({
 *   entities: assistants,
 *   urlId: assistantId,  // desde props/URL
 *   onSelect: handleSelectAssistant,
 * });
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseEntitySelectionOptions<T extends { id: string }> {
    /** Lista de entidades disponibles */
    entities: T[];
    /** ID de la URL/props para auto-selección */
    urlId?: string;
    /** Callback al seleccionar una entidad */
    onSelect?: (entity: T) => void;
    /** Callback al limpiar selección */
    onClear?: () => void;
    /** Función para cargar entidad por ID (si no está en la lista) */
    loadById?: (id: string) => Promise<T | null>;
}

export interface UseEntitySelectionReturn<T> {
    /** Entidad actualmente seleccionada */
    selectedEntity: T | null;
    /** Función para seleccionar una entidad */
    selectEntity: (entity: T) => void;
    /** Función para seleccionar por ID */
    selectById: (id: string) => void;
    /** Función para limpiar selección */
    clearSelection: () => void;
    /** Indica si está cargando (cuando se usa loadById) */
    isLoading: boolean;
}

/**
 * Hook para manejo de selección de entidades
 */
export function useEntitySelection<T extends { id: string }>(
    options: UseEntitySelectionOptions<T>
): UseEntitySelectionReturn<T> {
    const { entities, urlId, onSelect, onClear, loadById } = options;

    const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const autoSelectedIdRef = useRef<string | null>(null);

    // Seleccionar entidad
    const selectEntity = useCallback((entity: T) => {
        setSelectedEntity(entity);
        onSelect?.(entity);
    }, [onSelect]);

    // Seleccionar por ID
    const selectById = useCallback(async (id: string) => {
        // Buscar en la lista primero
        const found = entities.find(e => e.id === id);
        if (found) {
            selectEntity(found);
            return;
        }

        // Si no está en la lista y tenemos loadById, cargar
        if (loadById) {
            setIsLoading(true);
            try {
                const loaded = await loadById(id);
                if (loaded) {
                    setSelectedEntity(loaded);
                    onSelect?.(loaded);
                }
            } finally {
                setIsLoading(false);
            }
        }
    }, [entities, selectEntity, loadById, onSelect]);

    // Limpiar selección
    const clearSelection = useCallback(() => {
        setSelectedEntity(null);
        onClear?.();
    }, [onClear]);

    // Auto-selección basada en URL ID
    useEffect(() => {
        if (!urlId) return;
        if (selectedEntity?.id === urlId) return;
        if (autoSelectedIdRef.current === urlId) return;

        const found = entities.find(e => e.id === urlId);
        if (found) {
            autoSelectedIdRef.current = urlId;
            setSelectedEntity(found);
            onSelect?.(found);
        } else if (loadById) {
            autoSelectedIdRef.current = urlId;
            void selectById(urlId);
        }
    }, [urlId, entities, selectedEntity?.id, loadById, selectById, onSelect]);

    // Limpiar selección cuando urlId desaparece
    useEffect(() => {
        if (urlId) return;
        if (!selectedEntity) return;

        // Solo limpiar si hay un callback externo de selección
        // (indica que se usa con tabs/routing)
        if (onSelect) {
            setSelectedEntity(null);
        }
    }, [urlId, selectedEntity, onSelect]);

    return {
        selectedEntity,
        selectEntity,
        selectById,
        clearSelection,
        isLoading,
    };
}

export default useEntitySelection;
