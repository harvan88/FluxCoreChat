/**
 * COR-043: AISuggestionCard Component
 * 
 * Muestra sugerencias de IA en modo "supervised" para que el usuario
 * pueda aprobar, editar o descartar la respuesta sugerida.
 */

import { useState } from 'react';
import clsx from 'clsx';
import { 
  Check, 
  X, 
  Edit3, 
  Sparkles, 
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface AISuggestion {
  id: string;
  conversationId: string;
  extensionId: string;
  originalMessageId: string;
  suggestedText: string;
  confidence?: number;
  reasoning?: string;
  alternatives?: string[];
  createdAt: string;
  mode?: string;
}

type AutoState = {
  phase: 'waiting' | 'typing' | 'sending';
  etaSeconds?: number | null;
};

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApprove: (text: string) => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  autoState?: AutoState;
}

export function AISuggestionCard({
  suggestion,
  onApprove,
  onDiscard,
  onRegenerate,
  isLoading = false,
  autoState,
}: AISuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestion.suggestedText);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const isAutoLocked = Boolean(autoState);

  const autoBadge = (() => {
    if (!autoState) return null;
    switch (autoState.phase) {
      case 'waiting':
        return autoState.etaSeconds != null
          ? `Auto en ${autoState.etaSeconds}s`
          : 'Auto en cola';
      case 'typing':
        return autoState.etaSeconds != null
          ? `Fluxi redactando (${autoState.etaSeconds}s)`
          : 'Fluxi redactando';
      case 'sending':
        return 'Auto enviando...';
      default:
        return null;
    }
  })();

  const handleApprove = () => {
    onApprove(editedText);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(suggestion.suggestedText);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
  };

  const handleSelectAlternative = (alt: string) => {
    setEditedText(alt);
    setShowAlternatives(false);
  };

  // Sistema canónico de diseño
  if (isLoading) {
    return (
      <div className="mx-4 mb-4 bg-accent/10 border border-accent/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <Sparkles size={20} className="text-accent" />
          </div>
          <span className="text-accent text-sm">La IA está generando una respuesta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 bg-accent/10 border border-accent/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="text-accent text-sm font-medium">
            Sugerencia de IA
          </span>
          {suggestion.confidence !== undefined && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              {Math.round(suggestion.confidence * 100)}% confianza
            </span>
          )}
          {autoBadge && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
              {autoBadge}
            </span>
          )}
        </div>
        <span className="text-xs text-muted">
          {suggestion.extensionId === '@fluxcore/fluxcore' ? 'FluxCore' : suggestion.extensionId}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-elevated text-primary rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px]"
            autoFocus
          />
        ) : (
          <p className="text-primary text-sm whitespace-pre-wrap">{editedText}</p>
        )}

        {/* Reasoning toggle */}
        {suggestion.reasoning && (
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="mt-3 flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {showReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showReasoning ? 'Ocultar razonamiento' : 'Ver razonamiento'}
          </button>
        )}
        
        {showReasoning && suggestion.reasoning && (
          <div className="mt-2 p-3 bg-elevated rounded-lg text-xs text-muted italic">
            {suggestion.reasoning}
          </div>
        )}

        {/* Alternatives */}
        {suggestion.alternatives && suggestion.alternatives.length > 0 && (
          <>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="mt-3 flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {showAlternatives ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {suggestion.alternatives.length} alternativas
            </button>

            {showAlternatives && (
              <div className="mt-2 space-y-2">
                {suggestion.alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAlternative(alt)}
                    className="w-full text-left p-2 bg-elevated hover:bg-hover rounded-lg text-xs text-secondary transition-colors"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-elevated border-t border-accent/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-inverse text-sm rounded-lg transition-colors"
              >
                <Check size={14} />
                Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-hover hover:bg-active text-primary text-sm rounded-lg transition-colors"
              >
                <X size={14} />
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={isAutoLocked}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isAutoLocked
                    ? 'bg-success/40 text-inverse/60 cursor-not-allowed'
                    : 'bg-success hover:bg-success/90 text-inverse'
                )}
              >
                <Check size={14} />
                Enviar
              </button>
              <button
                onClick={() => {
                  if (isAutoLocked) return;
                  handleEdit();
                }}
                disabled={isAutoLocked}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isAutoLocked
                    ? 'bg-accent/40 text-inverse/60 cursor-not-allowed'
                    : 'bg-accent hover:bg-accent/90 text-inverse'
                )}
              >
                <Edit3 size={14} />
                Editar
              </button>
              <button
                onClick={() => {
                  if (isAutoLocked) return;
                  onDiscard();
                }}
                disabled={isAutoLocked}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isAutoLocked
                    ? 'bg-hover text-primary/60 cursor-not-allowed'
                    : 'bg-hover hover:bg-active text-primary'
                )}
              >
                <X size={14} />
                Descartar
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted hover:text-primary transition-colors"
            title="Copiar"
          >
            <Copy size={14} />
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 text-muted hover:text-accent transition-colors"
              title="Regenerar"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gestionar sugerencias de IA
 */
export function useAISuggestions(conversationId: string | null) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addSuggestion = (suggestion: AISuggestion) => {
    setSuggestions(prev => [...prev, suggestion]);
  };

  const removeSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions: suggestions.filter(s => s.conversationId === conversationId),
    isGenerating,
    setIsGenerating,
    addSuggestion,
    removeSuggestion,
    clearSuggestions,
  };
}
