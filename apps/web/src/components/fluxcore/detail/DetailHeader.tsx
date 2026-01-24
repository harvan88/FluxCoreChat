import { ReactNode } from 'react';
import { EditableName } from './EditableName';
import { IdCopyable } from './IdCopyable';

interface DetailHeaderProps {
    preTitle: string;
    name: string;
    id: string;
    onNameChange: (newName: string) => void;
    onNameSave: (newName: string) => void;
    onClose?: () => void;
    actions?: ReactNode;
    isSaving?: boolean;
    saveError?: string | null;
    idPrefix?: string;
}

/**
 * DetailHeader - Encabezado unificado para vistas de detalle
 * 
 * Centraliza:
 * - Pre-título (contextualización)
 * - Nombre editable con auto-save
 * - ID copiable
 * - Botón de guardar/cerrar
 * - Indicadores de estado (guardando/error)
 */
export function DetailHeader({
    preTitle,
    name,
    id,
    onNameChange,
    onNameSave,
    onClose,
    actions,
    isSaving,
    saveError,
    idPrefix,
}: DetailHeaderProps) {
    return (
        <div className="px-6 py-4 border-b border-subtle flex items-center justify-between gap-4 bg-background">
            <div className="flex-1 min-w-0">
                <div className="text-xs text-muted mb-1 flex items-center gap-2">
                    {preTitle}
                    {isSaving && <span className="animate-pulse text-accent">Guardando...</span>}
                    {saveError && <span className="text-error">{saveError}</span>}
                </div>

                <div className="flex items-center gap-3">
                    {onClose && !id && ( // Botón de volver solo si no hay ID (modo creación)
                        <button
                            onClick={onClose}
                            className="text-muted hover:text-primary mr-2"
                        >
                            ← Volver
                        </button>
                    )}

                    <EditableName
                        value={name}
                        onChange={onNameChange}
                        onSave={onNameSave}
                        placeholder={`Nombre de ${preTitle.toLowerCase()}`}
                    />
                </div>

                {id && <IdCopyable id={id} prefix={idPrefix} />}
            </div>

            <div className="flex items-center gap-3">
                {actions}

                {onClose && id && (
                    <button
                        className="p-2 hover:bg-hover rounded text-muted hover:text-primary transition-colors"
                        onClick={onClose}
                        title="Cerrar"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

export default DetailHeader;
