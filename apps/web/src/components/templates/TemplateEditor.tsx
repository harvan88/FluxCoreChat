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
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { Input, Textarea, Select, Checkbox } from '../ui';
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
      authorizeForAI !== originalTemplate.authorizeForAI;

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
  }, [name, content, category, variables, tags, authorizeForAI, originalTemplate, accountId, templateId, updateTemplate]);

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
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface">
        <div className="flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-primary placeholder:text-muted"
            placeholder="Nombre de la plantilla"
            fullWidth={false}
          />
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted animate-pulse">Guardando...</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-error">Error al guardar</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-muted">Guardado</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-elevated rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
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
                'px-3 py-1.5 text-sm rounded-md transition-colors',
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
            title="Copiar contenido"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="px-4 py-2 bg-error/10 border-b border-error/20 flex items-center gap-2 text-error text-sm">
          <AlertCircle size={16} />
          {saveError}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor / Preview area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'edit' ? (
            <div className="flex-1 p-4 overflow-auto">
              <Textarea
                label="Contenido"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[300px] font-mono text-sm"
                placeholder="Escribe el contenido de tu plantilla...&#10;&#10;Usa {{variable}} para insertar variables dinámicas."
                fullWidth
              />

              {/* Detected variables hint */}
              {detectedVariables.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted mb-2">Variables detectadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map(varName => {
                      const isConfigured = variables.some(v => v.name === varName);
                      return (
                        <button
                          key={varName}
                          onClick={() => !isConfigured && handleAddVariable(varName)}
                          className={clsx(
                            'px-2 py-1 text-xs rounded-md border transition-colors',
                            isConfigured
                              ? 'border-accent/30 bg-accent/10 text-accent cursor-default'
                              : 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 cursor-pointer'
                          )}
                          disabled={isConfigured}
                        >
                          <Hash size={10} className="inline mr-1" />
                          {varName}
                          {!isConfigured && <Plus size={10} className="inline ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-auto bg-base/50">
              <label className="text-sm text-muted mb-4 block font-medium">Vista previa del mensaje</label>
              <div className="max-w-md">
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

        {/* Sidebar - Variables & Settings */}
        <div className="w-80 border-l border-subtle bg-surface overflow-y-auto">
          {/* Category */}
          <div className="p-4 border-b border-subtle">
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
          </div>

          {/* AI Authorization */}
          <div className="p-4 border-b border-subtle bg-accent/5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-accent flex items-center gap-2">
                <AlertCircle size={14} />
                Inteligencia Artificial
              </label>
              <Checkbox
                checked={authorizeForAI}
                onChange={(e) => setAuthorizeForAI(e.target.checked)}
                id="ai-auth"
              />
            </div>
            <p className="text-[10px] text-muted leading-tight">
              Permitir que la IA utilice esta plantilla automáticamente en sus respuestas.
            </p>
          </div>

          {/* Variables */}
          <div className="p-4 border-b border-subtle">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-muted">Variables ({variables.length})</label>
            </div>

            {variables.length === 0 ? (
              <p className="text-xs text-muted py-2">
                Las variables se detectan automáticamente del contenido usando {'{{nombre}}'}.
              </p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <div key={variable.name} className="p-3 bg-base rounded-lg border border-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs text-accent">{`{{${variable.name}}}`}</code>
                      <button
                        onClick={() => handleRemoveVariable(index)}
                        className="p-1 text-muted hover:text-error rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <Input
                      variant="text"
                      value={variable.label || ''}
                      onChange={(e) => handleUpdateVariable(index, { label: e.target.value })}
                      placeholder="Etiqueta"
                      className="mb-2 text-xs"
                      fullWidth
                    />

                    <div className="flex gap-2">
                      <Select
                        value={variable.type}
                        onChange={(val) => handleUpdateVariable(index, { type: val as TemplateVariable['type'] })}
                        options={VARIABLE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                        fullWidth
                      />

                      <div className="flex items-center">
                        <Checkbox
                          checked={variable.required}
                          onChange={(e) => handleUpdateVariable(index, { required: e.target.checked })}
                          id={`req-${index}`}
                        />
                        <label htmlFor={`req-${index}`} className="ml-2 text-xs text-muted cursor-pointer">
                          Req.
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="p-4">
            <label className="text-sm text-muted mb-2 block">Etiquetas</label>

            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Nueva etiqueta"
                fullWidth
              />
              <Button size="sm" variant="secondary" onClick={handleAddTag}>
                <Plus size={14} />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-elevated rounded-full text-secondary"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-error transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-subtle">
            <TemplateAssetPicker
              templateId={templateId}
              accountId={accountId}
              assets={originalTemplate.assets || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
