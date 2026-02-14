import { useState } from 'react';
import { useWorks } from '../../../hooks/fluxcore';
import { FluxiList } from './FluxiList';
import { useUIStore } from '../../../store/uiStore';

interface FluxiViewProps {
    accountId: string;
    onOpenTab?: (id: string, title: string, data: any) => void;
}

export function FluxiView({ accountId, onOpenTab }: FluxiViewProps) {
    const { proposed, active, history, loading } = useWorks(accountId);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const pushToast = useUIStore((state) => state.pushToast);

    const handleCreate = () => {
        pushToast({
            type: 'info',
            title: 'Próximamente',
            description: "La creación manual de trabajos estará disponible en la próxima versión."
        });
    };

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Tabs */}
            <div className="flex border-b border-subtle bg-surface px-6 pt-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-primary hover:border-subtle'
                        }`}
                >
                    Activos y Propuestas ({active.length + proposed.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-primary hover:border-subtle'
                        }`}
                >
                    Historial ({history.length})
                </button>
            </div>

            {/* Content using FluxiList (Standard CollectionView) */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'active' ? (
                    <div className="h-full flex flex-col gap-4 p-4">
                        {/* Propuestas */}
                        {proposed.length > 0 && (
                            <div className="flex-shrink-0 max-h-[40%] flex flex-col border border-subtle rounded-lg overflow-hidden">
                                <FluxiList
                                    works={proposed}
                                    loading={loading}
                                    onSelect={(item) => onOpenTab && onOpenTab(item.id, `Propuesta ${item.id.slice(0, 6)}`, { ...item, type: 'proposed', proposedWorkId: item.id })}
                                    onCreate={handleCreate}
                                    title="Propuestas Pendientes"
                                    type="proposed"
                                    description="No hay propuestas pendientes de aprobación."
                                />
                            </div>
                        )}

                        {/* Activos */}
                        <div className="flex-1 min-h-0 border border-subtle rounded-lg overflow-hidden">
                            <FluxiList
                                works={active}
                                loading={loading}
                                onSelect={(item) => onOpenTab && onOpenTab(item.id, `Trabajo ${item.id.slice(0, 6)}`, { ...item, type: 'work', workId: item.id })}
                                onCreate={handleCreate}
                                title="Trabajos Activos"
                                type="active"
                                description="No hay trabajos en ejecución actualmente."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full p-4">
                        <div className="h-full border border-subtle rounded-lg overflow-hidden">
                            <FluxiList
                                works={history}
                                loading={loading}
                                onSelect={(item) => onOpenTab && onOpenTab(item.id, `Trabajo ${item.id.slice(0, 6)}`, { ...item, type: 'work', workId: item.id })}
                                title="Historial Completo"
                                type="history"
                                description="No hay historial de trabajos recientes."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
