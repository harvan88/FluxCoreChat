/**
 * UnifiedKernelMonitor (v10.0 Forensic)
 * 
 * Sistema unificado de observabilidad del Kernel y la IA.
 * Fusiona el Pipeline de 7 pasos con las Trazas Técnicas (E/S).
 */

import { useState, useMemo } from 'react';
import { 
    Activity, 
    Cpu, 
    Database, 
    Terminal, 
    Clock, 
    ChevronRight, 
    ChevronDown, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Copy,
    Share2,
    FileJson,
    Zap,
    Search,
    Circle,
    Play,
    Save
} from 'lucide-react';
import { useTelemetry, TelemetryGroup, TechnicalTrace } from '../../hooks/useTelemetry';
import { Badge, Button, Card, CollapsibleSection, CopyButton, Avatar } from '../ui';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';
import type { Account } from '../../types';
import { clsx } from 'clsx';

// ============================================================================
// Sub-componentes
// ============================================================================

const PipelineStep = ({ name, status, stepId }: { name: string, status?: string, stepId: string }) => {
    const variant = useMemo(() => {
        if (status === 'success') return 'success';
        if (status === 'error') return 'error';
        if (status === 'processing') return 'info';
        return 'neutral';
    }, [status]);

    return (
        <div className="flex flex-col items-center gap-2 group">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${status === 'processing' ? 'animate-pulse border-accent bg-accent/10' : ''}
                ${status === 'success' ? 'border-success bg-success/10 text-success' : ''}
                ${status === 'error' ? 'border-error bg-error/10 text-error' : ''}
                ${!status ? 'border-subtle bg-surface text-muted' : ''}
            `}>
                {status === 'success' ? <CheckCircle2 size={20} /> : 
                 status === 'error' ? <AlertCircle size={20} /> : 
                 status === 'processing' ? <Loader2 size={20} className="animate-spin" /> : 
                 null}
            </div>
            <span className={`text-[10px] font-bold text-center max-w-[80px] ${status ? 'text-primary' : 'text-muted'}`}>
                {name}
            </span>
        </div>
    );
};

const JSONView = ({ data, title }: { data: any, title: string }) => (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[10px] font-bold text-muted px-1">{title}</span>
        <pre className="bg-surface border border-subtle rounded p-3 text-[11px] font-mono text-primary overflow-auto max-h-[300px] custom-scrollbar break-words whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
        </pre>
    </div>
);

const PhaseInspector = ({ trace }: { trace: TechnicalTrace }) => (
    <div className="space-y-3 p-4 bg-elevated/40 border-l-2 border-accent rounded-r-lg">
        <div className="flex items-center justify-between">
            <Badge variant={trace.status === 'completed' ? 'success' : 'error'} size="sm">
                {trace.stepName}
            </Badge>
            <span className="text-[10px] text-muted font-mono">{trace.timestamp}</span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
            <JSONView title="Reality Input (Entrada)" data={trace.input} />
            <ArrowIcon />
            <JSONView title="Reality Output (Salida)" data={trace.output || trace.error || 'N/A'} />
        </div>
    </div>
);

const ArrowIcon = () => (
    <div className="flex items-center justify-center p-2 text-muted">
        <ChevronRight className="hidden md:block" />
        <ChevronDown className="md:hidden" />
    </div>
);

// ============================================================================
// Componente Principal
// ============================================================================

export function UnifiedKernelMonitor() {
    const globalSelectedAccountId = useUIStore(state => state.selectedAccountId);
    const [localAccountId, setLocalAccountId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Account[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

    // Priorizar cuenta local (del buscador) sobre la global
    const activeAccountId = localAccountId || globalSelectedAccountId || '';

    const { 
        groups, 
        status, 
        clear, 
        isConnected, 
        loadHistory, 
        saveTrace,
        togglePersistence, 
        isPersistenceEnabled,
        clearServerHistory 
    } = useTelemetry({ 
        accountId: activeAccountId,
        autoConnect: true 
    });

    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Cargar info de cuenta seleccionada si cambia el ID
    useMemo(async () => {
        if (activeAccountId && !selectedAccount) {
            const res = await api.searchAccounts(activeAccountId); // Búsqueda por ID
            if (res.success && res.data?.[0]) {
                setSelectedAccount(res.data[0]);
            }
        }
    }, [activeAccountId]);

    // Lógica de búsqueda de cuentas
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const res = await api.searchAccounts(query);
        if (res.success) {
            setSearchResults(res.data || []);
        }
        setIsSearching(false);
    };

    // Ordenar grupos por última actualización
    const sortedGroups = useMemo(() => {
        return Object.values(groups).sort((a, b) => 
            new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
        );
    }, [groups]);

    const activeGroup = useMemo(() => {
        if (!selectedMessageId) return sortedGroups[0] || null;
        return groups[selectedMessageId] || sortedGroups[0] || null;
    }, [selectedMessageId, sortedGroups, groups]);

    // Lógica para exportar reporte completo
    const generateMarkdownReport = (group: TelemetryGroup) => {
        let md = `# Reporte Forense del Kernel - Mensaje ${group.messageId}\n\n`;
        md += `**Cuenta:** ${group.accountId}\n`;
        md += `**Conversación:** ${group.conversationId}\n`;
        md += `**Fecha:** ${group.lastUpdate}\n\n`;
        
        md += `## Pasos del pipeline\n`;
        Object.values(group.steps).forEach(s => {
            md += `- **${s.step}**: ${s.status} (${s.timestamp})\n`;
        });
        
        md += `\n## Fases del runtime (Trazas forenses)\n`;
        group.traces.forEach(t => {
            md += `### Fase: ${t.stepName}\n`;
            md += `#### Entrada\n\`\`\`json\n${JSON.stringify(t.input, null, 2)}\n\`\`\`\n`;
            md += `#### Salida\n\`\`\`json\n${JSON.stringify(t.output || t.error, null, 2)}\n\`\`\`\n\n`;
        });
        
        return md;
    };

    return (
        <div className="flex h-full bg-surface overflow-hidden">
            {/* Sidebar de Turnos */}
            <aside className="w-80 border-r border-subtle flex flex-col bg-elevated/20">
                {/* 🎯 BUSCADOR DE CUENTAS FIJO (v13.1) */}
                <div className="p-3 border-b border-subtle bg-surface/50">
                    <div className="relative mb-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Auditar cuenta (alias...)"
                            className="w-full bg-elevated text-primary pl-9 pr-4 py-2 rounded-lg text-xs border border-subtle focus:outline-none focus:border-accent transition-all"
                        />
                        {isSearching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent" />}
                    </div>

                    {/* Resultados de búsqueda */}
                    {searchResults.length > 0 && (
                        <div className="absolute left-2 right-2 mt-1 bg-surface border border-subtle rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {searchResults.map(acc => (
                                <button
                                    key={acc.id}
                                    onClick={() => {
                                        setLocalAccountId(acc.id);
                                        setSelectedAccount(acc);
                                        setSearchResults([]);
                                        setSearchQuery('');
                                        clear(); // Limpiar trazas anteriores
                                    }}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-hover rounded-lg transition-colors text-left"
                                >
                                    <Avatar name={acc.displayName} size="xs" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-primary truncate">{acc.displayName}</div>
                                        <div className="text-[10px] text-muted truncate">@{acc.alias}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Cuenta Seleccionada / Controles REC */}
                    {activeAccountId ? (
                        <div className="flex items-center justify-between p-2 bg-accent/5 rounded-lg border border-accent/20">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {selectedAccount ? (
                                    <Avatar name={selectedAccount.displayName} size="xs" />
                                ) : (
                                    <Circle size={10} className="text-accent" />
                                )}
                                <span className="text-[10px] font-bold text-accent truncate">
                                    {selectedAccount?.displayName || 'Auditoría activa'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => togglePersistence(!isPersistenceEnabled)}
                                    className={clsx(
                                        "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all flex items-center gap-1",
                                        isPersistenceEnabled ? "bg-red-500 text-white animate-pulse" : "bg-subtle text-muted hover:bg-hover border border-subtle"
                                    )}
                                    title={isPersistenceEnabled ? "Detener monitorización en vivo" : "Iniciar monitorización en vivo (telemetría)"}
                                >
                                    <Activity size={10} className={isPersistenceEnabled ? "animate-pulse" : ""} />
                                    {isPersistenceEnabled ? 'En vivo' : 'Monitorear'}
                                </button>
                                
                                <button 
                                    onClick={clearServerHistory}
                                    title="Limpiar historial de esta cuenta"
                                    className="p-1 rounded-lg hover:bg-hover text-muted hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400">
                                    <Search size={14} />
                                </div>
                                <div className="text-[10px] font-bold text-indigo-400 tracking-tight">
                                    Monitor global
                                </div>
                            </div>
                            <div className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold">
                                OMNISCIENTE
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-b border-subtle flex items-center justify-between">
                    <h3 className="text-[10px] font-bold tracking-widest flex items-center gap-2 text-muted">
                        <Terminal size={14} />
                        Historial de turnos
                    </h3>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                                setIsLoadingHistory(true);
                                await loadHistory();
                                setIsLoadingHistory(false);
                            }} 
                            disabled={isLoadingHistory || !activeAccountId} 
                            title="Cargar historial de la base de datos"
                        >
                            <Play size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearServerHistory} 
                            disabled={!activeAccountId}
                            className="text-muted hover:text-red-500"
                            title="Borrar auditoría (base de datos)"
                        >
                            <Trash2 size={14} />
                        </Button>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {sortedGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted p-8 text-center">
                            <Activity size={32} className="opacity-20 mb-2" />
                            <p className="text-xs">Esperando telemetría del Kernel...</p>
                        </div>
                    ) : (
                        sortedGroups.map(group => (
                            <button
                                key={group.messageId}
                                onClick={() => setSelectedMessageId(group.messageId)}
                                className={`
                                    w-full p-3 rounded-lg text-left transition-all group
                                    ${activeGroup?.messageId === group.messageId ? 'bg-accent/10 border border-accent/30' : 'hover:bg-hover border border-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-mono font-bold text-primary truncate max-w-[150px]">
                                            Turno {group.messageId.slice(0, 8).toUpperCase()}
                                        </span>
                                        {!activeAccountId && (
                                            <span className="text-[9px] text-muted truncate">
                                                ID: {group.accountId.slice(0, 8)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {(group as any).isPersisted ? (
                                            <div className="p-1 text-success" title="Persistido en DB">
                                                <Database size={12} />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    saveTrace(group.messageId);
                                                }}
                                                className="p-1 rounded-md hover:bg-accent/20 text-accent transition-colors"
                                                title="Guardar traza en la base de datos"
                                            >
                                                <Save size={12} />
                                            </button>
                                        )}
                                        <span className="text-[9px] text-muted font-mono">
                                            {new Date(group.lastUpdate).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {['ingreso', 'runtime', 'entrega'].map(s => (
                                        <div 
                                            key={s} 
                                            className={`w-1.5 h-1.5 rounded-full ${group.steps[s]?.status === 'success' ? 'bg-success' : 'bg-subtle'}`} 
                                        />
                                    ))}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Visualizador Principal */}
            <main className="flex-1 flex flex-col min-w-0 bg-surface">
                {!activeGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted">
                        <Cpu size={48} className="opacity-10 mb-4 animate-pulse" />
                        <p className="text-sm">Selecciona un turno para iniciar la auditoría forense</p>
                    </div>
                ) : (
                    <>
                        {/* Header del Turno */}
                        <header className="p-4 border-b border-subtle flex items-center justify-between bg-surface z-10">
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-primary font-mono">Turno: {activeGroup.messageId}</h2>
                                        <CopyButton text={activeGroup.messageId} size="sm" />
                                    </div>
                                    <p className="text-xs text-muted flex items-center gap-2">
                                        <Clock size={12} /> Actualizado: {new Date(activeGroup.lastUpdate).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                    const blob = new Blob([generateMarkdownReport(activeGroup)], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `audit-report-${activeGroup.messageId.slice(0, 8)}.md`;
                                    a.click();
                                }}>
                                    <Share2 size={14} className="mr-2" /> Reporte MD
                                </Button>
                                <CopyButton 
                                    text={generateMarkdownReport(activeGroup)} 
                                    variant="solid" 
                                    size="sm"
                                    leftIcon={<Copy size={14} />}
                                >
                                    Copia Masiva
                                </CopyButton>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Pipeline de 7 Pasos */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-bold tracking-widest text-muted flex items-center gap-2">
                                        <Zap size={14} className="text-accent" />
                                        Flujo de soberanía del kernel
                                    </h3>
                                </div>
                                <div className="flex justify-between items-start relative px-4">
                                    <div className="absolute top-5 left-10 right-10 h-[2px] bg-subtle -z-10" />
                                    <PipelineStep name="Ingreso" stepId="ingreso" status={activeGroup.steps['ingreso']?.status} />
                                    <PipelineStep name="Proyección" stepId="proyeccion" status={activeGroup.steps['proyeccion']?.status} />
                                    <PipelineStep name="Worker" stepId="worker" status={activeGroup.steps['worker']?.status} />
                                    <PipelineStep name="Dispatcher" stepId="dispatcher" status={activeGroup.steps['dispatcher']?.status} />
                                    <PipelineStep name="IA Runtime" stepId="runtime" status={activeGroup.steps['runtime']?.status} />
                                    <PipelineStep name="Certificación" stepId="certificacion" status={activeGroup.steps['certificacion']?.status} />
                                    <PipelineStep name="Entrega" stepId="entrega" status={activeGroup.steps['entrega']?.status} />
                                </div>
                            </section>

                            <hr className="border-subtle" />

                            {/* Detalle de fases de IA */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold tracking-widest text-muted flex items-center gap-2">
                                        <Activity size={14} className="text-accent" />
                                        Auditoría del runtime cognitivo (fases 0-3)
                                    </h3>
                                    <Badge variant="neutral" badgeStyle="soft" size="sm">
                                        {activeGroup.traces.length} trazas forenses
                                    </Badge>
                                </div>

                                {activeGroup.traces.length === 0 ? (
                                    <div className="p-12 border-2 border-dashed border-subtle rounded-xl text-center">
                                        <Database size={32} className="mx-auto text-muted mb-2 opacity-20" />
                                        <p className="text-xs text-muted">No se han recibido trazas técnicas para este turno aún.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Agrupar por fase y mostrar la más reciente de cada una */}
                                        {activeGroup.traces.map((trace) => (
                                            <CollapsibleSection
                                                key={trace.spanId + trace.status}
                                                title={trace.stepName}
                                                defaultExpanded={trace.status === 'failed'}
                                                badge={<Badge variant={trace.status === 'completed' ? 'success' : 'error'} size="sm">{trace.status}</Badge>}
                                            >
                                                <PhaseInspector trace={trace} />
                                            </CollapsibleSection>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
