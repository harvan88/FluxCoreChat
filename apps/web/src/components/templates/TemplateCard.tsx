/**
 * TemplateCard Component
 * 
 * Card individual para mostrar una plantilla en la lista.
 * Usa componentes UI base del sistema.
 */

import { memo } from 'react';
import { FileText, Copy, Clock, Hash } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../ui/Badge';
import { DoubleConfirmationDeleteButton } from '../ui/DoubleConfirmationDeleteButton';
import type { Template } from './types';
import { TEMPLATE_CATEGORIES } from './types';

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function TemplateCardComponent({
  template,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateCardProps) {
  const categoryLabel = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onEdit}
      className={clsx(
        'group relative p-3 rounded-lg border transition-all cursor-pointer',
        'hover:bg-hover',
        isSelected 
          ? 'border-accent bg-accent/5' 
          : 'border-subtle bg-surface'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={clsx(
            'p-1.5 rounded-md',
            template.isActive ? 'bg-accent/10 text-accent' : 'bg-muted/10 text-muted'
          )}>
            <FileText size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-primary truncate">
              {template.name}
            </h4>
          </div>
        </div>
        
        {/* Actions - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-muted hover:text-primary rounded hover:bg-elevated transition-colors"
            title="Duplicar"
          >
            <Copy size={14} />
          </button>
          <DoubleConfirmationDeleteButton
            onConfirm={onDelete}
            size={14}
          />
        </div>
      </div>
      
      {/* Content preview */}
      <p className="text-xs text-secondary line-clamp-2 mb-2">
        {template.content}
      </p>
      
      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {categoryLabel && (
            <Badge variant="neutral" size="sm">
              {categoryLabel}
            </Badge>
          )}
          {!template.isActive && (
            <Badge variant="warning" size="sm">
              Inactiva
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted">
          {template.variables.length > 0 && (
            <span className="flex items-center gap-1" title={`${template.variables.length} variables`}>
              <Hash size={12} />
              {template.variables.length}
            </span>
          )}
          <span className="flex items-center gap-1" title={`Actualizada: ${formatDate(template.updatedAt)}`}>
            <Clock size={12} />
            {formatDate(template.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const TemplateCard = memo(TemplateCardComponent);
