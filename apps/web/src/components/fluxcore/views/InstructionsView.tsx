/**
 * Instructions View - Biblioteca de Instrucciones
 * 
 * Las instrucciones son ACTIVOS REUTILIZABLES independientes del asistente.
 * Una instrucción puede ser consumida por múltiples asistentes.
 * Una instrucción NO SABE quién la consume - la relación es unidireccional.
 * 
 * Características:
 * - Versionable
 * - Copiable  
 * - Pública/privada/compartida
 * - Límite: 5000 caracteres
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Share2, Download, Copy, Eye, Code, X, RotateCcw, Pencil } from 'lucide-react';
import { Button, Badge } from '../../ui';
import { useAuthStore } from '../../../store/authStore';

const MAX_CHARS = 5000;

const escapeHtml = (text: string = '') =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (text: string = '') =>
  text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const formatInlineMarkdown = (rawText: string) => {
  let text = escapeHtml(rawText);

  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) => {
    const safeUrl = escapeAttribute(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return text;
};

const markdownToHtml = (markdown: string = '') => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeCodeBlock = () => {
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        closeList();
        inCodeBlock = true;
        codeBuffer = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        closeCodeBlock();
        html.push('<ul>');
        inList = true;
      }
      const item = line.replace(/^\s*[-*]\s+/, '');
      html.push(`<li>${formatInlineMarkdown(item)}</li>`);
      return;
    }

    closeList();

    if (line.trim() === '') {
      html.push('');
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      html.push(`<h${level}>${formatInlineMarkdown(content)}</h${level}>`);
      return;
    }

    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  });

  closeList();
  closeCodeBlock();

  return html.join('\n');
};

interface Instruction {
  id: string;
  name: string;
  description?: string;
  content: string;
  status: 'draft' | 'production' | 'disabled';
  updatedAt: string;
  lastModifiedBy?: string;
  sizeBytes: number;
  tokensEstimated: number;
  wordCount: number;
  lineCount: number;
  usedByAssistants?: string[];
}

interface InstructionsViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  instructionId?: string;
}

export function InstructionsView({ accountId, onOpenTab, instructionId }: InstructionsViewProps) {
  const { token } = useAuthStore();
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const autoSelectedInstructionIdRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (accountId && token) loadInstructions();
  }, [accountId, token]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  const loadInstructions = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`/api/fluxcore/instructions?accountId=${accountId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setInstructions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructionById = async (id: string) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`/api/fluxcore/instructions/${id}?accountId=${accountId}`, { headers });
      const data = await response.json();
      if (data.success && data.data) {
        setSelectedInstruction(data.data);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error loading instruction:', error);
    }
  };

  const handleCreateNew = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/fluxcore/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: 'Nuevas instrucciones',
          content: '',
          status: 'draft',
        }),
      });

      const created = await res.json();
      if (created.success && created.data) {
        await loadInstructions();
        if (onOpenTab) {
          onOpenTab(created.data.id, created.data.name, {
            type: 'instruction',
            instructionId: created.data.id,
          });
        } else {
          setSelectedInstruction(created.data);
        }
      }
    } catch (e) {
      console.error('Error creating instruction', e);
    }
  };

  const handleSelectInstruction = (instruction: Instruction) => {
    if (onOpenTab && !instructionId) {
      onOpenTab(instruction.id, instruction.name, { type: 'instruction', instructionId: instruction.id });
      return;
    }
    setSelectedInstruction(instruction);
  };

  useEffect(() => {
    if (!instructionId) return;
    if (!token) return;
    if (selectedInstruction?.id === instructionId) return;
    if (autoSelectedInstructionIdRef.current === instructionId) return;

    const fromList = instructions.find((i) => i.id === instructionId);
    autoSelectedInstructionIdRef.current = instructionId;
    if (fromList) {
      setSelectedInstruction(fromList);
      setHasChanges(false);
    }
    void loadInstructionById(instructionId);
  }, [instructionId, instructions, selectedInstruction?.id, token]);

  useEffect(() => {
    if (!onOpenTab) return;
    if (instructionId) return;
    if (!selectedInstruction) return;
    setSelectedInstruction(null);
  }, [instructionId, onOpenTab, selectedInstruction]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'production':
        return <Badge variant="success">Producción</Badge>;
      case 'disabled':
        return <Badge variant="warning">Desactivado</Badge>;
      default:
        return <Badge variant="info">Borrador</Badge>;
    }
  };

  // Calcular estadísticas del contenido editado
  const getStats = (content: string) => {
    const lines = content.split('\n').length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(words * 1.3);
    const chars = content.length;
    return { lines, words, tokens, chars };
  };

  const handleContentChange = (newContent: string) => {
    if (newContent.length <= MAX_CHARS && selectedInstruction) {
      setSelectedInstruction({ ...selectedInstruction, content: newContent });
      setHasChanges(true);
    }
  };

  const handleCopyContent = async () => {
    if (!selectedInstruction) return;
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(selectedInstruction.content || '');
      setCopyStatus('copied');
    } catch (error) {
      console.error('Error copying instruction content', error);
      setCopyStatus('error');
    } finally {
      copyTimeoutRef.current = setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleDownloadContent = () => {
    if (!selectedInstruction) return;
    const blob = new Blob([selectedInstruction.content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${selectedInstruction.name || 'instruccion'}.md`;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNameSave = async (newName: string) => {
    if (!selectedInstruction) return;
    if (!token) return;
    if (newName.trim() === selectedInstruction.name) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/fluxcore/instructions/${selectedInstruction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: newName.trim(),
          description: selectedInstruction.description ?? undefined,
          content: selectedInstruction.content,
          status: selectedInstruction.status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error saving instruction name:', text);
        setSaveError('Error al guardar nombre');
        return;
      }

      setSelectedInstruction({ ...selectedInstruction, name: newName.trim() });
      await loadInstructions(); // Update the list
    } catch (e) {
      console.error('Error saving instruction name', e);
      setSaveError('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!selectedInstruction?.id) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/fluxcore/instructions/${selectedInstruction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: selectedInstruction.name,
          description: selectedInstruction.description ?? undefined,
          content: selectedInstruction.content,
          status: selectedInstruction.status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error saving instruction:', text);
        setSaveError('Error al guardar cambios');
        return;
      }

      await loadInstructions();
      setHasChanges(false);
    } catch (e) {
      console.error('Error saving instruction', e);
      setSaveError('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  // Vista de detalle con editor (según diseño: editor con números de línea)
  if (selectedInstruction) {
    const stats = getStats(selectedInstruction.content);
    const lines = selectedInstruction.content.split('\n');

    return (
      <div className="h-full flex flex-col bg-background">
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
                value={selectedInstruction.name}
                onChange={(e) => setSelectedInstruction({ ...selectedInstruction, name: e.target.value })}
                onBlur={(e) => handleNameSave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Nombre de la instrucción"
                aria-label="Nombre de la instrucción"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                viewMode === 'code' ? 'text-primary' : 'text-muted hover:text-primary'
              }`}
            >
              <Code size={14} />
              Código
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                viewMode === 'preview' ? 'text-primary' : 'text-muted hover:text-primary'
              }`}
            >
              <Eye size={14} />
              Vista previa
            </button>
            <div className="w-px h-6 bg-subtle mx-2" />
            <button
              className="p-2 hover:bg-hover rounded flex items-center gap-1"
              title="Copiar contenido"
              onClick={handleCopyContent}
              disabled={!selectedInstruction?.content}
            >
              <Copy size={16} className="text-muted" />
              {copyStatus === 'copied' && (
                <span className="text-xs text-accent font-medium">Copiado</span>
              )}
              {copyStatus === 'error' && (
                <span className="text-xs text-error font-medium">Error</span>
              )}
            </button>
            <button
              className="p-2 hover:bg-hover rounded"
              title="Descargar como .md"
              onClick={handleDownloadContent}
              disabled={!selectedInstruction?.content}
            >
              <Download size={16} className="text-muted" />
            </button>
            <Button size="sm" className="ml-2" disabled={!hasChanges || isSaving} onClick={handleSave}>
              Guardar
            </Button>
            {!instructionId && (
              <button 
                className="p-2 hover:bg-hover rounded"
                onClick={() => setSelectedInstruction(null)}
                title="Cerrar"
              >
                <X size={16} className="text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Editor con números de línea */}
        <div className="flex-1 overflow-hidden flex">
          {viewMode === 'code' ? (
            <div className="flex-1 flex overflow-auto bg-elevated">
              {/* Números de línea */}
              <div className="py-4 pl-4 pr-2 text-right select-none border-r border-subtle">
                {lines.map((_, i) => (
                  <div key={i} className="text-xs text-muted font-mono leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Contenido */}
              <textarea
                className="flex-1 p-4 bg-transparent text-primary font-mono text-sm leading-6 resize-none focus:outline-none"
                value={selectedInstruction.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="# Instrucciones&#10;&#10;Escribe aquí las instrucciones para el asistente..."
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-auto">
              <div
                className="prose prose-invert max-w-none space-y-4 text-sm"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(selectedInstruction.content || ''),
                }}
              />
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        <div className="px-6 py-2 border-t border-subtle flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-4">
            <span>{stats.lines} líneas</span>
            <span>{stats.words} palabras</span>
            <span>~{stats.tokens} tokens</span>
            {isSaving && <span>Guardando...</span>}
            {saveError && <span className="text-red-500">{saveError}</span>}
          </div>
          <span className={stats.chars > MAX_CHARS * 0.9 ? 'text-warning' : ''}>
            {stats.chars.toLocaleString()}/{MAX_CHARS.toLocaleString()} caracteres
          </span>
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Instrucciones del sistema</h2>
        <Button size="sm" onClick={handleCreateNew}>
          <Plus size={16} className="mr-1" />
          Crear instrucciones
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Cargando instrucciones...
          </div>
        ) : instructions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={48} className="text-muted mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No hay instrucciones configuradas
            </h3>
            <p className="text-secondary mb-4">
              Crea instrucciones del sistema para guiar a tus asistentes
            </p>
            <Button onClick={handleCreateNew}>
              <Plus size={16} className="mr-1" />
              Crear instrucciones
            </Button>
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-subtle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Asistente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Última modificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Tamaño</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((instruction) => (
                  <tr
                    key={instruction.id}
                    className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
                    onClick={() => handleSelectInstruction(instruction)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-accent" />
                        <span className="font-medium text-primary">{instruction.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary">-</td>
                    <td className="px-4 py-3">{getStatusBadge(instruction.status)}</td>
                    <td className="px-4 py-3 text-secondary text-sm">
                      {formatDate(instruction.updatedAt)}
                      {instruction.lastModifiedBy && ` ${instruction.lastModifiedBy}`}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm">
                      {formatSize(instruction.sizeBytes)} - {instruction.tokensEstimated} tokens
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button className="p-1 hover:bg-elevated rounded" title="Compartir">
                          <Share2 size={16} className="text-muted" />
                        </button>
                        <button className="p-1 hover:bg-elevated rounded" title="Descargar">
                          <Download size={16} className="text-muted" />
                        </button>
                        <button className="p-1 hover:bg-elevated rounded" title="Recargar">
                          <RotateCcw size={16} className="text-muted" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstructionsView;
