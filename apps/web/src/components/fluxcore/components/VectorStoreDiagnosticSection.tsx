/**
 * VectorStoreDiagnosticSection
 * 
 * Sección para probar el retrieval de un Vector Store.
 * Permite realizar búsquedas semánticas y ver qué fragmentos se recuperan.
 */

import { useState } from 'react';
import { Bug, Search, Loader2, File } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { useAuthStore } from '../../../store/authStore';

interface SearchResult {
    fileId: string;
    filename: string;
    score: number;
    attributes: Record<string, any>;
    content: Array<{ type: 'text'; text: string }>;
}

interface VectorStoreDiagnosticSectionProps {
    vectorStoreId: string;
    accountId: string;
}

export function VectorStoreDiagnosticSection({ vectorStoreId, accountId }: VectorStoreDiagnosticSectionProps) {
    const { token } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vectorStoreId || !searchQuery.trim() || !token) return;

        try {
            setIsSearching(true);
            setSearchResults(null);
            setError(null);

            const response = await fetch(`/api/fluxcore/vector-stores/${vectorStoreId}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountId,
                    query: searchQuery,
                    maxNumResults: 5,
                    rankingOptions: { ranker: 'auto', scoreThreshold: 0.0 },
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error en la búsqueda');
            }

            setSearchResults(data.data.results);
        } catch (err: any) {
            console.error('Error searching:', err);
            setError(err.message || 'Error desconocido');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <CollapsibleSection
            title="Diagnóstico de Recuperación"
            icon={<Bug size={16} className="text-orange-400" />}
            defaultExpanded={false}
        >
            <div className="space-y-6 py-2">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Escribe una pregunta para probar el retrieval..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-subtle rounded-md text-sm focus:ring-1 focus:ring-accent focus:border-accent outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-2 bg-secondary text-primary-inverse rounded-md text-sm font-medium hover:bg-secondary/90 disabled:opacity-50 min-w-[80px]"
                    >
                        {isSearching ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Probar'}
                    </button>
                    {(searchResults || searchQuery) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults(null);
                                setError(null);
                            }}
                            className="px-4 py-2 bg-elevated border border-subtle text-secondary rounded-md text-sm font-medium hover:bg-hover transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </form>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {searchResults === null ? (
                        <div className="text-center text-muted text-xs py-4">
                            Realiza una búsqueda para probar la recuperación de contexto
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="text-center text-muted text-sm py-4">
                            No se encontraron coincidencias para esta consulta.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {searchResults.map((result, idx) => (
                                <div key={idx} className="p-4 bg-background border border-subtle rounded-lg hover:border-accent/30 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10">
                                            {(result.score * 100).toFixed(1)}% Relevancia
                                        </span>
                                        <span className="text-xs text-muted flex items-center gap-1">
                                            <File size={10} />
                                            {result.filename}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary leading-relaxed bg-elevated/50 p-2 rounded border border-subtle/50 font-mono text-[11px] whitespace-pre-wrap">
                                        {result.content[0]?.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleSection>
    );
}

export default VectorStoreDiagnosticSection;
