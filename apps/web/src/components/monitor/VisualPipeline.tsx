import React, { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { AlertCircle, CheckCircle, CircleDashed, Loader2, Activity, ShieldCheck, Zap, Copy, Check } from 'lucide-react';

interface TelemetryStep {
    step: 'ingreso' | 'proyeccion' | 'worker' | 'dispatcher' | 'runtime' | 'certificacion' | 'entrega';
    status: 'pending' | 'processing' | 'success' | 'error';
    metadata?: Record<string, any>;
    error?: string;
    timestamp: string;
}

interface PipelineTrace {
    messageId: string;
    conversationId: string;
    steps: Record<string, TelemetryStep>;
    lastUpdate: Date;
    isAiResponse: boolean;
}

const PIPELINE_ORDER = [
    { id: 'ingreso', label: '1. Ingreso', desc: 'ChatCore Gateway' },
    { id: 'proyeccion', label: '2. Proyección', desc: 'Kernel Ingest' },
    { id: 'worker', label: '3. Worker', desc: 'Cognition Queue' },
    { id: 'dispatcher', label: '4. Dispatcher', desc: 'Soberanía' },
    { id: 'runtime', label: '5. Runtime', desc: 'Ejecución IA' },
    { id: 'certificacion', label: '6. Certificación', desc: 'Kernel Output' },
    { id: 'entrega', label: '7. Entrega', desc: 'Final Client' }
];

export function VisualPipeline() {
    const selectedAccountId = useUIStore((state) => state.selectedAccountId);
    const token = useAuthStore((state) => state.token);
    const pushToast = useUIStore((state) => state.pushToast);
    
    const [traces, setTraces] = useState<Record<string, PipelineTrace>>({});
    const [isConnected, setIsConnected] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    // Conexión WebSocket para recibir telemetría
    useEffect(() => {
        if (!selectedAccountId) return;
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const wsBase = apiUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws?accountId=${selectedAccountId}${token ? `&token=${token}` : ''}`;
        
        console.log('[VisualPipeline] Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('[VisualPipeline] Connected to telemetry stream');
            setIsConnected(true);
            ws.send(JSON.stringify({
                type: 'subscribe_telemetry',
                role: 'kernel_console'
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'telemetry:pipeline_step') {
                    const payload = data.payload;
                    const messageId = payload.messageId;
                    if (!messageId) return;

                    setTraces(prev => {
                        const currentTrace = (prev as Record<string, PipelineTrace>)[messageId] || {
                            messageId,
                            conversationId: payload.conversationId,
                            steps: {},
                            lastUpdate: new Date(),
                            isAiResponse: false
                        };
                        
                        const isAiResponse = currentTrace.isAiResponse || ['dispatcher', 'runtime', 'certificacion'].includes(payload.step);

                        return {
                            ...prev,
                            [messageId]: {
                                ...currentTrace,
                                lastUpdate: new Date(),
                                isAiResponse,
                                steps: {
                                    ...currentTrace.steps,
                                    [payload.step]: {
                                        step: payload.step,
                                        status: payload.status,
                                        metadata: payload.metadata,
                                        error: payload.error,
                                        timestamp: payload.timestamp || new Date().toISOString()
                                    }
                                }
                            }
                        };
                    });
                }
            } catch (e) {
                console.error('[VisualPipeline] Failed to parse WS message', e);
            }
        };
        
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => setIsConnected(false);
        
        return () => {
            ws.close();
        };
    }, [selectedAccountId, token]);

    // Función para copiar una traza individual
    const copyTraceToClipboard = useCallback((trace: PipelineTrace) => {
        try {
            const dataToCopy = JSON.stringify(trace, null, 2);
            navigator.clipboard.writeText(dataToCopy);
            
            setCopiedId(trace.messageId);
            setTimeout(() => setCopiedId(null), 2000);
            
            pushToast({
                type: 'success',
                title: 'Copiado al portapapeles',
                description: `Trace ${trace.messageId.slice(0, 8)}... copiado exitosamente.`,
                durationMs: 3000
            });
        } catch (err) {
            console.error('Failed to copy trace:', err);
            pushToast({
                type: 'error',
                title: 'Error al copiar',
                description: 'No se pudo copiar la traza al portapapeles.',
                durationMs: 3000
            });
        }
    }, [pushToast]);

    // Función para copiar todas las trazas
    const copyAllTraces = useCallback(() => {
        if (Object.keys(traces).length === 0) return;
        
        try {
            const dataToCopy = JSON.stringify(Object.values(traces), null, 2);
            navigator.clipboard.writeText(dataToCopy);
            
            pushToast({
                type: 'success',
                title: 'Todas las trazas copiadas',
                description: `${Object.keys(traces).length} trazas copiadas al portapapeles.`,
                durationMs: 3000
            });
        } catch (err) {
            console.error('Failed to copy traces:', err);
            pushToast({
                type: 'error',
                title: 'Error al copiar',
                description: 'No se pudieron copiar las trazas.',
                durationMs: 3000
            });
        }
    }, [traces, pushToast]);

    const renderStepIcon = (status?: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="text-green-500" size={20} />;
            case 'processing':
                return <Loader2 className="text-yellow-500 animate-spin" size={20} />;
            case 'error':
                return <AlertCircle className="text-red-500" size={20} />;
            default:
                return <CircleDashed className="text-gray-400 opacity-30" size={18} />;
        }
    };

    const renderConnector = (currentStatus?: string, nextStatus?: string) => {
        const colorClass = 
            currentStatus === 'success' && nextStatus ? 'bg-green-500' :
            currentStatus === 'success' ? 'bg-yellow-500 animate-pulse' :
            currentStatus === 'error' ? 'bg-red-500' :
            'bg-subtle opacity-30';
            
        return <div className={`h-0.5 w-6 mx-0.5 rounded ${colorClass}`} />;
    };

    const clearTraces = () => setTraces({});

    const sortedTraces = Object.values(traces).sort((a: PipelineTrace, b: PipelineTrace) => 
        b.lastUpdate.getTime() - a.lastUpdate.getTime()
    );

    return (
        <div className="flex flex-col h-full bg-base text-primary overflow-hidden">
            <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Activity size={18} className="text-accent" />
                        Live Cognitive Pipeline
                    </h2>
                    <p className="text-sm text-secondary">Trazabilidad en tiempo real y Soberanía de Runtime.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 bg-surface rounded border border-subtle">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-secondary">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    
                    <button 
                        onClick={copyAllTraces}
                        disabled={sortedTraces.length === 0}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors disabled:opacity-30"
                        title="Copiar todas las trazas (JSON)"
                    >
                        <Copy size={14} />
                        Copiar Todo
                    </button>

                    <div className="w-px h-4 bg-subtle" />

                    <button 
                        onClick={clearTraces}
                        className="text-xs text-muted hover:text-red-400 underline transition-colors"
                    >
                        Limpiar
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
                {sortedTraces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-secondary border border-dashed border-subtle rounded-xl bg-surface/50">
                        <Loader2 className="animate-spin mb-4 text-accent/50" size={32} />
                        <p className="text-sm">Esperando tráfico en el Kernel...</p>
                        <p className="text-xs text-muted mt-1 italic">Envía un mensaje para verlo fluir por el pipeline.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedTraces.map((trace: PipelineTrace) => (
                            <div key={trace.messageId} className="bg-surface border border-subtle rounded-xl p-5 hover:border-accent/40 transition-colors shadow-sm relative group">
                                <button
                                    onClick={() => copyTraceToClipboard(trace)}
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-hover rounded-lg transition-all text-muted hover:text-accent"
                                    title="Copiar esta traza (JSON)"
                                >
                                    {copiedId === trace.messageId ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                </button>

                                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pr-10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Message ID</span>
                                            <span className="font-mono text-xs">{trace.messageId.slice(0, 18)}...</span>
                                        </div>
                                        <div className="h-6 w-px bg-subtle" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Conversation</span>
                                            <span className="font-mono text-xs text-accent">{trace.conversationId?.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-secondary bg-elevated px-2 py-1 rounded font-mono">
                                        {trace.lastUpdate.toLocaleTimeString()}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mb-6 overflow-x-auto pb-4 no-scrollbar">
                                    {PIPELINE_ORDER.map((stepConfig, index) => {
                                        const stepData = trace.steps[stepConfig.id];
                                        const isLast = index === PIPELINE_ORDER.length - 1;
                                        const nextStepData = !isLast ? trace.steps[PIPELINE_ORDER[index + 1].id] : undefined;
                                        
                                        return (
                                            <React.Fragment key={stepConfig.id}>
                                                <div className="flex flex-col items-center flex-1 min-w-[70px]">
                                                    <div className="mb-2 relative">
                                                        {renderStepIcon(stepData?.status)}
                                                        {stepData?.status === 'error' && (
                                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-bold uppercase tracking-tight text-center ${stepData ? 'text-primary' : 'text-muted opacity-40'}`}>
                                                        {stepConfig.label}
                                                    </span>
                                                    <span className="text-[8px] text-muted text-center italic mt-0.5">
                                                        {stepConfig.desc}
                                                    </span>
                                                </div>
                                                {!isLast && renderConnector(stepData?.status, nextStepData?.status)}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                
                                {/* Metadata Area: SOBERANÍA */}
                                {(trace.steps['dispatcher'] || trace.steps['runtime']) && (
                                    <div className="bg-base/50 rounded-lg p-3 border border-subtle/50 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-green-500" />
                                            <span className="text-[10px] font-bold uppercase text-secondary tracking-wider">Verificación de Soberanía</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                                            {trace.steps['dispatcher']?.metadata?.runtimeId && (
                                                <div className="flex items-center gap-2 text-green-400 bg-green-500/5 px-2 py-1 rounded border border-green-500/10">
                                                    <span className="text-muted">Kernel Choice:</span>
                                                    <span className="font-bold">{trace.steps['dispatcher'].metadata.runtimeId}</span>
                                                </div>
                                            )}
                                            
                                            {trace.steps['runtime']?.metadata?.latency && (
                                                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/5 px-2 py-1 rounded border border-yellow-500/10">
                                                    <span className="text-muted">Latency:</span>
                                                    <span>{trace.steps['runtime'].metadata.latency}ms</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Error Report */}
                                        {Object.values(trace.steps).some(s => s.status === 'error') && (
                                            <div className="text-red-400 mt-1 p-2 bg-red-900/10 rounded border border-red-500/20 text-[10px]">
                                                <span className="font-bold mr-1">[CRITICAL ERROR]:</span>
                                                {Object.values(trace.steps).find(s => s.status === 'error')?.error || 'Pipeline Interrupted'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
