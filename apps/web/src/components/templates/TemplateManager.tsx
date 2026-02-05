/**
 * TemplateManager Component
 * 
 * Vista principal de gestión de plantillas (Tab View).
 * Se renderiza dentro de un DynamicContainer siguiendo las guías de UI_GUIDELINES.md
 */

import { useState, useEffect } from 'react';
import { Plus, FileText, RefreshCw } from 'lucide-react';
import { TemplateList } from './TemplateList';
import { useTemplateStore } from './store/templateStore';
import { usePanelStore } from '../../store/panelStore';
import { Button } from '../ui/Button';
import { EmptyState, LoadingState, ErrorState } from '../../core/components';
import type { Template } from './types';

interface TemplateManagerProps {
  accountId: string;
}

export function TemplateManager({ accountId }: TemplateManagerProps) {
  // Use Zustand store for shared state
  const {
    isLoading,
    error,
    filters,
    sort,
    setFilters,
    setSort,
    selectTemplate,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    duplicateTemplate,
    getFilteredTemplates,
  } = useTemplateStore();

  const { openTab } = usePanelStore();

  const filteredTemplates = getFilteredTemplates();
  // We no longer need selectedTemplateId for view switching, 
  // but we might want to keep it if we want to highlight the selected row in the list.
  // For now, let's rely on tabs.

  const [isCreating, setIsCreating] = useState(false);

  // Fetch templates when accountId changes
  useEffect(() => {
    if (accountId) {
      fetchTemplates(accountId);
      selectTemplate(null); // Clear selection
    }
  }, [accountId, fetchTemplates, selectTemplate]);

  const openTemplateEditor = (templateId: string, templateName: string) => {
    openTab('editor', {
      type: 'template-editor',
      identity: `template-editor:${templateId}`,
      title: templateName,
      icon: 'FileText',
      closable: true,
      context: { templateId, accountId },
    });
  };

  const handleCreateNew = async () => {
    if (!accountId) return;
    setIsCreating(true);
    try {
      const newTemplate = await createTemplate(accountId, {
        name: 'Nueva plantilla',
        content: 'Escribe el contenido de tu plantilla aquí...',
        category: 'other',
      });

      openTemplateEditor(newTemplate.id, newTemplate.name);
    } catch (err) {
      console.error('Error creating template:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (template: Template) => {
    openTemplateEditor(template.id, template.name);
  };

  const handleDelete = async (template: Template) => {
    try {
      await deleteTemplate(accountId, template.id);
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handleDuplicate = async (template: Template) => {
    if (!accountId) return;
    try {
      const duplicated = await duplicateTemplate(template.id, accountId);
      openTemplateEditor(duplicated.id, duplicated.name);
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  const handleRefresh = () => {
    if (!accountId) return;
    fetchTemplates(accountId);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Header onCreateNew={handleCreateNew} isCreating={isCreating} onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Cargando plantillas..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <Header onCreateNew={handleCreateNew} isCreating={isCreating} onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            message={error || 'Error al cargar plantillas'}
            onRetry={handleRefresh}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredTemplates.length === 0 && !filters.search && !filters.category) {
    return (
      <div className="h-full flex flex-col">
        <Header onCreateNew={handleCreateNew} isCreating={isCreating} onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            title="Sin plantillas"
            subtitle="Crea tu primera plantilla para agilizar tus respuestas"
            icon={<FileText size={48} className="text-muted" />}
            action={
              <Button onClick={handleCreateNew} disabled={isCreating}>
                <Plus size={16} className="mr-2" />
                Crear plantilla
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Normal state with list
  return (
    <div className="h-full flex flex-col">
      <Header onCreateNew={handleCreateNew} isCreating={isCreating} onRefresh={handleRefresh} />
      <div className="flex-1 overflow-hidden">
        <TemplateList
          templates={filteredTemplates}
          selectedId={undefined}
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onSelect={(template) => handleEdit(template)}  /* Click opens editor tab */
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>
    </div>
  );
}

// Header subcomponent
function Header({
  onCreateNew,
  isCreating,
  onRefresh
}: {
  onCreateNew: () => void;
  isCreating: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
      <h2 className="font-semibold text-primary">Plantillas</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-hover transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={16} />
        </button>
        <Button
          size="sm"
          onClick={onCreateNew}
          disabled={isCreating}
        >
          <Plus size={14} className="mr-1" />
          Nueva
        </Button>
      </div>
    </div>
  );
}
