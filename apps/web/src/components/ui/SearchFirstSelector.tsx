import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import { SidebarItem } from './SidebarLayout';

/**
 * 1. SearchFirstOverlay: La "Cáscara" pura.
 * Maneja el posicionamiento, el fondo y la animación.
 */
export function SearchFirstOverlay({ 
  isOpen, 
  onClose, 
  children,
  className = ""
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`absolute inset-0 z-[100] bg-surface w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`}>
      {children}
    </div>
  );
}

/**
 * 2. SearchFirstHeader: El área de búsqueda estandarizada.
 */
export function SearchFirstHeader({
  value,
  onChange,
  onClose,
  placeholder = "Buscar..."
}: {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  placeholder?: string;
}) {
  return (
    <div className="p-6 pb-2">
      <div className="relative">
        <Input
          autoFocus
          variant="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11"
          rightIcon={
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-hover rounded-full text-muted hover:text-primary transition-colors"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          }
        />
      </div>
    </div>
  );
}

/**
 * 3. SearchFirstSelector: El componente de alto nivel (Convenience Component).
 * Usa las piezas atómicas para selecciones simples.
 */
export interface Option {
  value: string;
  label: string;
  secondaryLabel?: string;
  icon?: any;
}

interface SearchFirstSelectorProps {
  label?: string;
  value?: string;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  renderValue?: (value: string) => string;
}

export function SearchFirstSelector({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
  className,
  renderValue,
}: SearchFirstSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.secondaryLabel?.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = renderValue ? renderValue(value || '') : (selectedOption?.label || value || '');

  const handleSelect = (val: string) => {
    onSelect(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-primary mb-2 block">{label}</label>}
      
      <div className="relative">
        <Input
          readOnly
          value={displayValue}
          placeholder={placeholder}
          onClick={() => setIsOpen(true)}
          className="cursor-pointer"
          rightIcon={<Search size={16} className="text-muted" />}
        />
      </div>

      <SearchFirstOverlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <SearchFirstHeader 
          value={searchQuery} 
          onChange={setSearchQuery} 
          onClose={() => setIsOpen(false)} 
          placeholder={searchPlaceholder}
        />
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <SidebarItem
                  key={opt.value || i}
                  icon={opt.icon ? (typeof opt.icon === 'function' ? <opt.icon size={18} /> : opt.icon) : undefined}
                  label={opt.label}
                  secondaryLabel={opt.secondaryLabel}
                  active={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  className="rounded-xl mx-0"
                />
              ))
            ) : (
              <div className="py-10 text-center text-muted text-sm italic">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </SearchFirstOverlay>
    </div>
  );
}
