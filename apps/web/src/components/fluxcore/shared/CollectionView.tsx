/**
 * CollectionView — Single Source of Truth for FluxCore collection layouts.
 *
 * Every service tab (Instructions, Assistants, VectorStores, Tools, Agents)
 * renders its list through this component to guarantee visual consistency.
 *
 * Structure:
 *   Header  → icon + title + count + create button (slots)
 *   Content → LoadingState | EmptyState | Table
 *   Table   → columns (with responsive breakpoints) + sticky actions column
 *
 * The actions column is a render-prop slot so each service can inject its own
 * buttons (activate, share, download, etc.) while keeping consistent spacing,
 * opacity transitions, and the canonical DoubleConfirmationDeleteButton.
 */

import { type ReactNode, type ElementType } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../../ui';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

// ─── Column Definition ──────────────────────────────────────────────────────

export interface CollectionColumn<T> {
  /** Unique column id */
  id: string;
  /** Header text (rendered uppercase automatically) */
  header: string;
  /** Accessor — returns the cell content */
  accessor: (row: T) => ReactNode;
  /** Responsive breakpoint: hidden below this size */
  hideBelow?: 'md' | 'lg';
  /** Column min-width hint */
  width?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CollectionViewProps<T> {
  /** Lucide icon component for the header and empty state */
  icon: ElementType;
  /** Collection title shown in the header */
  title: string;
  /** Label for the create button */
  createLabel: string;
  /** Callback when the create button is clicked */
  onCreate: () => void;
  /** Data array */
  data: T[];
  /** Unique key extractor per row */
  getRowKey: (row: T) => string;
  /** Column definitions */
  columns: CollectionColumn<T>[];
  /** Whether data is loading */
  loading: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Empty-state description text */
  emptyDescription?: string;
  /**
   * Render-prop for the sticky actions column on each row.
   * Receives the row and should return action buttons.
   * Wrap individual buttons with onClick stopPropagation.
   */
  renderActions?: (row: T) => ReactNode;
  /**
   * Render-prop for mobile-only inline actions shown inside the name cell.
   * If omitted, no mobile actions are rendered.
   */
  renderMobileActions?: (row: T) => ReactNode;
  /** Extra class on the outermost wrapper */
  className?: string;
  /** Optional: override the create button variant */
  createVariant?: 'primary' | 'secondary';
}

// ─── Responsive class helpers ───────────────────────────────────────────────

const hideBelowClass = (bp?: 'md' | 'lg') => {
  if (bp === 'md') return 'hidden md:table-cell';
  if (bp === 'lg') return 'hidden lg:table-cell';
  return '';
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CollectionView<T>({
  icon: Icon,
  title,
  createLabel,
  onCreate,
  data,
  getRowKey,
  columns,
  loading,
  onRowClick,
  emptyDescription,
  renderActions,
  renderMobileActions,
  className,
  createVariant = 'primary',
}: CollectionViewProps<T>) {
  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading && data.length === 0) {
    return (
      <div className={clsx('h-full flex flex-col', className)}>
        <Header
          icon={Icon}
          title={title}
          count={0}
          createLabel={createLabel}
          onCreate={onCreate}
          createVariant={createVariant}
        />
        <div className="flex-1 overflow-auto p-6">
          <LoadingState message={`Cargando ${title.toLowerCase()}...`} />
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (!loading && data.length === 0) {
    return (
      <div className={clsx('h-full flex flex-col', className)}>
        <Header
          icon={Icon}
          title={title}
          count={0}
          createLabel={createLabel}
          onCreate={onCreate}
          createVariant={createVariant}
        />
        <div className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={<Icon size={48} />}
            title={`No hay ${title.toLowerCase()}`}
            description={emptyDescription || `Crea un elemento para comenzar`}
            actionLabel={createLabel}
            onAction={onCreate}
          />
        </div>
      </div>
    );
  }

  // ── Table ───────────────────────────────────────────────────────────────
  return (
    <div className={clsx('h-full flex flex-col', className)}>
      <Header
        icon={Icon}
        title={title}
        count={data.length}
        createLabel={createLabel}
        onCreate={onCreate}
        createVariant={createVariant}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-surface rounded-lg border border-subtle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-subtle">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-medium text-muted uppercase',
                      hideBelowClass(col.hideBelow),
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ))}
                {renderActions && (
                  <th className="px-4 py-3 sticky right-0 bg-surface" />
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const key = getRowKey(row);
                return (
                  <tr
                    key={key}
                    className={clsx(
                      'group border-b border-subtle last:border-b-0 hover:bg-hover transition-colors',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.id}
                        className={clsx(
                          'px-4 py-3',
                          hideBelowClass(col.hideBelow),
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">{col.accessor(row)}</div>
                          {/* Mobile actions — only inside the first column */}
                          {colIdx === 0 && renderMobileActions && (
                            <div className="flex items-center gap-1 md:hidden">
                              {renderMobileActions(row)}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                    {renderActions && (
                      <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {renderActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Header sub-component ───────────────────────────────────────────────────

interface HeaderProps {
  icon: ElementType;
  title: string;
  count: number;
  createLabel: string;
  onCreate: () => void;
  createVariant: 'primary' | 'secondary';
}

function Header({ icon: Icon, title, count, createLabel, onCreate, createVariant }: HeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-accent" />
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {count > 0 && (
          <span className="text-xs text-muted">({count})</span>
        )}
      </div>
      <Button size="sm" variant={createVariant} onClick={onCreate}>
        <Plus size={16} className="mr-1" />
        {createLabel}
      </Button>
    </div>
  );
}

// ─── Re-exports for convenience ─────────────────────────────────────────────

export { StatusBadge } from './StatusBadge';
export { EntityActions } from './EntityActions';

export default CollectionView;
