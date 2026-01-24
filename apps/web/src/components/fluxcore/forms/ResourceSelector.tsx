import { Plus, X, ChevronDown } from 'lucide-react';
import { Button, Badge } from '../../ui';

interface Resource {
    id: string;
    name: string;
    backend?: string;
}

interface ResourceSelectorProps {
    label: string;
    resources: Resource[];
    selectedIds: string[];
    maxItems?: number;
    onCreate: () => void;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onReferenceClick?: (id: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

/**
 * ResourceSelector - Selector múltiple de recursos (especializado para FluxCore)
 */
export function ResourceSelector({
    label,
    resources,
    selectedIds = [],
    maxItems = 999,
    onCreate,
    onSelect,
    onRemove,
    onReferenceClick,
    placeholder = 'Seleccionar...',
    disabled
}: ResourceSelectorProps) {
    const currentResources = selectedIds
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r);

    const selectable = resources.filter(r => !selectedIds.includes(r.id));
    const reachedMax = selectedIds.length >= maxItems;

    return (
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted">{label}</label>
                <Button variant="secondary" size="sm" onClick={onCreate}>
                    <Plus size={14} className="mr-1" />
                    Crear
                </Button>
            </div>

            {/* Selected tags */}
            {currentResources.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {currentResources.map(res => (
                        <Badge
                            key={res.id}
                            variant="info"
                            className={`flex items-center gap-1 ${onReferenceClick ? 'cursor-pointer hover:bg-accent/20' : ''}`}
                            onClick={() => onReferenceClick?.(res.id)}
                        >
                            <span className="truncate max-w-[200px]">{res.name}</span>
                            <button
                                type="button"
                                className="ml-1 hover:text-error transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(res.id);
                                }}
                                aria-label={`Quitar ${label.toLowerCase()}`}
                            >
                                <X size={12} />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Select input */}
            {!reachedMax && selectable.length > 0 && (
                <div className="relative">
                    <select
                        className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8 text-sm focus:border-accent"
                        value=""
                        onChange={(e) => {
                            const id = e.target.value;
                            if (id) onSelect(id);
                        }}
                    >
                        <option value="">{placeholder}</option>
                        {selectable.map((res) => (
                            <option key={res.id} value={res.id}>
                                {res.name} {res.backend === 'openai' ? '(OpenAI)' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
            )}

            {reachedMax && currentResources.length > 0 && (
                <p className="text-[10px] text-muted italic mt-1">Límite alcanzado ({maxItems})</p>
            )}
        </div>
    );
}

export default ResourceSelector;
