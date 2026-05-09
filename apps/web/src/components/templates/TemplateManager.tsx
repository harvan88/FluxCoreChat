/**
 * TemplateManager Component
 * 
 * Vista principal de gestión de plantillas (Tab View).
 * Se renderiza dentro de un DynamicContainer siguiendo las guías de UI_GUIDELINES.md
 */

import { useState, useEffect } from 'react';
import { RefreshCw, UploadCloud } from 'lucide-react';
// import { DayStatusToggle } from './DayStatusToggle';
import { TemplateList } from './TemplateList';
import { TemplateBulkImportModal } from './TemplateBulkImportModal';
import { useTemplateStore } from './store/templateStore';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/Button';
// import { EmptyState, LoadingState, ErrorState } from '../../core/components';
import type { Template } from './types';

interface TemplateManagerProps {
  accountId: string;
}

export function TemplateManager({ accountId }: TemplateManagerProps) {
  // Use Zustand store for shared state
  const {
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

  const navigate = useNavigate();
  const { alias } = useParams<{ alias: string }>();

  const filteredTemplates = getFilteredTemplates();
  // We no longer need selectedTemplateId for view switching, 
  // but we might want to keep it if we want to highlight the selected row in the list.
  // For now, let's rely on tabs.

  const [isCreating, setIsCreating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Fetch templates when accountId changes
  useEffect(() => {
    if (accountId) {
      fetchTemplates(accountId);
      selectTemplate(null); // Clear selection
    }
  }, [accountId, fetchTemplates, selectTemplate]);

  const openTemplateEditor = (templateId: string, _templateName: string) => {
    navigate(`/@/${alias}/herramientas/${templateId}`);
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

  const headerActions = (
    <>
      <button
        onClick={handleRefresh}
        className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-hover transition-colors"
        title="Actualizar"
      >
        <RefreshCw size={16} />
      </button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setIsImportModalOpen(true)}
        disabled={isCreating}
        className="hidden sm:flex"
      >
        <UploadCloud size={14} className="mr-1" />
        Importar JSON
      </Button>
    </>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <TemplateList
          templates={filteredTemplates}
          // selectedId={undefined}
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onSelect={handleEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          headerActions={headerActions}
          createLabel="Nueva"
          onCreate={handleCreateNew}
        />
      </div>

      {/* Modals always rendered */}
      <TemplateBulkImportModal
        accountId={accountId}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
