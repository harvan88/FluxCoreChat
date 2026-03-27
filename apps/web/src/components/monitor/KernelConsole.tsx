import { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Loader2, Copy } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui';

// El nuevo modelo jerárquico de trazas "TraceNode"
interface TraceNode {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  stepName: string;
  attributes: Record<string, string>; // Ej: "user.role": "gerente_tipo"
  payloadEnorme: any;                 // Arrays crudos, Plantillas, RuntimeInput
  timestamp: string;
  children: TraceNode[];
}

export function KernelConsole() {
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);
  const token = useAuthStore((state) => state.token);
  const [tracesFlat, setTracesFlat] = useState<TraceNode[]>([]);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Escuchando eventos en tiempo real...');

  // Nuevos filtros que Sí sirven, focalizados a cazar el "payload" específico:
  const [tagFilters, setTagFilters] = useState({ account: '', role: '', custom: '' });

  // 0. Cargar el historial REST "Legacy" para que no se vea vacío en recargas
  useEffect(() => {
    if (!selectedAccountId) return;
    
    const fetchHistoricSignals = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/kernel-console/pipeline-telemetry?accountId=${selectedAccountId}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (Array.isArray(data.items)) {
           // Sintetizamos los viejos "pipeline_step" a nuestro formato jerárquico
           // para que la misma UI TraceWaterfallViewer los pinte, aunque no tendrán PayloadEnorme.
           const historicNodes: TraceNode[] = data.items.map((item: any) => ({
               traceId: item.conversationId || item.messageId || `legacy-${item.id}`,
               spanId: `span-${item.id}`,
               parentSpanId: undefined, // En legacy no teníamos causalidad anidada
               stepName: `[Legacy DB] ${item.step || 'pipeline'}`,
               attributes: {
                   'account.id': item.accountId,
                   'status': item.status,
                   ...(item.metadata || {})
               },
               payloadEnorme: { _mensaje: "⚠️ ESTO ES UN REGISTRO HISTÓRICO. Para atrapar un Payload crudo gigante con sus plantillas, DEBES enviar un mensaje en este preciso instante (en vivo) para que OpenTelemetry lo atrape al vuelo." },
               timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
               children: []
           }));
           setTracesFlat(historicNodes);
        }
      } catch (err) {
        console.error('[KernelConsole] Error fetching historic:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoricSignals();
  }, [selectedAccountId]);

  // 1. Escuchar por WebSocket (Captura en VIVO)
  useEffect(() => {
    if (!selectedAccountId) return;

    let socket: WebSocket | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connect = () => {
      setIsLoading(true);
      
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const wsBase = apiUrl.replace(/^http/, 'ws');
      const wsUrl = `${wsBase}/ws?accountId=${selectedAccountId}${token ? `&token=${token}` : ''}`;
      
      console.log(`[KernelConsole] 📡 Conectando a WebSocket: ${wsUrl}`);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsLoading(false);
        setStatusText('Conectado en vivo 🟢');
        socket?.send(JSON.stringify({
          type: 'subscribe_telemetry',
          role: 'kernel_console'
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'telemetry:distributed_trace') {
            const newNode: TraceNode = {
               ...data.payload,
               children: [] // Inicializamos recursividad
            };
            setTracesFlat(prev => {
                // Evitamos duplicaciones indeseadas
                if (prev.some(t => t.spanId === newNode.spanId)) return prev;
                return [newNode, ...prev].slice(0, 500); // Mantenemos historial reciente en memoria
            });
          }
        } catch (err) {
          console.error('[KernelConsole] Error procesando mensaje WS:', err);
        }
      };

      socket.onclose = () => {
        setStatusText('Desconectado. Reintentando... 🔴');
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (socket) socket.close();
      clearTimeout(retryTimeout);
    };
  }, [selectedAccountId]);

  // 2. MAGIA: Algoritmo para armar el Árbol Dinámico Parent-Child
  const groupedTraces = useMemo(() => {
     // A. Filtrado utilitario (Por Tags injectados desde Backend)
     const filtered = tracesFlat.filter(t => {
        const matchAccount = tagFilters.account ? t.attributes['account.id'] === tagFilters.account : true;
        const matchRole = tagFilters.role ? t.attributes['user.role']?.includes(tagFilters.role) : true;
        const matchCustom = tagFilters.custom ? JSON.stringify(t.attributes).includes(tagFilters.custom) : true;
        return matchAccount && matchRole && matchCustom;
     });
     
     // B. Agrupamiento por Root (El Inicio de la conversación)
     const treeMap = new Map<string, TraceNode>();
     // Clon profundo (light) para no mutar el state original cada rerender
     const cloneFlat = filtered.map(t => ({ ...t, children: [] }));
     cloneFlat.forEach(t => treeMap.set(t.spanId, t));

     const roots: TraceNode[] = [];
     cloneFlat.forEach(t => {
        if(t.parentSpanId && treeMap.has(t.parentSpanId)) {
           treeMap.get(t.parentSpanId)!.children.push(t);
        } else {
           roots.push(t); // Es el inicio del request o huérfano (root defacto)
        }
     });
     
     // Ordenamos para que las conversaciones más nuevas (por timestamp root) queden arriba
     roots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
     
     return roots;
  }, [tracesFlat, tagFilters]);

  return (
    <div className="flex flex-col h-full bg-base text-primary">
      {/* HEADER: EL NUEVO ENFOQUE FORENSE */}
      <div className="border-b border-subtle px-5 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Distributed Reality Monitor
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Live Spans</span>
          </h2>
          <p className="text-sm text-secondary">Rastreo de Payloads Completos (Chatcore {`->`} Fluxcore {`->`} IA)</p>
          <p className="text-xs text-muted">{statusText}</p>
        </div>
        
        <div className="flex items-center gap-2">
            <Button
                variant="ghost" 
                size="sm"
                onClick={() => setTracesFlat([])}
                leftIcon={<RefreshCw size={14} />}
            >
                Limpiar Trazas
            </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
         {/* SIDEBAR DE CONVERSACIONES (ROOT SPANS) */}
         <div className="w-1/3 lg:w-1/4 xl:w-1/5 border-r border-subtle bg-surface flex flex-col hidden sm:flex">
             <div className="p-4 border-b border-subtle">
                 <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Filtros de Búsqueda</h3>
                 <div className="space-y-2">
                     <input 
                         className="w-full text-xs p-1.5 rounded border border-subtle bg-base outline-none focus:border-accent" 
                         placeholder="Ej: accountId..." 
                         value={tagFilters.account}
                         onChange={e => setTagFilters(p => ({...p, account: e.target.value}))}
                     />
                     <input 
                         className="w-full text-xs p-1.5 rounded border border-subtle bg-base outline-none focus:border-accent" 
                         placeholder="Ej: user.role: gerente_tipo..." 
                         value={tagFilters.role}
                         onChange={e => setTagFilters(p => ({...p, role: e.target.value}))}
                     />
                     <input 
                         className="w-full text-xs p-1.5 rounded border border-subtle bg-base outline-none focus:border-accent" 
                         placeholder="Cualquier Tag..." 
                         value={tagFilters.custom}
                         onChange={e => setTagFilters(p => ({...p, custom: e.target.value}))}
                     />
                 </div>
                 <div className="text-[10px] text-muted mt-2">
                    {tracesFlat.length} eventos locales agrupados en {groupedTraces.length} flujos.
                 </div>
             </div>
             
             <div className="flex-1 overflow-auto p-2 space-y-1 bg-base">
                 {groupedTraces.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-6 mt-10 text-center opacity-50">
                        {isLoading ? <Loader2 className="animate-spin mb-2" size={24} /> : <span className="text-2xl mb-2">🏔️</span>}
                        <p className="text-xs">No hay conversaciones enlazadas todavía. Envía un mensaje.</p>
                     </div>
                 ) : (
                     groupedTraces.map(root => (
                         <div 
                             key={root.spanId} 
                             onClick={() => setActiveTraceId(root.traceId)} 
                             className={`p-3 cursor-pointer rounded-lg border text-sm transition-all ${
                                 activeTraceId === root.traceId 
                                 ? 'bg-accent/10 border-accent/40 shadow-sm' 
                                 : 'bg-surface border-transparent hover:border-subtle hover:bg-hover'
                             }`}
                         >
                             <div className="flex justify-between items-start mb-1">
                                 <span className="font-bold text-xs truncate mr-2 text-primary">{root.stepName}</span>
                                 <span className="text-[9px] font-mono whitespace-nowrap opacity-60">
                                     {new Date(root.timestamp).toLocaleTimeString()}
                                 </span>
                             </div>
                             
                             <div className="text-[9px] flex flex-wrap gap-1 mt-1.5">
                                 {Object.entries(root.attributes || {}).slice(0, 2).map(([k, v]) => (
                                     <span key={k} className="bg-base px-1 py-0.5 rounded border border-subtle text-muted truncate max-w-[120px]" title={`${k}: ${v}`}>
                                         {k.split('.').pop()}: {v as string}
                                     </span>
                                 ))}
                                 {(Object.keys(root.attributes || {}).length > 2 || root.children.length > 0) && (
                                     <span className="bg-accent/10 text-accent px-1 py-0.5 rounded">+{root.children.length} saltos</span>
                                 )}
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </div>

         {/* VISUALIZADOR FORENSE DE LA CONVERSACIÓN ACTIVA (WATERFALL) */}
         <div className="flex-1 p-6 overflow-auto bg-base relative">
             {activeTraceId ? (() => {
                 const rootToRender = groupedTraces.find(r => r.traceId === activeTraceId);
                 if (!rootToRender) return <div className="text-center mt-20 text-secondary">Traza desplazada o eliminada.</div>;
                 return (
                     <div className="max-w-4xl mx-auto pb-20">
                         <div className="mb-6 pb-4 border-b border-subtle">
                            <h3 className="text-lg font-bold">Trace Viewer</h3>
                            <p className="text-xs text-muted font-mono mt-1">Trace ID: {rootToRender.traceId}</p>
                         </div>
                         {/* Pasamos el array de nodos (en este caso el root es el top level) */}
                         <TraceWaterfallViewer node={rootToRender} defaultExpanded={true} />
                     </div>
                 );
             })() : (
                 <div className="flex flex-col items-center justify-center h-full text-secondary">
                     <svg className="w-16 h-16 opacity-20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                         <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5-5-5M19.8 12H9" />
                     </svg>
                     <p>Selecciona una conversación del lateral izquierdo para depurar la línea de vida.</p>
                 </div>
             )}
         </div>
     </div>
    </div>
  );
}

// ============================================
// SUBNODO RECURSIVO (LA CASCADA VISUAL)
// ============================================
function TraceWaterfallViewer({ node, defaultExpanded = false }: { node: TraceNode, defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showPayload, setShowPayload] = useState(false);
  
  // Función helper segura para copiado
  const copyRaw = () => {
      try {
          // Fallback para navs con clipboard
          navigator.clipboard.writeText(JSON.stringify(node.payloadEnorme, null, 2));
      } catch(e) { console.error("Clipboard API err"); }
  };

  return (
     <div className="relative isolate">
         {/* Línea vertical conectora para la profundidad */}
         <div className="absolute left-2.5 top-8 bottom-0 w-px bg-subtle/70 -z-10" />

         <div className="mb-3">
             <div 
                className={`group flex items-center p-2 rounded-lg transition-colors cursor-pointer select-none
                            ${expanded ? 'bg-surface border-subtle border shadow-sm' : 'hover:bg-hover'}`}
                onClick={() => setExpanded(!expanded)}
             >
                 {/* Icono Cascada */}
                 <div className="w-5 h-5 flex items-center justify-center mr-2 text-secondary">
                    <span className="text-[10px] opacity-60">
                         {node.children.length === 0 ? '○' : expanded ? '▼' : '▶'}
                    </span>
                 </div>
                 
                 <div className="flex-1 flex items-center gap-3">
                     <span className={`font-mono font-bold text-sm ${expanded ? 'text-accent' : 'text-primary'}`}>
                        {node.stepName}
                     </span>
                     <span className="text-[10px] text-muted font-mono">{new Date(node.timestamp).toISOString().substring(11,23)}</span>
                 </div>
                 
                 {/* BOTÓN MAGIA: Ver Payload */}
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                         variant="secondary" 
                         size="xs" 
                         className="h-6 text-[10px]"
                         onClick={(e) => {
                             e.stopPropagation();
                             setShowPayload(!showPayload);
                             if (!expanded && !showPayload) setExpanded(true); // Expande si no lo estaba
                         }}
                     >
                         {showPayload ? 'Ocultar Raw Payload' : 'Inspeccionar Payload Crudo'}
                     </Button>
                 </div>
             </div>

             {/* BLOQUE DE PAYLOAD ENORME (ACÁ VERÁS LAS PLANTILLAS) */}
             {expanded && (
                 <div className="ml-7 mt-2 mb-4">
                     
                     {/* Tags del Step actual */}
                     {Object.keys(node.attributes).length > 0 && (
                         <div className="flex flex-wrap gap-1.5 mb-2">
                             {Object.entries(node.attributes).map(([k, v]) => (
                                 <span key={k} className="text-[9px] bg-active/30 text-secondary px-1.5 py-0.5 rounded border border-subtle">
                                     <span className="opacity-50 font-sans mr-1">{k}:</span>
                                     <span className="font-mono">{v as string}</span>
                                 </span>
                             ))}
                         </div>
                     )}

                     {showPayload && (
                         <div className="bg-black/50 border border-subtle/50 rounded-xl overflow-hidden mt-3 shadow-inner relative animate-in slide-in-from-top-2 duration-150">
                             <div className="flex justify-between items-center bg-surface border-b border-subtle/50 px-3 py-1.5">
                                 <span className="text-[9px] font-mono text-secondary uppercase tracking-widest font-bold">Runtime Input / Complete Context</span>
                                 <button onClick={copyRaw} className="text-[9px] bg-hover hover:bg-active text-secondary flex items-center gap-1 px-2 py-0.5 rounded transition">
                                     <Copy size={10} /> Copiar JSON
                                 </button>
                             </div>
                             <div className="p-4 overflow-auto max-h-[50vh]">
                                 <pre className="text-[11px] text-[#A6ACCD] font-mono leading-relaxed selection:bg-accent/40 block w-max">
                                     {typeof node.payloadEnorme === 'object' 
                                         ? JSON.stringify(node.payloadEnorme, null, 2)
                                         : String(node.payloadEnorme)
                                     }
                                 </pre>
                             </div>
                         </div>
                     )}
                     
                     {/* Recursividad de los Hijos (Siguientes pasos acoplados) */}
                     {node.children.length > 0 && (
                         <div className="mt-3 relative">
                             {node.children.map(child => <TraceWaterfallViewer key={child.spanId} node={child} defaultExpanded={expanded} />)}
                         </div>
                     )}
                 </div>
             )}
         </div>
     </div>
  )
}
