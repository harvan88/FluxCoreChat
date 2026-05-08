import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ActionItem {
  id: string;
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items: ActionItem[];
}

/**
 * ActionSheet - Contextual menu for mobile devices.
 * Slides from the bottom and provides large touch targets.
 */
export function ActionSheet({ isOpen, onClose, title, items }: ActionSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-overlay-dark/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl shadow-2xl border-t border-subtle animate-in slide-in-from-bottom duration-300">
        {/* Handle for aesthetic/affordance */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-subtle rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-subtle/50">
          <h3 className="text-base font-semibold text-primary">{title || 'Opciones'}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:bg-hover rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Items */}
        <div className="px-3 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={clsx(
                "w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all active:scale-[0.98] active:bg-hover",
                item.variant === 'danger' ? "text-error" : "text-primary hover:bg-hover"
              )}
            >
              {item.icon && <item.icon size={22} className={clsx(item.variant === 'danger' ? "text-error" : "text-accent")} />}
              <span className="text-base font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel Button (Extra safety) */}
        <div className="px-6 pb-8 pt-2">
          <button
            onClick={onClose}
            className="w-full py-4 bg-hover text-primary font-semibold rounded-xl transition-colors active:scale-[0.98]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
