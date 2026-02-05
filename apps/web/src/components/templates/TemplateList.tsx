/**
 * TemplateList Component
 * 
 * Lista de plantillas con búsqueda y filtros.
 */

import { useState } from 'react';
import { Filter, SortAsc, SortDesc } from 'lucide-react';
import clsx from 'clsx';
import { TemplateCard } from './TemplateCard';
import type { Template, TemplateFilters, TemplateSort, TemplateSortField } from './types';
import { TEMPLATE_CATEGORIES } from './types';
import { Input, Select } from '../ui';

interface TemplateListProps {
  templates: Template[];
  selectedId?: string;
  filters: TemplateFilters;
  sort: TemplateSort;
  onFiltersChange: (filters: TemplateFilters) => void;
  onSortChange: (sort: TemplateSort) => void;
  onSelect: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onDuplicate: (template: Template) => void;
}

const SORT_OPTIONS: { value: TemplateSortField; label: string }[] = [
  { value: 'updatedAt', label: 'Última modificación' },
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'name', label: 'Nombre' },
  { value: 'usageCount', label: 'Más usadas' },
];

export function TemplateList({
  templates,
  selectedId,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateListProps) {
  const [showFilters, setShowFilters] = useState(false);

  // ... imports need to be updated first
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value || undefined });
  };

  const handleCategoryChange = (value: string | string[]) => {
    onFiltersChange({ ...filters, category: (value as string) || undefined });
  };

  const handleSortFieldChange = (value: string | string[]) => {
    onSortChange({ ...sort, field: value as TemplateSortField });
  };

  const toggleSortDirection = () => {
    onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              variant="search"
              placeholder="Buscar plantillas..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              fullWidth
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'p-2 rounded-lg border transition-colors',
              showFilters
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-subtle text-muted hover:text-primary hover:bg-hover'
            )}
            title="Filtros"
          >
            <Filter size={16} />
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-subtle flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Select
                label="Categoría"
                value={filters.category || ''}
                onChange={handleCategoryChange}
                options={[
                  { value: '', label: 'Todas' },
                  ...TEMPLATE_CATEGORIES.map(cat => ({ value: cat.value, label: cat.label }))
                ]}
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Ordenar por"
                    value={sort.field}
                    onChange={handleSortFieldChange}
                    options={SORT_OPTIONS}
                  />
                </div>
                <button
                  onClick={toggleSortDirection}
                  className="mb-1 p-2 border border-subtle rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors h-[38px] flex items-center justify-center"
                  title={sort.direction === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  {sort.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-4">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted bg-surface rounded-lg border border-subtle">
            <p className="text-sm">No se encontraron plantillas</p>
            {filters.search && (
              <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-subtle overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle bg-base/50">
                  <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Contenido</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Detalles</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Actualizada</th>
                  <th className="px-4 py-3 sticky right-0 bg-base/50"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={template.id === selectedId}
                    onSelect={() => onSelect(template)}
                    onEdit={() => onEdit(template)}
                    onDelete={() => onDelete(template)}
                    onDuplicate={() => onDuplicate(template)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="px-3 py-2 border-t border-subtle text-xs text-muted">
        {templates.length} plantilla{templates.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
