import { RefObject, useEffect, useRef, useState } from 'react';
import { FileText, Pencil, Code, Eye, Copy, Download, X, Plus, Loader2, ListOrdered, Type, Hash, FileCode, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Button, DoubleConfirmationDeleteButton, CollapsibleSection } from '../../ui';
import type { Instruction } from '../../../types/fluxcore';
import type { ClipboardStatus, EditorViewMode } from '../../../types/fluxcore/instruction.types';
import type { PromptPreviewData } from '../../../types';

interface InstructionStats {
  lines: number;
  words: number;
  tokens: number;
  chars: number;
}

interface AssistantConsumer {
  id: string;
  name: string;
  runtime?: string;
  status?: string;
}

interface InstructionDetailProps {
  instruction: Instruction;
  viewMode: EditorViewMode;
  copyStatus: ClipboardStatus;
  onViewModeChange: (mode: EditorViewMode) => void;
  onCopyContent: () => void;
  onDownloadContent: () => void;
  onContentChange: (value: string) => void;
  onContentBlur?: () => void;
  onClose?: () => void;
  onSave?: () => void;
  canSave: boolean;
  isSaving: boolean;
  maxChars: number;
  deleteError: string | null;
  onDelete: () => void;
  onNameChange: (value: string) => void;
  onNameSave: (value: string) => void;
  nameInputRef: RefObject<HTMLInputElement>;
  isManaged: boolean;
  openProfileTab: () => void;
  stats: InstructionStats;
  lastAutosave?: Date | null;
  assistantConsumers: AssistantConsumer[];
  onCreateAssistant?: () => void;
  createAssistantLoading?: boolean;
  isAutoSaving: boolean;
  onRequestPromptPreview?: (assistantId: string, assistantName?: string) => void;
  promptPreview?: {
    isOpen: boolean;
    loading: boolean;
    data: PromptPreviewData | null;
    error: string | null;
    assistantId: string | null;
    assistantName: string | null;
  };
  onClosePromptPreview?: () => void;
}

export function InstructionDetail({
  instruction,
  viewMode,
  copyStatus,
  onViewModeChange,
  onCopyContent,
  onDownloadContent,
  onContentChange,
  onContentBlur,
  onClose,
  onSave,
  canSave,
  isSaving,
  maxChars,
  deleteError,
  onDelete,
  onNameChange,
  onNameSave,
  nameInputRef,
  isManaged,
  openProfileTab,
  stats,
  lastAutosave,
  assistantConsumers,
  onCreateAssistant,
  createAssistantLoading = false,
  isAutoSaving,
  onRequestPromptPreview,
  promptPreview,
  onClosePromptPreview,
}: InstructionDetailProps) {
  const lines = (instruction?.content || '').split('\n');
  const [previewPickerOpen, setPreviewPickerOpen] = useState(false);
  const previewPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewPickerOpen) return;
    const handler = (event: MouseEvent) => {
      if (previewPickerRef.current && !previewPickerRef.current.contains(event.target as Node)) {
        setPreviewPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [previewPickerOpen]);

  const canPreviewAssistant = assistantConsumers.length > 0 && typeof onRequestPromptPreview === 'function';

  const formatRuntime = (runtime?: string) => {
    if (!runtime) return 'Local';
    return runtime === 'openai' ? 'OpenAI' : 'Local';
  };

  const formatAutosaveInfo = () => {
    if (!lastAutosave) return 'Autoguardado pendiente';
    const diffMs = Date.now() - lastAutosave.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    if (diffMs < 15000) return 'Autoguardado hace unos segundos';
    if (minutes < 1) return 'Autoguardado hace menos de un minuto';
    if (minutes < 60) return `Autoguardado hace ${minutes} min`;
    if (hours < 24) return `Autoguardado hace ${hours} h`;
    return `Autoguardado ${lastAutosave.toLocaleDateString()} ${lastAutosave.toLocaleTimeString()}`;
  };

  const handlePromptPreviewClick = () => {
    if (!canPreviewAssistant) return;
    if (assistantConsumers.length === 1) {
      const single = assistantConsumers[0];
      onRequestPromptPreview?.(single.id, single.name);
      setPreviewPickerOpen(false);
      return;
    }
    setPreviewPickerOpen((prev) => !prev);
  };

  const handleSelectPromptPreview = (assistantId: string, assistantName?: string) => {
    onRequestPromptPreview?.(assistantId, assistantName);
    setPreviewPickerOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {isManaged && (
        <div className="px-6 py-3 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-accent">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Esta instrucción es gestionada automáticamente</p>
              <p className="text-xs text-secondary mt-0.5">
                Su contenido se genera dinámicamente desde tu perfil. Para editarlo, ve a Configuración → Perfil → Contexto para la IA.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openProfileTab}>
            Ir a Perfil
          </Button>
        </div>
      )}

      <div className="px-6 py-3 border-b border-subtle flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText size={18} className="text-accent flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded border border-transparent hover:border-[var(--text-primary)] focus-within:border-[var(--text-primary)] transition-colors bg-transparent">
            <button
              type="button"
              onClick={() => nameInputRef.current?.focus()}
              className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
              aria-label="Editar nombre de la instrucción"
            >
              <Pencil size={16} />
            </button>
            <input
              ref={nameInputRef}
              type="text"
              className="text-lg font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
              value={instruction.name}
              onChange={(e) => !isManaged && onNameChange(e.target.value)}
              onBlur={(e) => !isManaged && onNameSave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Nombre de la instrucción"
              aria-label="Nombre de la instrucción"
              disabled={isManaged}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('code')}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${viewMode === 'code' ? 'text-primary' : 'text-muted hover:text-primary'
              }`}
          >
            <Code size={14} />
            Código
          </button>
          <button
            onClick={() => onViewModeChange('preview')}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${viewMode === 'preview' ? 'text-primary' : 'text-muted hover:text-primary'
              }`}
          >
            <Eye size={14} />
            Vista previa
          </button>
          <div className="relative" ref={previewPickerRef}>
            <button
              onClick={handlePromptPreviewClick}
              disabled={!canPreviewAssistant}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${canPreviewAssistant ? 'text-muted hover:text-primary' : 'text-muted opacity-50 cursor-not-allowed'}`}
              title={canPreviewAssistant ? (assistantConsumers.length === 0 ? 'Ningún asistente usa esta instrucción' : 'Ver prompt final que recibe la IA') : 'Ningún asistente utiliza esta instrucción'}
            >
              <Sparkles size={14} />
              Vista final (IA)
            </button>
            {previewPickerOpen && assistantConsumers.length > 1 && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-subtle bg-surface shadow-xl z-20">
                <div className="px-3 py-2 text-xs text-muted uppercase tracking-wide">Elegí un asistente</div>
                <div className="max-h-64 overflow-auto">
                  {assistantConsumers.map((consumer) => (
                    <button
                      key={consumer.id}
                      onClick={() => handleSelectPromptPreview(consumer.id, consumer.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex flex-col"
                    >
                      <span className="text-primary font-medium">{consumer.name || consumer.id}</span>
                      <span className="text-xs text-secondary">{formatRuntime(consumer.runtime)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-subtle mx-2" />
          <button
            className="p-2 hover:bg-hover rounded flex items-center gap-1"
            title="Copiar contenido"
            onClick={onCopyContent}
            disabled={!instruction.content}
          >
            <Copy size={16} className="text-muted" />
            {copyStatus === 'copied' && <span className="text-xs text-accent font-medium">Copiado</span>}
            {copyStatus === 'error' && <span className="text-xs text-error font-medium">Error</span>}
          </button>
          <button
            className="p-2 hover:bg-hover rounded"
            title="Descargar como .md"
            onClick={onDownloadContent}
            disabled={!instruction.content}
          >
            <Download size={16} className="text-muted" />
          </button>
          {!isManaged && onSave && (
            <Button size="sm" className="ml-2" disabled={!canSave || isSaving} onClick={onSave}>
              Guardar
            </Button>
          )}
          {onClose && (
            <button className="p-2 hover:bg-hover rounded" onClick={onClose} title="Cerrar">
              <X size={16} className="text-muted" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {viewMode === 'code' ? (
          <div className="flex-1 flex overflow-auto bg-elevated">
            <div className="py-4 pl-4 pr-2 text-right select-none border-r border-subtle">
              {lines.map((_, i) => (
                <div key={i} className="text-xs text-muted font-mono leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              className="flex-1 p-4 bg-transparent text-primary font-mono text-sm leading-6 resize-none focus:outline-none"
              value={instruction.content ?? ''}
              onChange={(e) => !isManaged && onContentChange(e.target.value)}
              onBlur={() => !isManaged && onContentBlur?.()}
              placeholder="# Instrucciones\n\nEscribe aquí las instrucciones para el asistente..."
              spellCheck={false}
              maxLength={maxChars}
              readOnly={isManaged}
            />
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-auto">
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {instruction.content || '_No hay contenido disponible aún._'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-subtle">
        <CollapsibleSection title="Resumen & consumo" defaultExpanded showToggle={false} className="border-none">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{
                label: 'Líneas',
                value: stats.lines.toLocaleString(),
                icon: <ListOrdered size={16} />,
              }, {
                label: 'Palabras',
                value: stats.words.toLocaleString(),
                icon: <Type size={16} />,
              }, {
                label: 'Tokens (est.)',
                value: stats.tokens.toLocaleString(),
                icon: <Hash size={16} />,
              }, {
                label: 'Caracteres',
                value: `${stats.chars.toLocaleString()} / ${maxChars.toLocaleString()}`,
                icon: <FileCode size={16} />,
                highlight: stats.chars > maxChars,
              }].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border border-subtle bg-surface/30 px-3 py-2 flex items-center gap-3 ${item.highlight ? 'border-error/60' : ''}`}
                >
                  <span className={`p-2 rounded-md bg-elevated text-accent hidden sm:inline-flex`}>{item.icon}</span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.highlight ? 'text-error' : 'text-primary'}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted uppercase tracking-wide">Asistentes que consumen esta instrucción</p>
                {assistantConsumers.length > 0 && onCreateAssistant && (
                  <Button size="sm" variant="ghost" onClick={onCreateAssistant} disabled={createAssistantLoading}>
                    <Plus size={14} className="mr-1" />
                    Crear otro asistente
                  </Button>
                )}
              </div>
              {assistantConsumers.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-subtle bg-elevated/40 px-4 py-3">
                  <span className="text-sm text-secondary">Ningún asistente utiliza esta instrucción.</span>
                  {onCreateAssistant && (
                    <Button size="sm" onClick={onCreateAssistant} disabled={createAssistantLoading}>
                      <Plus size={14} className="mr-1" />
                      Crear asistente
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {assistantConsumers.map((consumer) => (
                    <div
                      key={consumer.id}
                      className="px-3 py-2 rounded-lg border border-subtle bg-elevated flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-primary text-sm font-medium truncate">{consumer.name}</p>
                        <p className="text-xs text-muted font-mono truncate">{consumer.id}</p>
                      </div>
                      <span className="text-xs text-secondary px-2 py-1 rounded-full bg-base border border-subtle">
                        {formatRuntime(consumer.runtime)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        <div className="px-4 sm:px-6 py-3 border-t border-subtle flex flex-wrap items-center justify-between gap-3 bg-surface text-xs">
          <div className="flex items-center gap-2 text-muted">
            {isAutoSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <span>{formatAutosaveInfo()}</span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
            <DoubleConfirmationDeleteButton onConfirm={onDelete} size={16} />
          </div>
        </div>
      </div>

      {promptPreview?.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-subtle rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Vista final (IA)</p>
                <p className="text-lg font-semibold text-primary">{promptPreview.assistantName || 'Asistente'}</p>
              </div>
              <button className="p-2 hover:bg-hover rounded" onClick={onClosePromptPreview}>
                <X size={18} className="text-muted" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              {promptPreview.loading ? (
                <div className="flex flex-col items-center justify-center text-secondary gap-3 py-12">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm">Generando vista previa…</p>
                </div>
              ) : promptPreview.error ? (
                <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
                  {promptPreview.error}
                </div>
              ) : promptPreview.data ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-subtle bg-elevated px-4 py-3 text-xs text-secondary flex flex-wrap gap-4">
                    <span><span className="text-muted uppercase tracking-wide text-[11px]">Modelo:</span> {promptPreview.data.config.model}</span>
                    <span><span className="text-muted uppercase tracking-wide text-[11px]">Temperatura:</span> {promptPreview.data.config.temperature}</span>
                    <span><span className="text-muted uppercase tracking-wide text-[11px]">Máx. tokens:</span> {promptPreview.data.config.maxTokens}</span>
                    <span><span className="text-muted uppercase tracking-wide text-[11px]">Modo:</span> {promptPreview.data.config.mode}</span>
                  </div>
                  <pre className="rounded-lg border border-subtle bg-elevated/60 p-4 text-xs text-primary whitespace-pre-wrap font-mono max-h-[60vh] overflow-auto">
                    {promptPreview.data.systemPrompt}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-secondary">Sin datos disponibles.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
