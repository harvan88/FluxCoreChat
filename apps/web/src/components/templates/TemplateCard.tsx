/**
 * TemplateCard Component
 * 
 * Card individual para mostrar una plantilla en la lista.
 * Usa componentes UI base del sistema.
 */

import { memo } from 'react';
import { FileText, Copy, Clock, Hash, Pencil, Sparkles, Bug } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../ui/Badge';
import { DoubleConfirmationDeleteButton } from '../ui/DoubleConfirmationDeleteButton';
import type { Template } from './types';
import { TEMPLATE_CATEGORIES } from './types';
import { useAuthStore } from '../../store/authStore';

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
  const { user } = useAuthStore();
  const categoryLabel = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const copyTemplateData = async () => {
    try {
      const templateData = {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        tags: template.tags,
        category: template.category,
        isActive: template.isActive,
        allowAutomatedUse: template.allowAutomatedUse,
        authorizeForAI: template.authorizeForAI,
        aiUsageInstructions: template.aiUsageInstructions,
        usageCount: template.usageCount,
        assets: template.assets,
        accountId: template.accountId,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
      
      await navigator.clipboard.writeText(JSON.stringify(templateData, null, 2));
      console.log('Template data copied to clipboard successfully');
      console.log('Copied data:', templateData);
    } catch (err) {
      console.error('Failed to copy template data:', err);
      
      // Fallback: create textarea and copy manually
      try {
        const templateData = {
          id: template.id,
          name: template.name,
          content: template.content,
          variables: template.variables,
          tags: template.tags,
          category: template.category,
          isActive: template.isActive,
          allowAutomatedUse: template.allowAutomatedUse,
          authorizeForAI: template.authorizeForAI,
          aiUsageInstructions: template.aiUsageInstructions,
          usageCount: template.usageCount,
          assets: template.assets,
          accountId: template.accountId,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        };
        
        const textarea = document.createElement('textarea');
        textarea.value = JSON.stringify(templateData, null, 2);
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        console.log('Template data copied to clipboard (fallback method)');
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  return (
    <tr
      onClick={onSelect}
      onDoubleClick={onEdit}
      className={clsx(
        'group border-b border-subtle hover:bg-hover cursor-pointer transition-colors',
        isSelected && 'bg-accent/5'
      )}
    >
      {/* Nombre */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'p-1.5 rounded-md flex-shrink-0',
            template.isActive ? 'bg-accent/10 text-accent' : 'bg-muted/10 text-muted'
          )}>
            <FileText size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {template.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              )}
              <span className="font-medium text-sm text-primary truncate">
                {template.name}
              </span>
              <div
                className={clsx(
                  "flex-shrink-0 ml-1 transition-colors",
                  template.authorizeForAI ? "text-accent" : "text-muted/20"
                )}
                title={template.authorizeForAI ? "Autorizada para uso por IA" : "No autorizada para IA"}
              >
                <Sparkles size={14} />
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* Contenido (Preview) */}
      <td className="px-4 py-3 hidden md:table-cell max-w-xs lg:max-w-md">
        <p className="text-xs text-secondary truncate">
          {template.content.replace(/\n/g, ' ')}
        </p>
      </td>

      {/* Categoría */}
      <td className="px-4 py-3">
        {categoryLabel && (
          <Badge variant="neutral" size="sm" className="whitespace-nowrap">
            {categoryLabel}
          </Badge>
        )}
      </td>

      {/* Detalles (Vars & Tags) */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          {template.variables.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted" title={`${template.variables.length} variables`}>
              <Hash size={12} />
              {template.variables.length}
            </span>
          )}
          {template.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] text-muted border border-subtle px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {template.tags.length > 2 && <span className="text-[10px] text-muted">+{template.tags.length - 2}</span>}
        </div>
      </td>

      {/* Actualizada */}
      <td className="px-4 py-3 text-secondary text-xs hidden sm:table-cell whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-muted" />
          {formatDate(template.updatedAt)}
        </div>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 text-right sticky right-0 bg-surface group-hover:bg-hover">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-muted hover:text-primary rounded hover:bg-elevated transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
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
          {(import.meta.env.DEV || user?.email === 'harvan@hotmail.es') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyTemplateData();
              }}
              className="p-1 text-muted hover:text-primary rounded hover:bg-elevated transition-colors"
              title="Copiar datos como JSON (debug)"
            >
              <Bug size={14} />
            </button>
          )}
          <DoubleConfirmationDeleteButton
            onConfirm={onDelete}
            size={14}
          />
        </div>
      </td>
    </tr>
  );
}

export const TemplateCard = memo(TemplateCardComponent);
