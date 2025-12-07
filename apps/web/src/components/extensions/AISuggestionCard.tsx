/**
 * COR-043: AISuggestionCard Component
 * 
 * Muestra sugerencias de IA en modo "supervised" para que el usuario
 * pueda aprobar, editar o descartar la respuesta sugerida.
 */

import { useState } from 'react';
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
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApprove: (text: string) => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function AISuggestionCard({
  suggestion,
  onApprove,
  onDiscard,
  onRegenerate,
  isLoading = false,
}: AISuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestion.suggestedText);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

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

  if (isLoading) {
    return (
      <div className="mx-4 mb-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <span className="text-purple-300 text-sm">La IA está generando una respuesta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">
            Sugerencia de IA
          </span>
          {suggestion.confidence !== undefined && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {Math.round(suggestion.confidence * 100)}% confianza
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {suggestion.extensionId === 'core-ai' ? 'FluxCore AI' : suggestion.extensionId}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-gray-800/50 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
            autoFocus
          />
        ) : (
          <p className="text-white text-sm whitespace-pre-wrap">{editedText}</p>
        )}

        {/* Reasoning toggle */}
        {suggestion.reasoning && (
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showReasoning ? 'Ocultar razonamiento' : 'Ver razonamiento'}
          </button>
        )}
        
        {showReasoning && suggestion.reasoning && (
          <div className="mt-2 p-3 bg-gray-800/30 rounded-lg text-xs text-gray-400 italic">
            {suggestion.reasoning}
          </div>
        )}

        {/* Alternatives */}
        {suggestion.alternatives && suggestion.alternatives.length > 0 && (
          <>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                    className="w-full text-left p-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-xs text-gray-300 transition-colors"
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
      <div className="px-4 py-3 bg-gray-800/30 border-t border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Check size={14} />
                Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                <X size={14} />
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                <Check size={14} />
                Enviar
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <Edit3 size={14} />
                Editar
              </button>
              <button
                onClick={onDiscard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
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
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            title="Copiar"
          >
            <Copy size={14} />
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 text-gray-400 hover:text-purple-400 transition-colors"
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
