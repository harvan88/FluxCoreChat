/**
 * TemplateEditor Component
 * 
 * Editor de plantillas con preview en tiempo real.
 * Se abre como tab en el ViewPort.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Eye,
  Code,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Hash
} from 'lucide-react';
import { FluxCoreTemplateConfig } from '../fluxcore/templates/FluxCoreTemplateConfig';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { Input, Textarea, Select, Checkbox, Badge } from '../ui';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useTemplateStore } from './store/templateStore';
import { TemplateAssetPicker } from './TemplateAssetPicker';
import { TemplatePreview } from './TemplatePreview';
import type { TemplateVariable, UpdateTemplateInput } from './types';
import { TEMPLATE_CATEGORIES, VARIABLE_TYPES } from './types';

interface TemplateEditorProps {
  templateId: string;
  accountId: string;
  onClose: () => void;
}

export function TemplateEditor({ templateId, accountId, onClose }: TemplateEditorProps) {
  const { getTemplateById, updateTemplate, fetchTemplates, templates } = useTemplateStore();
  const initializedId = useRef<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [authorizeForAI, setAuthorizeForAI] = useState(false);
  const [aiUsageInstructions, setAiUsageInstructions] = useState('');
  const [newTag, setNewTag] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch templates if not loaded
  useEffect(() => {
    if (templates.length === 0) {
      fetchTemplates(accountId);
    }
  }, [accountId, templates.length, fetchTemplates]);

  const originalTemplate = getTemplateById(templateId);

  // Load template data - Only on mount or ID change
  useEffect(() => {
    if (originalTemplate && originalTemplate.id !== initializedId.current) {
      setName(originalTemplate.name);
      setContent(originalTemplate.content);
      setCategory(originalTemplate.category || '');
      setVariables([...originalTemplate.variables]);
      setTags([...originalTemplate.tags]);
      setAuthorizeForAI(originalTemplate.authorizeForAI || false);
      setAiUsageInstructions(originalTemplate.aiUsageInstructions || '');
      initializedId.current = originalTemplate.id;
    }
  }, [originalTemplate]);

  // Auto-save effect
  useEffect(() => {
    if (!originalTemplate || !initializedId.current) return;

    // Check for changes
    const hasChanges =
      name !== originalTemplate.name ||
      content !== originalTemplate.content ||
      category !== (originalTemplate.category || '') ||
      JSON.stringify(variables) !== JSON.stringify(originalTemplate.variables) ||
      JSON.stringify(tags) !== JSON.stringify(originalTemplate.tags) ||
      authorizeForAI !== originalTemplate.authorizeForAI ||
      aiUsageInstructions !== (originalTemplate.aiUsageInstructions || '');

    if (!hasChanges) {
      if (saveStatus !== 'error') setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        const updates: UpdateTemplateInput = {
          name,
          content,
          category: category || undefined,
          variables,
          tags,
          authorizeForAI,
          aiUsageInstructions: authorizeForAI ? aiUsageInstructions : undefined,
        };

        await updateTemplate(accountId, templateId, updates);
        setSaveStatus('saved');
        setSaveError(null);
      } catch (err) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Error al guardar');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [name, content, category, variables, tags, authorizeForAI, aiUsageInstructions, originalTemplate, accountId, templateId, updateTemplate]);

  // Extract variables from content
  const detectedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    return [...new Set([...matches].map(m => m[1]))];
  }, [content]);

  const handleClose = () => {
    onClose();
  };

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddVariable = (varName: string) => {
    if (variables.some(v => v.name === varName)) return;

    setVariables([
      ...variables,
      {
        name: varName,
        type: 'text',
        label: varName.charAt(0).toUpperCase() + varName.slice(1).replace(/_/g, ' '),
        required: false,
      }
    ]);
  };

  const handleUpdateVariable = (index: number, updates: Partial<TemplateVariable>) => {
    setVariables(prev => prev.map((v, i) => i === index ? { ...v, ...updates } : v));
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags([...tags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (!originalTemplate) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        <p>Plantilla no encontrada</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs text-muted mb-1 flex items-center justify-between">
            <span>Editor de plantilla</span>
            <div className="flex-items-center gap-2">
              {saveStatus === 'saving' && (
                <span className="text-xs text-accent animate-pulse">Guardando...</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs text-error">Error al guardar</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-muted">Guardado</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded border border-transparent bg-transparent hover:border-primary focus-within:border-primary transition-colors">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
              placeholder="Nombre de la plantilla"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center bg-elevated rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'edit'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-primary'
              )}
            >
              <Code size={14} className="inline mr-1.5" />
              Editar
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'preview'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-primary'
              )}
            >
              <Eye size={14} className="inline mr-1.5" />
              Preview
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyContent}
            className="text-muted hover:text-primary"
            title="Copiar contenido"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted hover:text-primary"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="px-6 py-2 bg-error/10 border-b border-error/20 flex items-center gap-2 text-error text-sm">
          <AlertCircle size={16} />
          {saveError}
        </div>
      )}

      {/* Main content scrollable stack */}
      <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
        {viewMode === 'edit' ? (
          <>
            {/* Contenido Section */}
            <CollapsibleSection
              title="Contenido del mensaje"
              icon={<Code size={16} />}
              defaultExpanded={true}
              showToggle={false}
            >
              <div className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[250px] font-mono text-sm bg-surface"
                  placeholder="Escribe el contenido de tu plantilla...&#10;&#10;Usa {{variable}} para insertar variables dinámicas."
                  fullWidth
                />

                {/* Detected variables hint */}
                {detectedVariables.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Variables detectadas en el texto</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map(varName => {
                        const isConfigured = variables.some(v => v.name === varName);
                        return (
                          <Badge
                            key={varName}
                            variant={isConfigured ? 'info' : 'warning'}
                            className={clsx(
                              'cursor-pointer transition-transform hover:scale-105',
                              isConfigured && 'opacity-70'
                            )}
                            onClick={() => !isConfigured && handleAddVariable(varName)}
                          >
                            <Hash size={10} className="mr-1" />
                            {varName}
                            {!isConfigured && <Plus size={10} className="ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* General Config Section */}
            <CollapsibleSection
              title="Configuración general"
              defaultExpanded={true}
              showToggle={false}
            >
              <div className="space-y-4">
                <Select
                  label="Categoría"
                  value={category}
                  onChange={(val) => setCategory(val as string)}
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...TEMPLATE_CATEGORIES.map(cat => ({ value: cat.value, label: cat.label }))
                  ]}
                  fullWidth
                />

                <div>
                  <label className="text-sm text-muted mb-2 block">Etiquetas</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Nueva etiqueta"
                      fullWidth
                    />
                    <Button variant="secondary" onClick={handleAddTag}>
                      <Plus size={16} />
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="neutral"
                          className="pr-1"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 p-0.5 hover:text-error rounded-full transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Variables Section */}
            <CollapsibleSection
              title={`Definición de variables (${variables.length})`}
              defaultExpanded={variables.length > 0}
              showToggle={false}
            >
              {variables.length === 0 ? (
                <p className="text-xs text-muted italic">
                  Las variables se detectan automáticamente del contenido usando {'{{nombre}}'}.
                </p>
              ) : (
                <div className="space-y-4">
                  {variables.map((variable, index) => (
                    <div key={variable.name} className="p-4 bg-surface rounded-lg border border-subtle space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="info" className="font-mono">{`{{${variable.name}}}`}</Badge>
                        <button
                          onClick={() => handleRemoveVariable(index)}
                          className="p-1 text-muted hover:text-error rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <Input
                        label="Etiqueta visible"
                        value={variable.label || ''}
                        onChange={(e) => handleUpdateVariable(index, { label: e.target.value })}
                        placeholder="Ej: Nombre del cliente"
                        fullWidth
                      />

                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Select
                            label="Tipo de dato"
                            value={variable.type}
                            onChange={(val) => handleUpdateVariable(index, { type: val as TemplateVariable['type'] })}
                            options={VARIABLE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                            fullWidth
                          />
                        </div>
                        <div className="pb-2">
                          <Checkbox
                            label="Requerido"
                            checked={variable.required}
                            onChange={(e) => handleUpdateVariable(index, { required: e.target.checked })}
                            id={`req-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* IA Section */}
            <FluxCoreTemplateConfig
              authorizeForAI={authorizeForAI}
              onAuthorizeChange={setAuthorizeForAI}
              aiUsageInstructions={aiUsageInstructions}
              onInstructionsChange={setAiUsageInstructions}
            />

            {/* Assets Section */}
            <CollapsibleSection
              title={`Archivos adjuntos (${originalTemplate.assets?.length || 0})`}
              defaultExpanded={originalTemplate.assets && originalTemplate.assets.length > 0}
              showToggle={false}
            >
              <TemplateAssetPicker
                templateId={templateId}
                accountId={accountId}
                assets={originalTemplate.assets || []}
              />
            </CollapsibleSection>
          </>
        ) : (
          /* Preview Mode */
          <div className="h-full flex flex-col items-center">
            <div className="w-full max-w-2xl bg-surface rounded-xl p-8 border border-subtle shadow-sm">
              <div className="text-xs text-muted mb-6 font-bold uppercase tracking-widest border-b border-subtle pb-2">Vista previa final</div>
              <TemplatePreview
                content={content}
                variables={variables}
                assets={originalTemplate?.assets}
                accountId={accountId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
