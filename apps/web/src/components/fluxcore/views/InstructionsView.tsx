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
import {
  Plus,
  FileText,
  Share2,
  Download,
  Copy,
  Eye,
  Code,
  RotateCcw,
  Pencil,
  X,
} from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton } from '../../ui';
import { useAuthStore } from '../../../store/authStore';
import { usePanelStore } from '../../../store/panelStore';

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
  status: 'draft' | 'active' | 'disabled';
  updatedAt: string;
  lastModifiedBy?: string;
  sizeBytes: number;
  tokensEstimated: number;
  wordCount: number;
  lineCount: number;
  usedByAssistants?: string[];
  isManaged?: boolean;
}

interface InstructionsViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  instructionId?: string;
}

export function InstructionsView({ accountId, onOpenTab, instructionId }: InstructionsViewProps) {
  const { token } = useAuthStore();
  const { openTab } = usePanelStore();
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const autoSelectedInstructionIdRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    setDeleteError(null);
    if (onOpenTab) {
      onOpenTab(instruction.id, instruction.name, {
        type: 'instruction',
        instructionId: instruction.id,
      });
      return;
    }

    setSelectedInstruction(instruction);
    setIsSaving(false);
  };

  const deleteInstructionById = async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/fluxcore/instructions/${id}?accountId=${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setInstructions((prev) => prev.filter((i) => i.id !== id));
        setSelectedInstruction((prev) => (prev?.id === id ? null : prev));
        setDeleteError(null);
        return;
      }

      const data = await response.json().catch(() => null);
      const msg = typeof data?.message === 'string' ? data.message : 'No se pudo eliminar la instrucción';
      setDeleteError(msg);
    } catch (error) {
      console.error('Error deleting instruction:', error);
      setDeleteError('Error de conexión');
    }
  };

  const handleDeleteInstruction = async () => {
    if (!selectedInstruction) return;
    await deleteInstructionById(selectedInstruction.id);
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
      case 'active':
        return <Badge variant="success">Activo</Badge>;
      case 'disabled':
        return <Badge variant="warning">Desactivado</Badge>;
      default:
        return <Badge variant="info">Borrador</Badge>;
    }
  };

  // Calcular estadísticas del contenido editado (no usado actualmente)
  // const getStats = (content: string) => {
  //   const lines = content.split('\n').length;
  //   const words = content.trim().split(/\s+/).filter(Boolean).length;
  //   const tokens = Math.ceil(words * 1.3);
  //   const chars = content.length;
  //   return { lines, words, tokens, chars };
  // };

  const handleContentChange = (newContent: string) => {
    if (!selectedInstruction) return;
    const truncatedContent = newContent.slice(0, MAX_CHARS);
    setSelectedInstruction({ ...selectedInstruction, content: truncatedContent });
    setHasChanges(true);
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
        console.error('Failed to save instruction name');
        return;
      }

      setSelectedInstruction({ ...selectedInstruction, name: newName.trim() });
      await loadInstructions(); // Update the list
    } catch (e) {
      console.error('Error saving instruction name', e);
      console.error('Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!selectedInstruction?.id) return;

    setIsSaving(true);

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
        console.error('Failed to save instruction');
        return;
      }

      await loadInstructions();
      setHasChanges(false);
    } catch (e) {
      console.error('Error saving instruction', e);
      console.error('Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  // Vista de detalle con editor (según diseño: editor con números de línea)
  if (selectedInstruction) {
    const lines = selectedInstruction.content.split('\n');
    const isManaged = selectedInstruction.isManaged === true;

    return (
      <div className="h-full flex flex-col bg-background">
        {/* Banner para instrucciones gestionadas */}
        {isManaged && (
          <div className="px-6 py-3 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-accent">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  Esta instrucción es gestionada automáticamente
                </p>
                <p className="text-xs text-secondary mt-0.5">
                  Su contenido se genera dinámicamente desde tu perfil. Para editarlo, ve a Configuración → Perfil → Contexto para la IA.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                openTab('settings', {
                  type: 'settings',
                  title: 'Perfil',
                  closable: true,
                  context: {
                    settingsSection: 'profile',
                  },
                });
              }}
            >
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
                value={selectedInstruction.name}
                onChange={(e) => !isManaged && setSelectedInstruction({ ...selectedInstruction, name: e.target.value })}
                onBlur={(e) => !isManaged && handleNameSave(e.target.value)}
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
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${viewMode === 'code' ? 'text-primary' : 'text-muted hover:text-primary'
                }`}
            >
              <Code size={14} />
              Código
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${viewMode === 'preview' ? 'text-primary' : 'text-muted hover:text-primary'
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
            {!isManaged && (
              <Button size="sm" className="ml-2" disabled={!hasChanges || isSaving} onClick={handleSave}>
                Guardar
              </Button>
            )}
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
                onChange={(e) => !isManaged && handleContentChange(e.target.value)}
                placeholder="# Instrucciones&#10;&#10;Escribe aquí las instrucciones para el asistente..."
                spellCheck={false}
                maxLength={MAX_CHARS}
                readOnly={isManaged}
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

        {/* Footer con estadísticas y eliminación */}
        <div className="border-t border-subtle">
          <div className="p-4 text-xs text-muted space-y-1">
            <div className="flex justify-between">
              <span>Líneas:</span>
              <span className="text-primary">{selectedInstruction.lineCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Palabras:</span>
              <span className="text-primary">{selectedInstruction.wordCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tokens estimados:</span>
              <span className="text-primary">{selectedInstruction.tokensEstimated || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Caracteres:</span>
              <span className={selectedInstruction.content.length > MAX_CHARS ? 'text-error' : 'text-primary'}>
                {selectedInstruction.content.length} / {MAX_CHARS}
              </span>
            </div>
          </div>
          <div className="px-6 py-3 border-t border-subtle flex items-center justify-between gap-3 bg-surface">
            {deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
            {deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
            <DoubleConfirmationDeleteButton
              onConfirm={handleDeleteInstruction}
              className="ml-auto"
              size={16}
            />
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Asistente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Última modificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Tamaño</th>
                  <th className="px-4 py-3 sticky right-0 bg-surface"></th>
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-accent flex-shrink-0 min-w-[16px] min-h-[16px]" />
                          <span className="font-medium text-primary truncate">{instruction.name}</span>
                        </div>

                        <div className="flex items-center gap-1 md:hidden">
                          <button
                            className="p-1 hover:bg-elevated rounded"
                            title="Compartir"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Share2 size={16} className="text-muted" />
                          </button>
                          <button
                            className="p-1 hover:bg-elevated rounded"
                            title="Descargar"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} className="text-muted" />
                          </button>

                          <div className="flex items-center gap-3 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1 hover:bg-elevated rounded"
                              title="Descargar"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={16} className="text-muted flex-shrink-0" />
                            </button>

                            <DoubleConfirmationDeleteButton
                              onConfirm={() => deleteInstructionById(instruction.id)}
                              size={16}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary hidden md:table-cell">-</td>
                    <td className="px-4 py-3">{getStatusBadge(instruction.status)}</td>
                    <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                      {formatDate(instruction.updatedAt)}
                      {instruction.lastModifiedBy && ` ${instruction.lastModifiedBy}`}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                      {formatSize(instruction.sizeBytes)} - {instruction.tokensEstimated} tokens
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 hover:bg-elevated rounded"
                          title="Compartir"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 size={16} className="text-muted flex-shrink-0" />
                        </button>
                        <button
                          className="p-1 hover:bg-elevated rounded"
                          title="Descargar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={16} className="text-muted flex-shrink-0" />
                        </button>
                        <button
                          className="p-1 hover:bg-elevated rounded"
                          title="Recargar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RotateCcw size={16} className="text-muted flex-shrink-0" />
                        </button>

                        <DoubleConfirmationDeleteButton
                          onConfirm={() => deleteInstructionById(instruction.id)}
                          size={16}
                        />
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
