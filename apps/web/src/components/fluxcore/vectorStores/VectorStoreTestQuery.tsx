import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface VectorStoreTestQueryProps {
  vectorStoreId: string;
  accountId: string;
}

interface RAGTestResult {
  context: string;
  sources: Array<{
    content: string;
    source: string;
    similarity: number;
  }>;
  totalTokens: number;
  chunksUsed: number;
}

export function VectorStoreTestQuery({ vectorStoreId, accountId }: VectorStoreTestQueryProps) {
  const { token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RAGTestResult | null>(null);

  const handleRunTest = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !token) {
      setError('Ingresá una consulta para probar la base.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/fluxcore/runtime/rag-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          query: trimmedQuery,
          vectorStoreIds: [vectorStoreId],
          options: {
            topK: 5,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'No se pudo ejecutar la consulta.');
      }

      setResult(data.data as RAGTestResult);
    } catch (err: any) {
      setError(err?.message || 'Error al ejecutar la consulta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted tracking-wide">Prueba de recuperación</p>
          <p className="text-sm text-secondary">
            Ejecutá una pregunta de diagnóstico para comprobar que los embeddings cubren el tema.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-input border border-subtle rounded-lg px-3 py-2 text-sm text-primary min-h-[90px]"
          placeholder="Ej: ¿Cuál es el tratamiento para cucaracha alemana?"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunTest}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-inverse text-sm font-medium hover:bg-accent/90 disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Probar recuperación
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="border border-subtle rounded-lg bg-elevated/50 p-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>Fragmentos usados: <strong className="text-primary">{result.chunksUsed}</strong></span>
            <span>Tokens: <strong className="text-primary">{result.totalTokens}</strong></span>
          </div>

          {result.sources.length === 0 ? (
            <p className="text-sm text-secondary">
              No se encontraron fragmentos relevantes para esta consulta. Revisá los archivos o el mínimo de similitud.
            </p>
          ) : (
            <div className="space-y-2">
              {result.sources.map((source, index) => (
                <div key={`${source.source}-${index}`} className="p-3 rounded border border-subtle bg-surface text-sm">
                  <div className="flex items-center justify-between gap-3 mb-2 text-xs text-muted">
                    <span className="font-medium text-primary truncate">{source.source}</span>
                    <span>Similitud: {(source.similarity * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-secondary whitespace-pre-wrap">{source.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
