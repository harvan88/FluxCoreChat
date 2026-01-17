/**
 * OpenAIAssistantEditor - Editor dedicado para instrucciones de asistentes OpenAI
 * 
 * Diferencias con ExpandedEditor:
 * - Vinculado a un asistente de OpenAI específico (externalId)
 * - Auto-guarda en la base de datos local
 * - Al hacer clic en "Guardar" actualiza las instrucciones en OpenAI
 * - Muestra referencia al asistente vinculado en el footer
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Save,
  Copy,
  Download,
  Eye,
  Code,
  Bot,
  Loader2,
  Check,
  Cloud,
  CloudOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui';

interface OpenAIAssistantEditorProps {
  assistantId: string;
  assistantName: string;
  externalId: string;
  accountId: string;
  content: string;
  maxLength?: number;
  placeholder?: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
  onChange?: (content: string) => void;
}

type SyncStatus = 'synced' | 'saving' | 'error' | 'pending';

export function OpenAIAssistantEditor({
  assistantId,
  assistantName,
  externalId,
  accountId: _accountId,
  content: initialContent,
  maxLength = 256000,
  placeholder = 'Escribe las instrucciones del asistente...',
  onSave,
  onClose,
  onChange,
}: OpenAIAssistantEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef(initialContent);

  useEffect(() => {
    setContent(initialContent);
    lastContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    setHasChanges(content !== lastContentRef.current);
    if (content !== lastContentRef.current) {
      setSyncStatus('pending');
    }
  }, [content]);

  const stats = useMemo(() => {
    const lines = content.split('\n').length;
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(chars / 4);
    return { lines, chars, words, tokens };
  }, [content]);

  const handleAutoSave = useCallback(async (newContent: string) => {
    if (newContent === lastContentRef.current) return;
    
    setSyncStatus('saving');
    setError(null);
    
    try {
      await onSave(newContent);
      lastContentRef.current = newContent;
      setLastSaved(new Date());
      setSyncStatus('synced');
      setHasChanges(false);
    } catch (err: any) {
      console.error('[OpenAIAssistantEditor] Auto-save error:', err);
      setSyncStatus('error');
      setError(err.message || 'Error al guardar');
    }
  }, [onSave]);

  const handleContentChange = useCallback((newContent: string) => {
    const trimmed = newContent.slice(0, maxLength);
    setContent(trimmed);
    onChange?.(trimmed);
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave(trimmed);
    }, 2000);
  }, [maxLength, onChange, handleAutoSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    setIsSaving(true);
    setSyncStatus('saving');
    setError(null);
    
    try {
      await onSave(content);
      lastContentRef.current = content;
      setLastSaved(new Date());
      setSyncStatus('synced');
      setHasChanges(false);
    } catch (err: any) {
      console.error('[OpenAIAssistantEditor] Save error:', err);
      setSyncStatus('error');
      setError(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instrucciones-${assistantName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (hasChanges && syncStatus === 'pending') {
      if (confirm('Tienes cambios sin sincronizar con OpenAI. ¿Deseas salir?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <Cloud size={14} className="text-green-500" />;
      case 'saving':
        return <Loader2 size={14} className="animate-spin text-accent" />;
      case 'error':
        return <CloudOff size={14} className="text-red-500" />;
      case 'pending':
        return <Cloud size={14} className="text-warning" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'synced':
        return lastSaved 
          ? `Sincronizado ${lastSaved.toLocaleTimeString()}`
          : 'Sincronizado';
      case 'saving':
        return 'Guardando...';
      case 'error':
        return 'Error al sincronizar';
      case 'pending':
        return 'Cambios pendientes';
    }
  };

  return (
    <div className="flex flex-col h-full bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface">
        <div className="flex items-center gap-3">
          <Bot size={20} className="text-accent" />
          <div>
            <h2 className="text-primary font-semibold">Instrucciones del Asistente</h2>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{assistantName}</span>
              <span>•</span>
              <span className="font-mono">{externalId.slice(0, 20)}...</span>
            </div>
          </div>
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs bg-warning/20 text-warning rounded">
              Sin guardar
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sync status */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-elevated text-xs">
            {getSyncIcon()}
            <span className="text-secondary">{getSyncText()}</span>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center bg-elevated rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-surface text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Code size={14} className="inline mr-1.5" />
              Código
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-surface text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Eye size={14} className="inline mr-1.5" />
              Vista previa
            </button>
          </div>
          
          {/* Actions */}
          <button
            onClick={handleCopy}
            className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
            title="Copiar"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
            title="Descargar"
          >
            <Download size={18} />
          </button>
          
          {/* Save to OpenAI */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Save size={16} className="mr-1.5" />
                Guardar en OpenAI
              </>
            )}
          </Button>
          
          {/* Close */}
          <button
            onClick={handleClose}
            className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers (code mode only) */}
        {viewMode === 'code' && (
          <div className="w-12 bg-elevated border-r border-subtle flex-shrink-0 overflow-hidden">
            <div className="py-3 px-2 font-mono text-xs text-muted text-right leading-6">
              {Array.from({ length: stats.lines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          </div>
        )}

        {/* Editor / Preview */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'code' ? (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full px-4 py-3 bg-base text-primary font-mono text-sm leading-6 resize-none focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <div className="p-4">
              <div className="prose prose-invert max-w-none">
                {content ? (
                  <pre className="whitespace-pre-wrap text-primary font-sans text-sm leading-relaxed">
                    {content}
                  </pre>
                ) : (
                  <p className="text-muted italic">{placeholder}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with assistant reference and stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-subtle bg-surface text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-accent">
            <Bot size={12} />
            <span className="font-medium">{assistantName}</span>
          </div>
          <span className="text-muted">ID: {assistantId.slice(0, 8)}...</span>
          <span className="text-muted">OpenAI: {externalId}</span>
        </div>
        <div className="flex items-center gap-4 text-muted">
          <span>{stats.lines} líneas</span>
          <span>{stats.words} palabras</span>
          <span>~{stats.tokens} tokens</span>
          <span>
            {stats.chars.toLocaleString()}/{maxLength.toLocaleString()} caracteres
          </span>
        </div>
      </div>
    </div>
  );
}
