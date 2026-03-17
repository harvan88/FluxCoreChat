import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Loader2, Copy, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { Button, Checkbox, Select } from '../ui';

export function KernelConsole() {
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [copyFormat, setCopyFormat] = useState<'json' | 'csv' | 'raw'>('json');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Search/Filter states
  const [filters, setFilters] = useState({
    factType: '',
    sourceNamespace: '',
    search: '',
    limit: 50,
  });

  const fetchSignals = useCallback(async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    setError(null);
    try {
      const activeFilters = {
        ...(filters.factType ? { factType: filters.factType } : {}),
        ...(filters.sourceNamespace ? { sourceNamespace: filters.sourceNamespace } : {}),
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        limit: filters.limit,
      };

      const response = await api.getKernelConsoleSignals(selectedAccountId, activeFilters);
      if (response.success && response.data) {
        setSignals(response.data);
      } else {
        setError(response.error || 'Error fetching signals');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, filters]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 10000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const toggleRow = (seq: number) => {
    setExpandedSeq(prev => prev === seq ? null : seq);
  };

  // Función de copia con fallback (reutilizada de MonitoringHub)
  const copyViaFallback = (content: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!succeeded) {
      throw new Error('Fallback copy failed');
    }
  };

  // Formatear contenido según el tipo seleccionado
  const formatContent = useCallback((signalsToFormat: any[], format: 'json' | 'csv' | 'raw') => {
    switch (format) {
      case 'json':
        return JSON.stringify(signalsToFormat, null, 2);
      
      case 'csv':
        if (signalsToFormat.length === 0) return '';
        
        const headers = ['Seq', 'Fact Type', 'Source', 'Subject', 'Date', 'Status', 'Checksum'];
        const csvRows = [
          headers.join(','),
          ...signalsToFormat.map(sig => [
            sig.sequenceNumber,
            sig.factType,
            `${sig.sourceNamespace}:${sig.sourceKey}`,
            sig.subjectNamespace ? `${sig.subjectNamespace}:${sig.subjectKey}` : '',
            new Date(sig.observedAt).toISOString(),
            sig.status,
            sig.checksum
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ];
        return csvRows.join('\n');
      
      case 'raw':
        return signalsToFormat.map(sig => 
          `Signal #${sig.sequenceNumber} (${sig.factType})\n` +
          `Source: ${sig.sourceNamespace}:${sig.sourceKey}\n` +
          `Subject: ${sig.subjectNamespace ? `${sig.subjectNamespace}:${sig.subjectKey}` : '-'}\n` +
          `Date: ${new Date(sig.observedAt).toLocaleString()}\n` +
          `Status: ${sig.status}\n` +
          `Checksum: ${sig.checksum}\n` +
          `---\n` +
          (sig.evidenceRaw ? JSON.stringify(sig.evidenceRaw, null, 2) : 'No payload') +
          '\n\n'
        ).join('');
      
      default:
        return JSON.stringify(signalsToFormat, null, 2);
    }
  }, []);

  // Función principal de copia
  const handleCopy = useCallback(async (signalsToCopy: any[], format: 'json' | 'csv' | 'raw') => {
    const content = formatContent(signalsToCopy, format);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        copyViaFallback(content);
      }
      setCopyFeedback(`${signalsToCopy.length} señal(es) copiada(s) como ${format.toUpperCase()}`);
    } catch (error) {
      console.warn('[KernelConsole] clipboard copy failed', error);
      try {
        copyViaFallback(content);
        setCopyFeedback(`${signalsToCopy.length} señal(es) copiada(s) como ${format.toUpperCase()}`);
      } catch (fallbackError) {
        console.warn('[KernelConsole] fallback copy failed', fallbackError);
        setCopyFeedback('No se pudo copiar, usa Cmd/Ctrl + C');
      }
    } finally {
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, [formatContent]);

  // Manejadores de selección
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === signals.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(signals.map(sig => sig.sequenceNumber)));
    }
  }, [selectedRows.size, signals]);

  const handleSelectRow = useCallback((seq: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seq)) {
        newSet.delete(seq);
      } else {
        newSet.add(seq);
      }
      return newSet;
    });
  }, []);

  const getSelectedSignals = useCallback(() => {
    return signals.filter(sig => selectedRows.has(sig.sequenceNumber));
  }, [signals, selectedRows]);

  return (
    <div className="flex flex-col h-full bg-base text-primary">
      <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kernel Signals (Live)</h2>
          <p className="text-sm text-secondary">Monitor de señales en tiempo real desde FluxCore Kernel.</p>
        </div>
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-xs text-secondary bg-elevated px-2 py-1 rounded">
              {copyFeedback}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSignals}
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="border-b border-subtle px-5 py-3 bg-base flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar evidence o ID..."
          className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && fetchSignals()}
        />
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <div className="w-48">
            <Select
              value={filters.factType}
              onChange={(value) => setFilters(prev => ({ ...prev, factType: value as string }))}
              options={[
                { value: '', label: 'Todos los Tipos' },
                { value: 'AI_RESPONSE_GENERATED', label: 'AI_RESPONSE_GENERATED' },
                { value: 'EXTERNAL_INPUT_OBSERVED', label: 'EXTERNAL_INPUT_OBSERVED' },
                { value: 'KERNEL_SESSION_CREATED', label: 'KERNEL_SESSION_CREATED' },
                { value: 'ASSET_UPLOADED', label: 'ASSET_UPLOADED' },
                { value: 'AI_MEMORY_RECALLED', label: 'AI_MEMORY_RECALLED' }
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={filters.sourceNamespace}
              onChange={(value) => setFilters(prev => ({ ...prev, sourceNamespace: value as string }))}
              options={[
                { value: '', label: 'Cualquier Origen' },
                { value: '@fluxcore/cognition', label: '@fluxcore/cognition' },
                { value: '@fluxcore/internal', label: '@fluxcore/internal' },
                { value: '@fluxcore/assets', label: '@fluxcore/assets' }
              ]}
            />
          </div>
          <div className="w-32">
            <Select
              value={String(filters.limit)}
              onChange={(value) => setFilters(prev => ({ ...prev, limit: Number(value as string) }))}
              options={[
                { value: '25', label: '25 signals' },
                { value: '50', label: '50 signals' },
                { value: '100', label: '100 signals' },
                { value: '200', label: '200 signals' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Barra de herramientas de selección y copia */}
      {signals.length > 0 && (
        <div className="border-b border-subtle px-5 py-3 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRows.size === signals.length && signals.length > 0}
                  onChange={handleSelectAll}
                  label={selectedRows.size > 0 ? `${selectedRows.size} seleccionadas` : 'Seleccionar todo'}
                />
              </div>
              
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <Select
                      value={copyFormat}
                      onChange={(value) => setCopyFormat(value as 'json' | 'csv' | 'raw')}
                      options={[
                        { value: 'json', label: 'JSON' },
                        { value: 'csv', label: 'CSV' },
                        { value: 'raw', label: 'Raw Signal' }
                      ]}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(getSelectedSignals(), copyFormat)}
                    leftIcon={<Copy size={14} />}
                  >
                    Copiar ({selectedRows.size})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRows(new Set())}
                    leftIcon={<Trash2 size={14} />}
                  >
                    Limpiar selección
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Select
                  value={copyFormat}
                  onChange={(value) => setCopyFormat(value as 'json' | 'csv' | 'raw')}
                  options={[
                    { value: 'json', label: 'JSON' },
                    { value: 'csv', label: 'CSV' },
                    { value: 'raw', label: 'Raw Signal' }
                  ]}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCopy(signals, copyFormat)}
                leftIcon={<Copy size={14} />}
              >
                Copiar todo ({signals.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 flex-1 overflow-auto">
        {error && <div className="text-error mb-4">{error}</div>}

        <div className="border border-subtle rounded-xl bg-surface overflow-hidden">
          {signals.length === 0 && !isLoading ? (
            <div className="text-secondary text-sm p-4">Esperando señales...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary text-xs uppercase border-b border-subtle bg-base">
                    <th className="px-4 py-3 w-12">
                      <Checkbox
                        checked={selectedRows.size === signals.length && signals.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3">Seq</th>
                    <th className="px-4 py-3">Fact Type</th>
                    <th className="px-4 py-3">Primary Context (Actor/Target)</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((sig) => (
                    <React.Fragment key={sig.sequenceNumber}>
                      <tr
                        className={`border-b border-subtle/60 hover:bg-hover transition-colors cursor-pointer ${expandedSeq === sig.sequenceNumber ? 'bg-active' : ''}`}
                        onClick={() => toggleRow(sig.sequenceNumber)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.has(sig.sequenceNumber)}
                            onChange={() => handleSelectRow(sig.sequenceNumber)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-secondary">{sig.sequenceNumber}</td>
                        <td className="px-4 py-3 font-medium text-accent truncate max-w-[150px]" title={sig.factType}>{sig.factType}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">
                          {sig.sourceKey === sig.subjectKey && sig.sourceNamespace === sig.subjectNamespace ? (
                             <span className="text-secondary" title="Actor and Target are the same entity">{sig.sourceNamespace}:{sig.sourceKey}</span>
                          ) : (
                             <div className="flex flex-col gap-0.5">
                                <span className="text-secondary"><span className="text-muted mr-1">Src:</span>{sig.sourceNamespace}:{sig.sourceKey}</span>
                                {sig.subjectNamespace && (
                                   <span className="text-secondary"><span className="text-muted mr-1">Tgt:</span>{sig.subjectNamespace}:{sig.subjectKey}</span>
                                )}
                             </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-secondary text-xs">
                          {new Date(sig.observedAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            sig.status === 'certified' ? 'bg-green-500/10 text-green-500' :
                            sig.status === 'error' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {sig.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy([sig], copyFormat)}
                              leftIcon={<Copy size={12} />}
                              title={`Copiar señal ${sig.sequenceNumber} como ${copyFormat.toUpperCase()}`}
                            >
                              <Copy size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedSeq === sig.sequenceNumber && (
                        <tr className="bg-elevated border-b border-subtle">
                          <td colSpan={8} className="p-0">
                            <div className="p-4 flex flex-col md:flex-row gap-4">
                              <div className="flex-1">
                                <span className="text-xs uppercase text-secondary font-semibold tracking-wider mb-2 block">Payload (Evidence Raw)</span>
                                <div className="bg-base border border-subtle rounded-lg p-3 overflow-auto max-h-64">
                                  <pre className="text-xs text-primary font-mono whitespace-pre-wrap">
                                    {sig.evidenceRaw ? JSON.stringify(sig.evidenceRaw, null, 2) : 'No payload disponible'}
                                  </pre>
                                </div>
                              </div>
                              <div className="w-full md:w-1/3">
                                <span className="text-xs uppercase text-secondary font-semibold tracking-wider mb-2 block">Provenance & Metadata</span>
                                <div className="space-y-2 text-xs">
                                  <div className="flex flex-col border border-subtle bg-base rounded px-3 py-2">
                                    <span className="text-muted">Checksum:</span>
                                    <span className="font-mono text-secondary text-[10px] break-all">{sig.checksum}</span>
                                  </div>
                                  <div className="flex flex-col border border-subtle bg-base rounded px-3 py-2">
                                    <span className="text-muted">Previous Checksum:</span>
                                    <span className="font-mono text-secondary text-[10px] break-all">{sig.previousChecksum || '-'}</span>
                                  </div>
                                  <div className="flex gap-2">
                                     <div className="flex-1 border border-subtle bg-base rounded px-3 py-2 flex items-center justify-between">
                                        <span className="text-muted">vID:</span>
                                        <span className="font-mono">{sig.vId}</span>
                                     </div>
                                     <div className="flex-1 border border-subtle bg-base rounded px-3 py-2 flex items-center justify-between">
                                        <span className="text-muted">Retry:</span>
                                        <span className="font-mono">{sig.retryCount}</span>
                                     </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
