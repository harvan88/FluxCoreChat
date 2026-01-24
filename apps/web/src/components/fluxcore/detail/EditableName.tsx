import { useRef } from 'react';
import { Pencil } from 'lucide-react';

interface EditableNameProps {
    value: string;
    onChange: (value: string) => void;
    onSave: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

/**
 * EditableName - Input de nombre con auto-save
 * 
 * Usado en el encabezado de todas las vistas de detalle.
 * Incluye botón de lápiz y lógica de blur/enter para guardar.
 */
export function EditableName({
    value,
    onChange,
    onSave,
    placeholder,
    disabled
}: EditableNameProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded border border-transparent bg-transparent transition-colors ${!disabled ? 'hover:border-[var(--text-primary)] focus-within:border-[var(--text-primary)] cursor-text' : ''}`}>
            {!disabled && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                    aria-label="Editar"
                >
                    <Pencil size={16} />
                </button>
            )}
            <input
                ref={inputRef}
                type="text"
                className="text-lg font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => onSave(e.target.value.trim())}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    );
}

export default EditableName;
