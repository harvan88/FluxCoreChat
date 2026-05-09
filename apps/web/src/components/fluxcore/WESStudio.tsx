
import { useState, useEffect } from 'react';
import { 
    Database, 
    Save, 
    Play, 
    Wand2, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight,
    Terminal as TerminalIcon,
    Code2,
    Copy,
    Check
} from 'lucide-react';
import { api } from '../../services/api';
import clsx from 'clsx';

export function WESStudio({ accountId, definitionId }: { accountId: string, definitionId?: string }) {
    const [definitions, setDefinitions] = useState<any[]>([]);
    const [selectedDef, setSelectedDef] = useState<any>(null);
    const [jsonContent, setJsonContent] = useState('');
    const [simulationText, setSimulationText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        loadDefinitions(definitionId);
    }, [accountId, definitionId]);

    const loadDefinitions = async (autoSelectId?: string) => {
        const resp = await api.getDefinitions(accountId);
        if (resp.success) {
            const defs = resp.data || [];
            setDefinitions(defs);
            
            if (autoSelectId) {
                const auto = defs.find(d => d.id === autoSelectId);
                if (auto) handleSelect(auto);
            }
        }
    };

    const handleSelect = (def: any) => {
        setSelectedDef(def);
        setJsonContent(JSON.stringify(def.definitionJson, null, 2));
    };

    const [copiedAll, setCopiedAll] = useState(false);

    const handleCopyAll = () => {
        const json = JSON.stringify(definitions, null, 2);
        navigator.clipboard.writeText(json);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const handleSave = async () => {
        if (!selectedDef) return;
        setIsSaving(true);
        try {
            const parsed = JSON.parse(jsonContent);
            const resp = await api.updateDefinition(selectedDef.id, accountId, parsed);
            if (resp.success) {
                setStatus({ type: 'success', message: 'Definición actualizada correctamente' });
                loadDefinitions();
            } else {
                setStatus({ type: 'error', message: resp.error || 'Error al guardar' });
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'JSON Inválido' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    return (
        <div className="flex h-full bg-surface overflow-hidden border border-default rounded-xl shadow-2xl animate-in fade-in duration-500">
            {/* Sidebar: Lista de Trabajos */}
            <div className="w-64 border-r border-default bg-elevated/30 flex flex-col">
                <div className="p-4 border-b border-default flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Morfologías</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopyAll}
                            className="p-1 hover:bg-hover rounded text-secondary transition-all"
                            title="Copiar todas al portapapeles"
                        >
                            {copiedAll ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                        <Database size={14} className="text-accent" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {definitions.map(def => (
                        <button
                            key={def.id}
                            onClick={() => handleSelect(def)}
                            className={clsx(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group",
                                selectedDef?.id === def.id ? "bg-accent text-inverse shadow-md" : "hover:bg-hover text-primary"
                            )}
                        >
                            <span className="truncate">{def.name || def.typeId || def.id}</span>
                            <ChevronRight size={14} className={clsx(selectedDef?.id === def.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col">
                {selectedDef ? (
                    <>
                        <div className="p-4 border-b border-default flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-primary">{selectedDef.name || selectedDef.typeId}</h2>
                                <p className="text-[10px] text-secondary font-mono">ID: {selectedDef.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-accent text-inverse rounded-full text-xs font-bold hover:bg-accent-hover transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                                >
                                    {isSaving ? <span className="animate-pulse">Guardando...</span> : <><Save size={14} /> Guardar</>}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* JSON Editor area */}
                            <div className="flex-1 p-4 flex flex-col">
                                <div className="flex items-center gap-2 mb-2 text-[11px] font-bold text-secondary uppercase tracking-tighter">
                                    <Code2 size={12} /> definition_json
                                </div>
                                <textarea
                                    value={jsonContent}
                                    onChange={(e) => setJsonContent(e.target.value)}
                                    className="flex-1 bg-black/90 text-accent-light font-mono text-xs p-6 rounded-2xl border border-default resize-none focus:outline-none focus:border-accent selection:bg-accent/30 shadow-inner"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Testing & AI Side Panel */}
                            <div className="w-80 border-l border-default bg-elevated/10 p-4 flex flex-col gap-4">
                                {/* AI Tuning Section */}
                                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-accent">
                                        <Wand2 size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Auto-Tuning Expert</span>
                                    </div>
                                    <p className="text-[10px] text-secondary leading-relaxed">
                                        Analiza fallos de extracción y propone ajustes en las descripciones de los slots automáticamente.
                                    </p>
                                    <button className="w-full py-2 bg-accent/10 border border-accent/20 text-accent rounded-xl text-[10px] font-bold hover:bg-accent/20 transition-all uppercase tracking-widest">
                                        Detectar Errores Recientes
                                    </button>
                                </div>

                                {/* Sandbox Section */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 mb-2 text-[11px] font-bold text-secondary uppercase tracking-tighter">
                                        <TerminalIcon size={12} /> Sandbox de Simulación
                                    </div>
                                    <textarea 
                                        placeholder="Pega un texto para probar la extracción..."
                                        value={simulationText}
                                        onChange={(e) => setSimulationText(e.target.value)}
                                        className="w-full h-32 bg-surface border border-default rounded-xl p-3 text-xs focus:outline-none focus:border-accent"
                                    />
                                    <button className="mt-2 w-full py-2 bg-primary text-inverse rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                        <Play size={14} /> Simular Extracción
                                    </button>

                                    {/* Mini Results Log */}
                                    <div className="mt-4 flex-1 bg-black/5 border border-default rounded-xl p-3 font-mono text-[10px] text-secondary overflow-y-auto">
                                        <div className="text-accent/60 opacity-50 italic">// Resultados de simulación...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-secondary opacity-50 animate-pulse">
                        <Database size={48} strokeWidth={1} />
                        <p className="mt-4 text-sm font-medium italic">Selecciona una morfología para operar</p>
                    </div>
                )}
            </div>

            {/* Status Notifications */}
            {status && (
                <div className={clsx(
                    "fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 z-50",
                    status.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}>
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-bold">{status.message}</span>
                </div>
            )}
        </div>
    );
}
