import { useState, useMemo } from 'react';
import { Filter, SortAsc, SortDesc, FileText, Copy, Edit, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Template, TemplateFilters, TemplateSort, TemplateSortField } from './types';
import { TEMPLATE_CATEGORIES } from './types';
import { Input, Select, Button } from '../ui';
import { CollectionView } from '../fluxcore/shared/CollectionView';

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
  headerActions?: React.ReactNode;
  createLabel?: string;
  onCreate?: () => void;
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
  headerActions,
  createLabel,
  onCreate,
}: TemplateListProps) {
  const [showFilters, setShowFilters] = useState(false);

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

  const filterBar = (
    <div className="p-3 border-b border-subtle bg-surface/50">
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
        >
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 pt-3 border-t border-subtle flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-1">
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
              >
                {sort.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CollectionView<Template>
      icon={FileText}
      title="Plantillas"
      data={templates}
      getRowKey={(t) => t.id}
      loading={false}
      onRowClick={onSelect}
      createLabel={createLabel}
      onCreate={onCreate}
      headerActions={headerActions}
      emptyDescription="No se encontraron plantillas con los filtros actuales."
      filterBar={filterBar}
      columns={[
        {
          id: 'name',
          header: 'Nombre',
          accessor: (t) => (
            <div className="font-semibold text-primary">{t.name}</div>
          ),
          width: '25%'
        },
        {
          id: 'content',
          header: 'Contenido',
          accessor: (t) => (
            <div className="text-xs text-secondary truncate max-w-[300px]">
              {t.content}
            </div>
          ),
          width: '40%',
          hideBelow: 'lg'
        },
        {
          id: 'category',
          header: 'Categoría',
          accessor: (t) => (
            <div className="capitalize text-[11px] px-2 py-0.5 bg-hover rounded-full inline-block text-secondary">
              {TEMPLATE_CATEGORIES.find(c => c.value === t.category)?.label || t.category}
            </div>
          ),
          width: '15%'
        },
        {
          id: 'updatedAt',
          header: 'Actualizada',
          accessor: (t) => (
            <div className="text-[11px] text-muted">
              {new Date(t.updatedAt).toLocaleDateString()}
            </div>
          ),
          width: '15%',
          hideBelow: 'md'
        }
      ]}
      renderActions={(t) => (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); onDuplicate(t); }}
            title="Duplicar"
          >
            <Copy size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); onEdit(t); }}
            title="Editar"
          >
            <Edit size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-error hover:bg-error/10"
            onClick={(e) => { e.stopPropagation(); onDelete(t); }}
            title="Eliminar"
          >
            <Trash2 size={14} />
          </Button>
        </>
      )}
      mobileActions={(t) => [
        { id: 'edit', label: 'Editar', icon: Edit, onClick: () => onEdit(t) },
        { id: 'duplicate', label: 'Duplicar', icon: Copy, onClick: () => onDuplicate(t) },
        { id: 'delete', label: 'Eliminar', icon: Trash2, onClick: () => onDelete(t), variant: 'danger' },
      ]}
    />
  );
}
