/**
 * TemplateList Component
 * 
 * Lista de plantillas con búsqueda y filtros.
 */

import { useState } from 'react';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import clsx from 'clsx';
import { TemplateCard } from './TemplateCard';
import type { Template, TemplateFilters, TemplateSort, TemplateSortField } from './types';
import { TEMPLATE_CATEGORIES } from './types';

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

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value || undefined });
  };

  const handleSortFieldChange = (value: string) => {
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-subtle rounded-lg focus:outline-none focus:border-accent text-primary placeholder:text-muted"
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
              <label className="text-xs text-muted mb-1 block">Categoría</label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-surface border border-subtle rounded-lg focus:outline-none focus:border-accent text-primary"
              >
                <option value="">Todas</option>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted mb-1 block">Ordenar por</label>
              <div className="flex gap-1">
                <select
                  value={sort.field}
                  onChange={(e) => handleSortFieldChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-surface border border-subtle rounded-lg focus:outline-none focus:border-accent text-primary"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={toggleSortDirection}
                  className="p-1.5 border border-subtle rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors"
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p className="text-sm">No se encontraron plantillas</p>
            {filters.search && (
              <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={template.id === selectedId}
              onSelect={() => onSelect(template)}
              onEdit={() => onEdit(template)}
              onDelete={() => onDelete(template)}
              onDuplicate={() => onDuplicate(template)}
            />
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="px-3 py-2 border-t border-subtle text-xs text-muted">
        {templates.length} plantilla{templates.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
