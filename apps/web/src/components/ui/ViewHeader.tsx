import { type ElementType, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { Button } from './Button';

export interface ViewHeaderProps {
  /** Lucide icon component */
  icon: ElementType;
  /** Main title */
  title: string;
  /** Optional count to show in parentheses */
  count?: number;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Label for the create button */
  createLabel?: string;
  /** Callback when the create button is clicked */
  onCreate?: () => void;
  /** Variant for the create button */
  createVariant?: 'primary' | 'secondary';
  /** Extra children to render in the title area */
  children?: ReactNode;
  /** Extra class for the container */
  className?: string;
}

/**
 * ViewHeader - Canonical header for all top-level views.
 * Ensures consistency across Assistants, Locations, Schedules, etc.
 */
export function ViewHeader({
  icon: Icon,
  title,
  count,
  subtitle,
  createLabel,
  onCreate,
  createVariant = 'primary',
  children,
  className,
}: ViewHeaderProps) {
  return (
    <div className={clsx("px-6 py-4 border-b border-subtle flex items-center justify-between", className)}>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-accent flex-shrink-0" />
          <h2 className="text-lg font-semibold text-primary truncate">{title}</h2>
          {count !== undefined && count >= 0 && (
            <span className="text-xs text-muted">({count})</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted mt-0.5 italic">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}
        {onCreate && (
          <Button size="sm" variant={createVariant} onClick={onCreate}>
            <Plus size={16} className="mr-1" />
            {createLabel || 'Crear'}
          </Button>
        )}
      </div>
    </div>
  );
}
