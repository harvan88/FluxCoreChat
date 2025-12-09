/**
 * FC-804: ExpandedEditor - Editor expandible tipo GitHub
 * Vista previa/código con contador de tokens
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Copy,
  Download,
  Eye,
  Code,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '../ui';

interface ExpandedEditorProps {
  title?: string;
  content: string;
  maxLength?: number;
  placeholder?: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function ExpandedEditor({
  title = 'Contexto para la IA',
  content: initialContent,
  maxLength = 5000,
  placeholder = 'Escribe aquí...',
  onSave,
  onClose,
}: ExpandedEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(content !== initialContent);
  }, [content, initialContent]);

  // Calculate stats
  const stats = useMemo(() => {
    const lines = content.split('\n').length;
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    // Approximate token count (GPT-style: ~4 chars per token)
    const tokens = Math.ceil(chars / 4);
    return { lines, chars, words, tokens };
  }, [content]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    await onSave(content);
    setIsSaving(false);
    setHasChanges(false);
  };

  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contexto-ia.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Tienes cambios sin guardar. ¿Deseas salir?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-accent" />
          <h2 className="text-primary font-semibold">{title}</h2>
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs bg-warning/20 text-warning rounded">
              Sin guardar
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
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
          
          {/* Save */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Save size={16} className="mr-1.5" />
                Guardar
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
              onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
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

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-subtle bg-surface text-xs text-muted">
        <div className="flex items-center gap-4">
          <span>{stats.lines} líneas</span>
          <span>{stats.words} palabras</span>
          <span>~{stats.tokens} tokens</span>
        </div>
        <div>
          {stats.chars.toLocaleString()}/{maxLength.toLocaleString()} caracteres
        </div>
      </div>
    </div>
  );
}
