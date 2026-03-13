import { useState } from 'react';
import { MoreVertical, Copy, Check, KeyRound } from 'lucide-react';
import { useClipboard } from '../../hooks/fluxcore';
import { DoubleConfirmationDeleteButton } from '../ui/DoubleConfirmationDeleteButton';

interface ChatOptionsMenuProps {
  conversationId: string;
  onLeave?: () => void;
  className?: string;
}

/**
 * ChatOptionsMenu - Menú de opciones del chat con botón de copiar ID
 * Alineado a la derecha del header del chat
 */
export function ChatOptionsMenu({ conversationId, onLeave, className = '' }: ChatOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { copy, isCopied } = useClipboard({ duration: 2000 });

  const handleCopyId = async () => {
    await copy(conversationId);
    // Cerrar menú después de copiar
    setTimeout(() => setIsOpen(false), 500);
  };

  const handleLeave = () => {
    setIsOpen(false);
    onLeave?.();
  };

  // Truncar ID para mostrar solo primeros 8 caracteres + "..."
  const truncatedId = conversationId.length > 8 
    ? `${conversationId.slice(0, 8)}...` 
    : conversationId;

  return (
    <div className={`relative ${className}`}>
      {/* Botón trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
        title="Opciones del chat"
      >
        <MoreVertical size={20} />
      </button>

      {/* Menu desplegable */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu compacto */}
          <div className="absolute right-0 top-full mt-1 bg-surface border border-subtle rounded-lg shadow-lg z-20 flex flex-col min-w-[140px] overflow-hidden">
            <button
              onClick={handleCopyId}
              className="flex items-center justify-between px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors whitespace-nowrap border-b border-subtle"
            >
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-muted" />
                <span className="font-mono text-xs">{truncatedId}</span>
              </div>
              {isCopied ? (
                <Check size={14} className="text-accent ml-2" />
              ) : (
                <Copy size={14} className="ml-2" />
              )}
            </button>
            
            {onLeave && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors whitespace-nowrap">
                <span>Vaciar chat</span>
                <DoubleConfirmationDeleteButton 
                  onConfirm={handleLeave}
                  size={14}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ChatOptionsMenu;
